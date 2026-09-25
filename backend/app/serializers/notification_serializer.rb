class NotificationSerializer
  def initialize(notification)
    @notification = notification
  end

  def as_json
    {
      id: @notification.id,
      user_id: @notification.user_id,
      notification_type: @notification.notification_type,
      category: @notification.category,
      event_name: @notification.event_name,
      title: @notification.title,
      description: @notification.description,
      read_at: @notification.read_at,
      grouped_count: @notification.grouped_count,
      metadata: @notification.metadata || {},
      priority: @notification.priority,
      action_url: @notification.action_url,
      created_at: @notification.created_at,
      updated_at: @notification.updated_at,
      last_occurred_at: @notification.last_occurred_at
    }
  end
end
