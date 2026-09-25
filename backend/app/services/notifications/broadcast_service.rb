module Notifications
  class BroadcastService
    STREAM_PREFIX = "notifications".freeze

    def self.call(user:, notification: nil, event: "notification.created")
      new(user: user, notification: notification, event: event).call
    end

    def initialize(user:, notification:, event:)
      @user = user
      @notification = notification
      @event = event
    end

    def call
      return if @user.blank?

      ActionCable.server.broadcast(stream_name, payload)
    rescue => e
      Rails.logger.warn("[Notifications::BroadcastService] Failed to broadcast: #{e.class} #{e.message}")
    end

    private

    def stream_name
      "#{STREAM_PREFIX}_#{@user.id}"
    end

    def payload
      {
        type: @event == "notification.grouped" ? "NOTIFICATION_UPDATED" : "NEW_NOTIFICATION",
        event: @event,
        unread_count: @user.unread_notifications_count,
        notification: serialized_notification,
        server_time: Time.current.iso8601
      }
    end

    def serialized_notification
      return nil if @notification.blank?

      NotificationSerializer.new(@notification).as_json
    end
  end
end
