require "digest"

class PublicBookingRequest < ApplicationRecord
  STATUSES = %w[pending verified expired].freeze
  VERIFICATION_TTL = 15.minutes
  VERIFICATION_RESEND_COOLDOWN = 60.seconds
  MAX_VERIFICATION_ATTEMPTS = 5

  belongs_to :event_type
  belongs_to :user
  belongs_to :booking_event, class_name: "Event", optional: true
  has_many :booking_abuse_logs, dependent: :nullify

  validates :guest_name, presence: true
  validates :guest_email,
            presence: true,
            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :start_time, :end_time, :timezone, :status, :verification_code_digest,
            :verification_sent_at, :verification_expires_at, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :start_time, uniqueness: { scope: :event_type_id, conditions: -> { where(status: "pending") }, message: "is already reserved for verification" }, if: :pending?

  before_validation :normalize_guest_email
  before_validation :normalize_client_context

  scope :pending, -> { where(status: "pending") }
  scope :verified, -> { where(status: "verified") }
  scope :expired, -> { where(status: "expired") }
  scope :active_hold, -> { pending.where("verification_expires_at > ?", Time.current) }
  scope :for_slot, ->(event_type_id, start_time) { where(event_type_id: event_type_id, start_time: start_time) }
  scope :for_email, ->(guest_email) { where(guest_email: guest_email.to_s.strip.downcase) }
  scope :for_client_ip, ->(client_ip) { where(client_ip: client_ip.to_s.strip) }
  scope :for_client_fingerprint, ->(client_fingerprint) { where(client_fingerprint: client_fingerprint.to_s.strip) }

  def expired?
    verification_expires_at.present? && verification_expires_at.past?
  end

  def pending?
    status == "pending"
  end

  def verified?
    status == "verified"
  end

  def generate_verification_code!
    code = format("%06d", SecureRandom.random_number(1_000_000))
    self.verification_code_digest = digest_verification_code(code)
    self.verification_sent_at = Time.current
    self.verification_expires_at = VERIFICATION_TTL.from_now
    code
  end

  def verification_code_valid?(code)
    return false if verification_code_digest.blank? || code.blank?

    ActiveSupport::SecurityUtils.secure_compare(digest_verification_code(code.to_s), verification_code_digest)
  end

  def active_hold?
    pending? && !expired?
  end

  def can_resend_verification_code?
    verification_sent_at.blank? || verification_sent_at <= VERIFICATION_RESEND_COOLDOWN.ago
  end

  def refresh_verification_code!
    code = generate_verification_code!
    save!
    code
  end

  def mark_verified!(booking_event:)
    update!(
      status: "verified",
      verified_at: Time.current,
      booking_event: booking_event
    )
  end

  def expire!
    update!(status: "expired") unless verified?
  end

  def touch_risk!(score:, flags: [])
    update!(risk_score: score.to_i, risk_flags: Array(flags))
  end

  private

  def normalize_guest_email
    self.guest_email = guest_email.to_s.strip.downcase
  end

  def normalize_client_context
    self.client_ip = client_ip.to_s.strip.presence
    self.client_fingerprint = client_fingerprint.to_s.strip.presence
    self.user_agent = user_agent.to_s.strip.presence
  end

  def digest_verification_code(code)
    Digest::SHA256.hexdigest("#{code}:#{Rails.application.secret_key_base}")
  end
end
