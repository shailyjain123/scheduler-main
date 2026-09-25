module Notifications
  class Dispatcher
    # Meeting lifecycle is decided here and executed by EventAudienceNotifier.
    # That notifier is the single writer for in-app meeting notifications.
    MEETING_KINDS = {
      "meeting.booked" => :booked,
      "meeting.created" => :created,
      "meeting.cancelled" => :cancelled,
      "meeting.deleted" => :cancelled,
      "meeting.rescheduled" => :updated,
      "meeting.completed" => :updated
    }.freeze

    def self.trigger(event_name, actor:, target:, metadata: {})
      new(event_name, actor, target, metadata).call
    end

    def initialize(event_name, actor, target, metadata)
      @event_name = event_name.to_s
      @actor = actor
      @target = target
      @metadata = metadata.is_a?(Hash) ? metadata : {}
    end

    def call
      if meeting_event?
        dispatch_meeting_event
        return
      end

      recipients = resolve_recipients
      if recipients.empty?
        Rails.logger.info("[Notifications::Dispatcher] No recipients for #{@event_name}")
        return
      end

      recipients.each do |recipient|
        # Don't notify actor if they are the recipient, unless it's a specific system event
        next if actor&.id == recipient.id && !system_event?

        Notifications::CreateJob.perform_later(
          event_name: @event_name,
          recipient_id: recipient.id,
          actor_id: actor&.id,
          notifiable_type: @target.class.name,
          notifiable_id: @target.id,
          metadata: @metadata
        )
      end
    end

    private

    attr_reader :actor, :target

    def meeting_event?
      MEETING_KINDS.key?(@event_name)
    end

    def dispatch_meeting_event
      unless target.is_a?(Event)
        Rails.logger.info("[Notifications::Dispatcher] #{@event_name} ignored because target is #{target.class}")
        return
      end

      kind = MEETING_KINDS.fetch(@event_name)
      Rails.logger.info("[Notifications::Dispatcher] #{@event_name} event_id=#{target.id} kind=#{kind}")

      Notifications::EventAudienceNotifier.call(
        event: target,
        kind: kind,
        actor: actor,
        change_summary: change_summary
      )
    end

    def change_summary
      summary = @metadata[:change_summary] || @metadata["change_summary"]
      summary.is_a?(Hash) ? summary : {}
    end

    def resolve_recipients
      case @event_name.to_s
      when "profile.updated"
        [ actor ]
      when /integration\.(connected|disconnected)/
        [ actor ]
      else
        []
      end
    end

    def system_event?
      %w[profile.updated integration.connected integration.disconnected].include?(@event_name.to_s)
    end
  end
end
