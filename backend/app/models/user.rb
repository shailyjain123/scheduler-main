require "jwt"
require "digest"

class User < ApplicationRecord
  FULL_NAME_REGEX = /\A[A-Za-z]+(?: [A-Za-z]+)*\z/
  USERNAME_REGEX = /\A[a-zA-Z0-9_]{3,20}\z/
  PASSWORD_COMPLEXITY_REGEX = /\A(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])[^\s]+\z/
  OTP_TTL = 10.minutes
  OTP_RESEND_COOLDOWN = 60.seconds
  OTP_RESEND_WINDOW = 1.hour
  OTP_MAX_RESENDS_PER_WINDOW = 3
  OTP_MAX_FAILED_ATTEMPTS = 5
  OTP_LOCK_DURATION = 15.minutes
  PASSWORD_RESET_TTL = 30.minutes
  PASSWORD_RESET_REQUEST_COOLDOWN = 60.seconds
  PASSWORD_RESET_REQUEST_WINDOW = 1.hour
  PASSWORD_RESET_MAX_REQUESTS_PER_WINDOW = 5
  PASSWORD_RESET_MAX_FAILED_ATTEMPTS = 5
  PASSWORD_RESET_LOCK_DURATION = 15.minutes

  SUPPORTED_CURRENCIES = %w[USD EUR INR GBP].freeze
  DEFAULT_CURRENCY = "USD".freeze

  PLAN_CREDITS = {
    "free" => 25,
    "starter" => 250,
    "pro" => 1250,
    "enterprise" => 6250,
    "ultimate" => 25000,
    "premium" => 100000
  }.freeze

  has_secure_password
  has_many :sessions, dependent: :destroy
  has_many :events, dependent: :destroy
  has_many :event_invitees, dependent: :nullify
  has_many :event_types, dependent: :destroy
  has_many :external_identities, dependent: :destroy
  has_many :contacts, dependent: :destroy
  has_many :contact_notes, dependent: :destroy
  has_many :notifications, dependent: :destroy
  has_many :availability_schedules, dependent: :destroy
  has_many :availability_overrides, dependent: :destroy
  has_one :user_setting, dependent: :destroy

  after_create :create_default_settings
  after_create :link_existing_invitees
  before_save :set_avatar_source_on_manual_update, if: :will_save_change_to_avatar_url?

  # Note: Rails enum requires careful setup with the database column type
  # For now, using string validation instead
  # enum status: { active: 0, inactive: 1, banned: 2 }

  # Validations
  validates :email, presence: true, uniqueness: true,
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, presence: true, length: { minimum: 8 }, on: :create
  validates :password, format: {
    with: PASSWORD_COMPLEXITY_REGEX,
    message: "must include at least one uppercase letter, one lowercase letter, one number, one special character, and no spaces"
  }, allow_nil: true
  validates :full_name, presence: true,
                        length: { minimum: 3, maximum: 50 },
                        format: { with: FULL_NAME_REGEX, message: "can only contain letters and single spaces between words" }
  validates :status, presence: true, inclusion: { in: %w[active inactive banned] }
  validates :username,
            uniqueness: { case_sensitive: false },
            format: { with: USERNAME_REGEX, message: "must be 3-20 characters and only contain letters, numbers, and underscores" },
            allow_nil: true
  validates :timezone, presence: true, if: -> { timezone.present? || onboarding_completed }
  validates :signup_method, inclusion: { in: %w[email google_oauth2 microsoft_graph slack zoom], allow_nil: true }
  validates :plan_type, presence: true
  validates :preferred_currency, presence: true, inclusion: { in: SUPPORTED_CURRENCIES }
  validates :billing_cycle, presence: true, inclusion: { in: %w[monthly quarterly yearly] }
  validates :avatar_source, inclusion: { in: %w[google microsoft slack zoom uploaded] }, allow_nil: true
  validate :email_has_no_spaces

  # Scopes
  scope :active, lambda { where(status: "active") }
  scope :by_email, ->(email) { where(email: email) }
  scope :expiring_in, ->(days) { 
    where("plan_expires_at >= ? AND plan_expires_at <= ?", days.days.from_now.beginning_of_day, days.days.from_now.end_of_day) 
  }

  def custom_avatar?
    avatar_source == "uploaded"
  end
  public :custom_avatar?

  def set_avatar_source_on_manual_update
    # If avatar_url is being updated, we check if it was already explicitly set to an SSO provider
    # in this transaction. If not, it's a manual update.
    return if avatar_source_changed? && %w[google microsoft slack zoom].include?(avatar_source)

    self.avatar_source = "uploaded"
  end

  # Callbacks

  before_save :downcase_email
  before_validation :normalize_username

  # Generate JWT token
  def generate_token
    expiration = 30.days.from_now
    payload = {
      jti: SecureRandom.uuid,  # Unique ID for this token
      user_id: id,
      email: email,
      full_name: full_name,
      exp: expiration.to_i
    }

    # Use the main app secret_key_base for encoding
    token = JWT.encode(payload, Rails.application.secret_key_base)

    begin
      # Try to create session record
      sessions.create!(token: token, expires_at: expiration)
      Rails.logger.debug "[Auth] Session created for User #{id}"
    rescue => e
      # Fail closed: do not issue tokens that cannot be validated against a persisted session.
      Rails.logger.error "[Auth] Failed to create session: #{e.message}"
      return nil
    end

    token
  end

  # Validate JWT token
  def self.from_token(token)
    return nil if token.blank?

    begin
      payload = JWT.decode(token, Rails.application.secret_key_base).first
      user = find_by(id: payload["user_id"])

      if user.nil?
        Rails.logger.debug "[Auth] User not found for ID: #{payload['user_id']}"
        return nil
      end

      # Check if session is still valid
      session = user.sessions.find_by(token: token)

      if session.blank?
        Rails.logger.debug "[Auth] Session not found for token: #{token[0..10]}..."
        return nil
      end

      if session.expires_at < Time.current
        Rails.logger.debug "[Auth] Session expired for token: #{token[0..10]}..."
        return nil
      end

      unless user.email_verified? && user.status == "active"
        Rails.logger.debug "[Auth] Unverified or inactive user token rejected: #{user.id}"
        return nil
      end

      user
    rescue JWT::DecodeError => e
      Rails.logger.debug "[Auth] JWT Decode Error: #{e.message}"
      nil
    rescue => e
      Rails.logger.debug "[Auth] Unexpected error in from_token: #{e.message}"
      nil
    end
  end

  def email_verified?
    email_verified_at.present?
  end
  public :email_verified?

  def sso_user?
    signup_method.present? && signup_method != "email"
  end
  public :sso_user?

  def premium_features?
    %w[pro enterprise ultimate premium].include?(plan_type)
  end
  public :premium_features?

  def pro_plan?
    # %w[pro enterprise ultimate premium].include?(plan_type)
    plan_type != "free"
  end
  public :pro_plan?

  def remaining_credits
    [ total_credits - used_credits, 0 ].max
  end
  public :remaining_credits

  def days_remaining
    return 0 if plan_expires_at.blank? || plan_expires_at.past?
    ((plan_expires_at - Time.current) / 1.day).ceil
  end
  public :days_remaining

  def plan_expired?
    plan_expires_at.present? && plan_expires_at.past?
  end
  public :plan_expired?

  def credits_exhausted?
    remaining_credits <= 0
  end
  public :credits_exhausted?

  def increment_used_credits!
    # Atomic increment to prevent race conditions, bounded by total_credits
    User.where(id: id).where("used_credits < total_credits").update_all("used_credits = used_credits + 1")
    new_used = reload.used_credits

    # Check for notification triggers
    trigger_usage_notifications(new_used)

    new_used
  end

  def activate_plan!(plan_name, billing_cycle_val)
    # Simple activation (used for initial or same-plan reset)
    plan = Plan.find_by("lower(name) = ? AND billing_cycle = ? AND active = ?", plan_name.downcase, billing_cycle_val, true)
    
    # Fallback to free plan if requested plan not found
    unless plan
      plan_name = PLAN_CREDITS.key?(plan_name.downcase) ? plan_name.downcase : "free"
      billing_cycle_val ||= "monthly"
    end

    credits = plan&.credits || PLAN_CREDITS[plan_name] || 0
    duration = case billing_cycle_val
               when "yearly" then 1.year
               when "quarterly" then 3.months
               else 1.month
               end

    update!(
      plan_type: plan_name,
      billing_cycle: billing_cycle_val,
      total_credits: credits,
      used_credits: 0,
      plan_started_at: Time.current,
      plan_expires_at: Time.current + duration,
      cancel_at_period_end: false,
      pending_plan_change: {}
    )

    Notifications::PlanNotificationService.notify_activation(self)
  end

  def upgrade_plan!(new_plan_name, new_cycle)
    plan = Plan.find_by("lower(name) = ? AND billing_cycle = ? AND active = ?", new_plan_name.downcase, new_cycle, true)
    added_credits = plan&.credits || PLAN_CREDITS[new_plan_name.downcase] || 0

    new_credits = remaining_credits + added_credits
    duration = case new_cycle
               when "yearly" then 1.year
               when "quarterly" then 3.months
               else 1.month
               end

    update!(
      plan_type: new_plan_name,
      billing_cycle: new_cycle,
      total_credits: new_credits,
      used_credits: 0,
      plan_started_at: Time.current,
      plan_expires_at: Time.current + duration,
      cancel_at_period_end: false,
      pending_plan_change: {}
    )

    Notifications::PlanNotificationService.notify_update(self)
  end

  def downgrade_plan!(new_plan, new_cycle)
    update!(
      cancel_at_period_end: false,
      pending_plan_change: {
        plan_type: new_plan,
        billing_cycle: new_cycle
      }
    )
    # Notification for scheduled downgrade handled in controller or here
  end

  def cancel_plan!
    update!(cancel_at_period_end: true)
  end

  def reactivate_plan!
    update!(cancel_at_period_end: false)
  end

  def process_lifecycle_events!
    if plan_expired?
      if cancel_at_period_end
        # Switch to free
        activate_plan!("free", "monthly")
        Notifications::PlanNotificationService.notify_expiry(self)
      elsif pending_plan_change.present?
        # Apply downgrade
        activate_plan!(pending_plan_change["plan_type"], pending_plan_change["billing_cycle"])
        Notifications::PlanNotificationService.notify_update(self)
      else
        # Auto-renew same plan (in a real app, billing happens here)
        activate_plan!(plan_type, billing_cycle)
      end
    else
      # Check for expiry warnings
      case days_remaining
      when 3
        Notifications::PlanNotificationService.notify_expiry_warning(self, 3)
      when 1
        Notifications::PlanNotificationService.notify_expiry_warning(self, 1)
      end
    end
  end

  private

  def trigger_usage_notifications(used)
    return if total_credits <= 0

    usage_percent = (used.to_f / total_credits * 100).round

    # We use a grouped key or metadata to prevent spamming the same notification
    case usage_percent
    when 100..Float::INFINITY
      Notifications::PlanNotificationService.notify_usage(self, 100)
    when 80..99
      Notifications::PlanNotificationService.notify_usage(self, 80)
    when 50..79
      Notifications::PlanNotificationService.notify_usage(self, 50)
    end
  end

  def generate_signup_otp!
    otp_code = format("%06d", SecureRandom.random_number(1_000_000))

    self.otp_digest = digest_otp(otp_code)
    self.otp_sent_at = Time.current
    self.otp_expires_at = OTP_TTL.from_now
    self.otp_failed_attempts = 0
    self.otp_locked_until = nil
    self.otp_resend_window_started_at ||= Time.current

    save!
    otp_code
  end

  def verify_signup_otp!(otp_code)
    return { success: false, code: "OTP_MISSING", message: "OTP is required" } if otp_code.blank?

    if otp_locked_until.present? && otp_locked_until.future?
      return {
        success: false,
        code: "OTP_LOCKED",
        message: "Too many invalid OTP attempts. Please try again later."
      }
    end

    if otp_digest.blank? || otp_expires_at.blank?
      return { success: false, code: "OTP_NOT_FOUND", message: "No active OTP found. Please request a new OTP." }
    end

    if otp_expires_at.past?
      return { success: false, code: "OTP_EXPIRED", message: "OTP has expired. Please request a new OTP." }
    end

    unless valid_otp?(otp_code)
      increment!(:otp_failed_attempts)

      if otp_failed_attempts >= OTP_MAX_FAILED_ATTEMPTS
        update!(otp_locked_until: OTP_LOCK_DURATION.from_now)
        return {
          success: false,
          code: "OTP_LOCKED",
          message: "Too many invalid OTP attempts. Please try again later."
        }
      end

      return { success: false, code: "OTP_INVALID", message: "Invalid OTP. Please try again." }
    end

    update!(
      email_verified_at: Time.current,
      status: "active",
      otp_digest: nil,
      otp_sent_at: nil,
      otp_expires_at: nil,
      otp_failed_attempts: 0,
      otp_locked_until: nil,
      otp_resend_count: 0,
      otp_resend_window_started_at: nil
    )

    { success: true }
  end

  def can_resend_otp?
    return { allowed: false, code: "OTP_ALREADY_VERIFIED", message: "Email is already verified." } if email_verified?

    if otp_sent_at.present? && otp_sent_at > OTP_RESEND_COOLDOWN.ago
      wait_seconds = (OTP_RESEND_COOLDOWN - (Time.current - otp_sent_at)).ceil
      return {
        allowed: false,
        code: "OTP_RESEND_COOLDOWN",
        message: "Please wait #{wait_seconds} seconds before requesting another OTP."
      }
    end

    ensure_resend_window!

    if otp_resend_count >= OTP_MAX_RESENDS_PER_WINDOW
      return {
        allowed: false,
        code: "OTP_RESEND_LIMIT_REACHED",
        message: "Too many OTP resend attempts. Please try again later."
      }
    end

    { allowed: true }
  end

  def mark_otp_resent!
    ensure_resend_window!
    increment!(:otp_resend_count)
  end

  def can_request_password_reset?
    if password_reset_sent_at.present? && password_reset_sent_at > PASSWORD_RESET_REQUEST_COOLDOWN.ago
      wait_seconds = (PASSWORD_RESET_REQUEST_COOLDOWN - (Time.current - password_reset_sent_at)).ceil
      return {
        allowed: false,
        code: "PASSWORD_RESET_COOLDOWN",
        message: "Please wait #{wait_seconds} seconds before requesting another reset email."
      }
    end

    ensure_password_reset_window!

    if password_reset_request_count >= PASSWORD_RESET_MAX_REQUESTS_PER_WINDOW
      return {
        allowed: false,
        code: "PASSWORD_RESET_LIMIT_REACHED",
        message: "Too many password reset requests. Please try again later."
      }
    end

    { allowed: true }
  end

  def mark_password_reset_requested!
    ensure_password_reset_window!
    increment!(:password_reset_request_count)
  end

  def generate_password_reset_token!
    raw_token = SecureRandom.urlsafe_base64(32)

    update!(
      password_reset_token_digest: digest_secret(raw_token),
      password_reset_sent_at: Time.current,
      password_reset_expires_at: PASSWORD_RESET_TTL.from_now,
      password_reset_failed_attempts: 0,
      password_reset_locked_until: nil
    )

    raw_token
  end

  def reset_password_with_token!(token:, new_password:, password_confirmation:)
    token_check = validate_password_reset_token(token)
    return token_check unless token_check[:success]

    if password_confirmation.blank?
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: "Password confirmation is required",
        details: { password_confirmation: [ "is required" ] }
      }
    end

    unless update(password: new_password, password_confirmation: password_confirmation)
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: errors.full_messages.to_sentence,
        details: errors.as_json
      }
    end

    sessions.update_all(expires_at: Time.current)

    update_columns(
      password_reset_token_digest: nil,
      password_reset_sent_at: nil,
      password_reset_expires_at: nil,
      password_reset_failed_attempts: 0,
      password_reset_locked_until: nil
    )

    { success: true }
  end

  private

  def downcase_email
    self.email = email.downcase if email.present?
  end

  def normalize_username
    self.username = username.to_s.downcase.strip.presence
  end

  def email_has_no_spaces
    return if email.blank?

    errors.add(:email, "cannot contain spaces") if email.match?(/\s/)
  end

  def digest_otp(otp_code)
    digest_secret(otp_code)
  end

  def valid_otp?(otp_code)
    ActiveSupport::SecurityUtils.secure_compare(digest_otp(otp_code.to_s), otp_digest)
  end

  def ensure_resend_window!
    return if otp_resend_window_started_at.present? && otp_resend_window_started_at > OTP_RESEND_WINDOW.ago

    self.otp_resend_count = 0
    self.otp_resend_window_started_at = Time.current
    save! if persisted? && changed?
  end

  def digest_secret(value)
    secret = Rails.application.secret_key_base
    Digest::SHA256.hexdigest("#{value}:#{secret}")
  end

  def validate_password_reset_token(token)
    return { success: false, code: "RESET_TOKEN_MISSING", message: "Reset token is required" } if token.blank?

    if password_reset_locked_until.present? && password_reset_locked_until.future?
      return {
        success: false,
        code: "RESET_TOKEN_LOCKED",
        message: "Too many invalid reset attempts. Please request a new password reset link."
      }
    end

    if password_reset_token_digest.blank? || password_reset_expires_at.blank?
      return {
        success: false,
        code: "RESET_TOKEN_INVALID",
        message: "Invalid password reset token. Please request a new reset link."
      }
    end

    if password_reset_expires_at.past?
      return {
        success: false,
        code: "RESET_TOKEN_EXPIRED",
        message: "Password reset token has expired. Please request a new reset link."
      }
    end

    unless ActiveSupport::SecurityUtils.secure_compare(digest_secret(token.to_s), password_reset_token_digest)
      increment!(:password_reset_failed_attempts)

      if password_reset_failed_attempts >= PASSWORD_RESET_MAX_FAILED_ATTEMPTS
        update!(password_reset_locked_until: PASSWORD_RESET_LOCK_DURATION.from_now)
        return {
          success: false,
          code: "RESET_TOKEN_LOCKED",
          message: "Too many invalid reset attempts. Please request a new password reset link."
        }
      end

      return {
        success: false,
        code: "RESET_TOKEN_INVALID",
        message: "Invalid password reset token. Please request a new reset link."
      }
    end

    { success: true }
  end

  def ensure_password_reset_window!
    return if password_reset_request_window_started_at.present? && password_reset_request_window_started_at > PASSWORD_RESET_REQUEST_WINDOW.ago

    self.password_reset_request_count = 0
    self.password_reset_request_window_started_at = Time.current
    save! if persisted? && changed?
  end

  def create_default_settings
    create_user_setting!
  end

  def link_existing_invitees
    EventInvitee.where(email: email).update_all(user_id: id)
  end
end
