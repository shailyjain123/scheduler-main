require "digest"

module Bookings
  class AntiAbuseService < BaseBookingService
    EMAIL_LIMIT_PER_DAY = ENV.fetch("BOOKING_EMAIL_LIMIT_PER_DAY", "3").to_i
    IP_LIMIT_PER_HOUR = ENV.fetch("BOOKING_IP_LIMIT_PER_HOUR", "5").to_i
    FINGERPRINT_LIMIT_PER_HOUR = ENV.fetch("BOOKING_FINGERPRINT_LIMIT_PER_HOUR", "4").to_i
    NAME_VARIANT_LIMIT_PER_HOUR = ENV.fetch("BOOKING_NAME_VARIANT_LIMIT_PER_HOUR", "3").to_i

    def call
      guest_name = normalize_guest_name
      guest_email = normalize_guest_email
      client_ip = normalize_client_ip
      client_fingerprint = normalize_client_fingerprint

      risk_flags = []
      risk_score = 0

      email_attempts = recent_email_attempts(guest_email) + 1
      ip_attempts = recent_ip_attempts(client_ip) + 1
      fingerprint_attempts = recent_fingerprint_attempts(client_fingerprint) + 1

      if email_attempts > EMAIL_LIMIT_PER_DAY
        return block!(
          rule: "email_rate_limit",
          message: "Too many booking attempts were made from this email address. Please try again later.",
          severity: "block",
          risk_flags: risk_flags,
          risk_score: risk_score + 50,
          guest_name: guest_name,
          guest_email: guest_email,
          client_ip: client_ip,
          client_fingerprint: client_fingerprint,
          metadata: { limit: EMAIL_LIMIT_PER_DAY, attempts: email_attempts, window: "1 day" }
        )
      end

      if ip_attempts > IP_LIMIT_PER_HOUR
        return block!(
          rule: "ip_rate_limit",
          message: "Too many booking attempts were made from this network. Please wait and try again.",
          severity: "block",
          risk_flags: risk_flags,
          risk_score: risk_score + 60,
          guest_name: guest_name,
          guest_email: guest_email,
          client_ip: client_ip,
          client_fingerprint: client_fingerprint,
          metadata: { limit: IP_LIMIT_PER_HOUR, attempts: ip_attempts, window: "1 hour" }
        )
      end

      if fingerprint_attempts > FINGERPRINT_LIMIT_PER_HOUR
        return block!(
          rule: "session_rate_limit",
          message: "This browser has made too many booking attempts. Please wait and try again.",
          severity: "block",
          risk_flags: risk_flags,
          risk_score: risk_score + 60,
          guest_name: guest_name,
          guest_email: guest_email,
          client_ip: client_ip,
          client_fingerprint: client_fingerprint,
          metadata: { limit: FINGERPRINT_LIMIT_PER_HOUR, attempts: fingerprint_attempts, window: "1 hour" }
        )
      end

      suspicious_name_emails = PublicBookingRequest
        .where(user_id: host.id)
        .where("created_at >= ?", 1.hour.ago)
        .where("LOWER(guest_name) = ?", guest_name.downcase)
        .where.not("LOWER(guest_email) = ?", guest_email.downcase)
        .distinct
        .count(:guest_email)

      if suspicious_name_emails >= NAME_VARIANT_LIMIT_PER_HOUR
        return block!(
          rule: "duplicate_name_pattern",
          message: "We could not process this booking request. Please contact the host if you believe this is an error.",
          severity: "alert",
          risk_flags: risk_flags + [ "duplicate_name_pattern" ],
          risk_score: risk_score + 40,
          guest_name: guest_name,
          guest_email: guest_email,
          client_ip: client_ip,
          client_fingerprint: client_fingerprint,
          metadata: { attempts: suspicious_name_emails, window: "1 hour" }
        )
      end

      if disposable_email?(guest_email)
        return block!(
          rule: "disposable_email",
          message: "Temporary email addresses are not allowed.",
          severity: "block",
          risk_flags: risk_flags + [ "disposable_email" ],
          risk_score: risk_score + 100,
          guest_name: guest_name,
          guest_email: guest_email,
          client_ip: client_ip,
          client_fingerprint: client_fingerprint,
          metadata: { domain: guest_email.split("@").last.to_s.downcase }
        )
      end

      Result.new(
        success?: true,
        data: {
          risk_score: risk_score,
          risk_flags: risk_flags,
          guest_name: guest_name,
          guest_email: guest_email,
          client_ip: client_ip,
          client_fingerprint: client_fingerprint
        }
      )
    end

    private

    def normalize_client_ip
      params[:client_ip].to_s.strip.presence || "unknown"
    end

    def normalize_client_fingerprint
      params[:client_fingerprint].to_s.strip.presence || digest_for([ normalize_client_ip, params[:user_agent].to_s, params[:session_id].to_s ].join("|"))
    end

    def digest_for(value)
      Digest::SHA256.hexdigest(value.to_s)
    end

    def recent_email_attempts(guest_email)
      PublicBookingRequest
        .where(user_id: host.id)
        .for_email(guest_email)
        .where("created_at >= ?", 1.day.ago)
        .count
    end

    def recent_ip_attempts(client_ip)
      PublicBookingRequest
        .where(user_id: host.id)
        .for_client_ip(client_ip)
        .where("created_at >= ?", 1.hour.ago)
        .count
    end

    def recent_fingerprint_attempts(client_fingerprint)
      PublicBookingRequest
        .where(user_id: host.id)
        .for_client_fingerprint(client_fingerprint)
        .where("created_at >= ?", 1.hour.ago)
        .count
    end

    def block!(rule:, message:, severity:, risk_flags:, risk_score:, guest_name:, guest_email:, client_ip:, client_fingerprint:, metadata: {})
      BookingAbuseLog.record!(
        user: host,
        event_type: event_type,
        guest_name: guest_name.presence,
        guest_email: guest_email.presence,
        client_ip: client_ip,
        fingerprint: client_fingerprint.presence,
        rule_violated: rule,
        severity: severity,
        blocked: true,
        metadata: metadata
      )

      Result.new(
        success?: false,
        errors: [ message ],
        details: {
          rule: rule,
          risk_score: risk_score,
          risk_flags: risk_flags
        },
        error_code: "BOOKING_BLOCKED"
      )
    end
  end
end
