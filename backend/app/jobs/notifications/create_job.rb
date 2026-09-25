module Notifications
  class CreateJob < ApplicationJob
    queue_as :notifications

    def perform(event_name:, recipient_id:, actor_id: nil, notifiable_type: nil, notifiable_id: nil, metadata: {})
      recipient = User.find(recipient_id)
      actor = actor_id ? User.find_by(id: actor_id) : nil
      
      # Generate a dedup hash to prevent duplicate notifications within a 1-minute window
      # Format: event:recipient:notifiable:minute_timestamp
      timestamp = Time.current.strftime("%Y%m%d%H%M")
      dedup_hash = Digest::SHA1.hexdigest("#{event_name}:#{recipient_id}:#{notifiable_type}:#{notifiable_id}:#{timestamp}")

      return if Notification.exists?(dedup_hash: dedup_hash)

      notification_params = build_notification_params(event_name, actor, notifiable_type, notifiable_id)
      
      Notification.create!(
        user: recipient,
        actor: actor,
        notifiable_type: notifiable_type,
        notifiable_id: notifiable_id,
        event_name: event_name,
        notification_type: notification_params[:type],
        category: notification_params[:category],
        title: notification_params[:title],
        description: notification_params[:description],
        action_url: notification_params[:action_url],
        metadata: metadata.merge(notification_params[:metadata] || {}),
        dedup_hash: dedup_hash
      )
    rescue ActiveRecord::RecordNotUnique
      # Handle race condition between exists? and create!
      nil
    end

    private

    def build_notification_params(event_name, actor, notifiable_type, notifiable_id)
      actor_name = actor&.full_name || "Someone"
      
      case event_name
      when "meeting.booked"
        {
          type: "booking",
          category: "meetings",
          title: "New Meeting Booked",
          description: "#{actor_name} booked a new meeting with you.",
          action_url: "/meetings"
        }
      when "meeting.created"
        {
          type: "booking",
          category: "meetings",
          title: "Meeting Created",
          description: "You have successfully scheduled a new meeting.",
          action_url: "/meetings"
        }
      when "meeting.deleted"
        {
          type: "cancellation",
          category: "meetings",
          title: "Meeting Deleted",
          description: "A meeting has been removed from your schedule.",
          action_url: "/meetings"
        }
      when "meeting.cancelled"
        {
          type: "cancellation",
          category: "meetings",
          title: "Meeting Cancelled",
          description: "#{actor_name} cancelled a meeting.",
          action_url: "/meetings"
        }
      when "meeting.rescheduled"
        {
          type: "reschedule",
          category: "meetings",
          title: "Meeting Rescheduled",
          description: "#{actor_name} rescheduled a meeting.",
          action_url: "/meetings"
        }
      when "profile.updated"
        {
          type: "profile_update",
          category: "system",
          title: "Profile Updated",
          description: "Your profile details have been updated successfully.",
          action_url: "/settings/profile"
        }
      when "integration.connected"
        {
          type: "integration",
          category: "integrations",
          title: "Integration Connected",
          description: "You have successfully connected a new integration.",
          action_url: "/settings/integrations"
        }
      when "integration.disconnected"
        {
          type: "integration",
          category: "integrations",
          title: "Integration Disconnected",
          description: "An integration has been disconnected.",
          action_url: "/settings/integrations"
        }
      else
        {
          type: "generic",
          category: "system",
          title: "New Notification",
          description: "You have a new update.",
          action_url: "/dashboard"
        }
      end
    end
  end
end
