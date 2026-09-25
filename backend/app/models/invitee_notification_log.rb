class InviteeNotificationLog < ApplicationRecord
  ACTIONS = %w[invite resend update cancel].freeze
  STATUSES = %w[sent failed skipped].freeze

  belongs_to :event
  belongs_to :event_invitee, optional: true

  validates :action, inclusion: { in: ACTIONS }
  validates :delivery_status, inclusion: { in: STATUSES }
  validates :recipient_email, presence: true
end
