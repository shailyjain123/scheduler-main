module Notifications
  class EventAudienceNotifier
    FIELD_LABELS = {
      "title" => "title",
      "description" => "description",
      "start_time" => "start time",
      "end_time" => "end time",
      "location" => "location",
      "meeting_link" => "meeting link"
    }.freeze

    def self.call(event:, kind:, actor:, change_summary: nil)
      new(event: event, kind: kind, actor: actor, change_summary: change_summary).call
    end

    def initialize(event:, kind:, actor:, change_summary: nil)
      @event = event
      @kind = kind.to_sym
      @actor = actor
      @change_summary = change_summary.is_a?(Hash) ? change_summary : {}
    end

    def call
      notify_host
      notify_registered_guests
    end

    private

    attr_reader :event, :kind, :actor, :change_summary

    def notify_host
      Notifications::CreateService.call(
        user: event.user, # Always notify the host
        event_name: event_name,
        category: "meetings",
        notification_type: notification_type,
        title: host_title,
        description: host_description,
        action_url: "/meetings",
        group_key: host_group_key,
        group_window: group_window,
        metadata: base_metadata.merge(host: true)
      )
    end

    def notify_registered_guests
      guest_users.find_each do |guest|
        # Don't notify the actor if they are a registered guest (they already know)
        next if actor && guest.id == actor.id

        Notifications::CreateService.call(
          user: guest,
          event_name: event_name,
          category: "meetings",
          notification_type: notification_type,
          title: guest_title,
          description: guest_description(guest),
          action_url: "/meetings",
          group_key: guest_group_key(guest),
          group_window: group_window,
          metadata: base_metadata.merge(host: false, guest_user_id: guest.id)
        )
      end
    end

    def guest_users
      User.where(id: event.event_invitees.where.not(user_id: nil).select(:user_id).distinct)
    end

    def event_name
      case kind
      when :created
        "event.created"
      when :booked
        "meeting.booked"
      when :cancelled
        "event.cancelled"
      else
        "event.updated"
      end
    end

    def notification_type
      case kind
      when :created, :booked
        "booking"
      when :cancelled
        "cancellation"
      else
        "reschedule"
      end
    end

    def host_title
      case kind
      when :created
        "Meeting created"
      when :booked
        "New meeting booked"
      when :cancelled
        "Meeting cancelled"
      else
        "Meeting updated"
      end
    end

    def guest_title
      case kind
      when :created
        "New invitation"
      when :booked
        "Booking confirmed"
      when :cancelled
        "Meeting cancelled"
      else
        "Meeting updated"
      end
    end

    def host_description
      event_description
    end

    def guest_description(_guest)
      event_description
    end

    def event_description
      actor_name = actor&.full_name || "An attendee"
      case kind
      when :created
        "#{actor_name} created a meeting: '#{event.title}' at #{format_time_value(event.start_time)}."
      when :booked
        "#{booked_actor_name} booked a meeting: '#{event.title}' at #{format_time_value(event.start_time)}."
      when :cancelled
        "#{actor_name} cancelled the meeting: '#{event.title}'."
      else
        update_message
      end
    end

    def booked_actor_name
      guest_name = event.metadata.is_a?(Hash) ? event.metadata["guest_name"].to_s.strip.presence : nil
      guest_name || actor&.full_name || "A guest"
    end

    def update_message
      clauses = update_change_clauses
      actor_name = actor&.full_name || "An attendee"
      prefix = "#{actor_name} updated the meeting"

      return "#{prefix}." if clauses.empty?

      "#{prefix}: #{clauses.join(', ')}."
    end

    def update_change_clauses
      change_summary.map do |field, values|
        next if values.blank?

        to_value = values["to"]
        next if to_value.blank?

        case field.to_s
        when "title"
          "title changed to '#{to_value}'"
        when "start_time"
          "start time moved to #{format_time_value(to_value)}"
        when "end_time"
          "end time moved to #{format_time_value(to_value)}"
        when "location"
          "location changed to '#{to_value}'"
        when "description"
          "description changed to '#{to_value}'"
        when "meeting_link"
          "meeting link updated"
        else
          "#{human_field(field)} changed"
        end
      end.compact
    end

    def human_field(field)
      FIELD_LABELS[field.to_s] || field.to_s.humanize.downcase
    end

    def format_time_value(value)
      parsed = if value.is_a?(Time) || value.is_a?(ActiveSupport::TimeWithZone)
        value
      else
        begin
          Time.iso8601(value.to_s)
        rescue ArgumentError
          Time.parse(value.to_s) rescue nil
        end
      end

      return value.to_s if parsed.nil?

      parsed.utc.strftime("%-I:%M %p UTC")
    end

    def base_metadata
      {
        event_id: event.id,
        start_time: event.start_time&.iso8601,
        end_time: event.end_time&.iso8601,
        changed_fields: change_summary.keys,
        host_user_id: event.user_id,
        actor_user_id: actor&.id
      }
    end

    def host_group_key
      return nil if ungrouped_kind?

      "event-updated:#{event.id}:host"
    end

    def guest_group_key(guest)
      return nil if ungrouped_kind?

      "event-updated:#{event.id}:guest:#{guest.id}"
    end

    def group_window
      return nil if ungrouped_kind?

      12.hours
    end

    def ungrouped_kind?
      kind == :created || kind == :cancelled || kind == :booked
    end
  end
end
