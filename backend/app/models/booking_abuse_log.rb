class BookingAbuseLog < ApplicationRecord
  SEVERITIES = %w[warning alert block].freeze

  belongs_to :user
  belongs_to :event_type
  belongs_to :public_booking_request, optional: true

  validates :client_ip, :rule_violated, :severity, presence: true
  validates :severity, inclusion: { in: SEVERITIES }

  scope :recent, ->(since = 24.hours.ago) { where("created_at >= ?", since) }
  scope :for_email, ->(email) { where(guest_email: email.to_s.downcase) }
  scope :for_ip, ->(client_ip) { where(client_ip: client_ip.to_s) }
  scope :for_fingerprint, ->(fingerprint) { where(fingerprint: fingerprint.to_s) }
  scope :blocked_only, -> { where(blocked: true) }
  scope :resolved, -> { where.not(resolved_at: nil) }
  scope :unresolved, -> { where(resolved_at: nil) }

  def self.record!(**attributes)
    create!(**attributes)
  end

  def mark_blocked!
    update!(blocked: true, severity: "block")
  end

  def resolve!
    update!(resolved_at: Time.current)
  end
end
