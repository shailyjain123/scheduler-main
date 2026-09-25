class Notification < ApplicationRecord
  belongs_to :user
  belongs_to :actor, class_name: "User", optional: true
  belongs_to :notifiable, polymorphic: true, optional: true

  CATEGORIES = %w[meetings integrations onboarding contacts system plan credit security billing].freeze
  PRIORITIES = %w[normal high].freeze

  validates :notification_type, presence: true
  validates :title, presence: true
  validates :description, presence: true
  validates :category, presence: true, inclusion: { in: CATEGORIES }
  validates :priority, inclusion: { in: PRIORITIES }, allow_nil: true

  scope :unread, -> { where(read_at: nil) }
  scope :read, -> { where.not(read_at: nil) }
  scope :latest_first, -> { order(created_at: :desc) }

  after_create_commit :increment_user_unread_count
  after_create_commit :broadcast_to_user
  after_destroy_commit :decrement_user_unread_count, if: -> { !read? }

  def read?
    read_at.present?
  end

  def mark_as_read!
    return true if read?

    transaction do
      update!(read_at: Time.current)
      user.decrement!(:unread_notifications_count) if user.unread_notifications_count > 0
    end
    broadcast_unread_count
  end

  private

  def increment_user_unread_count
    user.increment!(:unread_notifications_count)
  end

  def decrement_user_unread_count
    user.decrement!(:unread_notifications_count) if user.unread_notifications_count > 0
  end

  def broadcast_to_user
    # Using Solid Cable (Rails 8)
    ActionCable.server.broadcast(
      "notifications_#{user_id}",
      {
        type: "NEW_NOTIFICATION",
        notification: as_json(include: { actor: { only: [:id, :full_name, :avatar_url] } }),
        unread_count: user.unread_notifications_count
      }
    )
  end

  def broadcast_unread_count
    ActionCable.server.broadcast(
      "notifications_#{user_id}",
      {
        type: "UNREAD_COUNT_UPDATE",
        unread_count: user.unread_notifications_count
      }
    )
  end
end
