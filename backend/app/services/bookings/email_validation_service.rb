
module Bookings
  class EmailValidationService
    Result = Struct.new(:success?, :classification, :status, :error, :is_disposable, keyword_init: true) do
      def valid?
        # STRICT: Only Deliverable is valid.
        # Everything else (Risky, Unknown, Undeliverable, timeout) is INVALID.
        classification == "Deliverable"
      end

      def safe?
        valid?
      end

      def message
        case classification
        when "Deliverable" then "Email is valid"
        when "Undeliverable" then "Email does not exist. Please change the Email"
        when "Risky" then "Email is identified as high-risk"
        when "Unknown" then "Could not verify email status"
        when "timeout" then "Verification timed out"
        when "disposable" then "Disposable emails are not allowed"
        when "invalid_format" then "Invalid email format"
        when "credits_exhausted" then "No credits remaining. Please upgrade your plan"
        else "Email verification failed"
        end
      end
    end

    def initialize(email:, host:)
      @email = email
      @host = host
    end

    def call
      # Basic format check first (always required)
      unless basic_format_valid?
        return fail_closed_result("invalid_format")
      end

      # Check user preference first
      unless @host&.email_verification_enabled?
        return skip_result
      end

      # Check if user has access to this feature
      unless @host&.pro_plan?
        return skip_result
      end

      if @host.plan_expired?
        return skip_result
      end

      if @host.credits_exhausted?
        Notifications::PlanNotificationService.notify_usage_exhausted_block(@host)
        return fail_closed_result("credits_exhausted")
      end

      # For Pro users, enforce Verifalia
      unless verifalia_configured?
        return Rails.env.production? ? fail_closed_result("Configuration Error") : skip_result
      end

      validate_email
    rescue Net::OpenTimeout, Net::ReadTimeout, Timeout::Error
      Rails.logger.warn("[Bookings::EmailValidationService] Timeout validating #{@email}")
      fail_closed_result("timeout")
    rescue StandardError => e
      Rails.logger.error("[Bookings::EmailValidationService] #{e.class}: #{e.message}")
      fail_closed_result("error")
    end

    private

    def validate_email
      client = Verifalia::Client.new(
        username: ENV["VERIFALIA_USERNAME"],
        password: ENV["VERIFALIA_PASSWORD"]
      )

      # We use a short timeout for UX reasons (3 seconds for instant feedback)
      Timeout.timeout(4) do
        job = client.email_validations.submit(
          @email,
          quality: "Standard",
          retention: "0:5:0"
        )

        entry = job.entries[0]

        # Requirement 3: Increment used_credits atomically
        @host.increment_used_credits!

        # Check for disposable
        is_disposable = entry.respond_to?(:is_disposable) && entry.is_disposable

        Result.new(
          success?: true,
          classification: is_disposable ? "disposable" : entry.classification.to_s,
          status: entry.status.to_s,
          is_disposable: is_disposable
        )
      end
    end

    def skip_result
      Result.new(success?: true, classification: "Deliverable", status: "skipped")
    end

    def fail_closed_result(reason)
      Result.new(success?: false, classification: reason, status: "failed")
    end

    def basic_format_valid?
      @email.present? && @email.match?(URI::MailTo::EMAIL_REGEXP)
    end

    def verifalia_configured?
      ENV["VERIFALIA_USERNAME"].present? && ENV["VERIFALIA_PASSWORD"].present?
    end
  end
end
