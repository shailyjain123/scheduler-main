class Reminder < ApplicationRecord
  belongs_to :event

  enum :status, {
    pending: 'pending',
    delivered: 'delivered',
    cancelled: 'cancelled',
    obsolete: 'obsolete',
    failed: 'failed'
  }

  enum :reminder_type, {
    email: 'email',
    sms: 'sms',
    push: 'push'
  }

  validates :reminder_type, presence: true
  validates :status, presence: true
  validates :scheduled_at, presence: true
  validates :recipient_type, presence: true, inclusion: { in: %w[guest host both] }
  validates :offset_identifier, presence: true
  validates :version, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 1 }

  scope :upcoming, -> { where(status: :pending).where('scheduled_at <= ?', Time.current) }

  def mark_as_delivered!
    update!(status: :delivered, sent_at: Time.current)
  end

  def mark_as_failed!(error)
    update!(status: :failed, error_message: error)
  end
end
