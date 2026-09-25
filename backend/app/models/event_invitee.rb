class EventInvitee < ApplicationRecord
  STATUSES = %w[pending accepted declined maybe].freeze

  belongs_to :event, counter_cache: true
  belongs_to :user, optional: true
  has_many :invitee_notification_logs, dependent: :nullify

  validates :email,
            presence: true,
            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :token, presence: true, uniqueness: true
  validates :status, inclusion: { in: STATUSES }
  validates :email, uniqueness: { scope: :event_id, case_sensitive: false, message: "Invitee already added" }

  before_validation :normalize_email
  before_validation :ensure_token, on: :create

  scope :accepted, -> { where(status: "accepted") }
  scope :declined, -> { where(status: "declined") }
  scope :maybe, -> { where(status: "maybe") }
  scope :pending, -> { where(status: "pending") }

  def registered_user?
    user_id.present?
  end

  private

  def normalize_email
    self.email = email.to_s.strip.downcase
  end

  def ensure_token
    self.token ||= SecureRandom.urlsafe_base64(32)
  end
end
