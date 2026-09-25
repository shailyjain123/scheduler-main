module Events
  class DeleteEventService
    Result = Struct.new(:success?, :data, :errors, :error_code, keyword_init: true)

    def initialize(user:, event:)
      @user = user
      @event = event
    end

    def call
      return Result.new(success?: false, errors: [ "Event not found" ], error_code: "NOT_FOUND") if event.user_id != user.id
      return Result.new(success?: false, errors: [ "Only scheduled events can be cancelled" ], error_code: "VALIDATION_ERROR") unless event.status == "scheduled"

      ActiveRecord::Base.transaction do
        event.update!(status: "cancelled")
        event.reminders.where(status: :pending).update_all(status: :cancelled, updated_at: Time.current)
        append_status_change_log!("scheduled", "cancelled")
        event.event_invitees.find_each do |invitee|
          invitee.update!(status: "declined", responded_at: Time.current)
          InviteeNotificationJob.perform_later(invitee_id: invitee.id, action: :cancel)
        end
      end

      Notifications::EventAudienceNotifier.call(
        event: event,
        kind: :cancelled,
        actor: user
      )

      Result.new(success?: true, data: event)
    rescue ActiveRecord::RecordInvalid => e
      Result.new(success?: false, errors: [ e.message ], error_code: "VALIDATION_ERROR")
    end

    private

    attr_reader :user, :event

    def append_status_change_log!(from_status, to_status)
      metadata = event.metadata.is_a?(Hash) ? event.metadata.deep_dup : {}
      history = Array(metadata["status_history"])

      history << {
        "from" => from_status,
        "to" => to_status,
        "changed_at" => Time.current.utc.iso8601,
        "changed_by_user_id" => user.id,
        "source" => "delete_event_service"
      }

      metadata["status_history"] = history.last(25)
      metadata["status_changed_at"] = Time.current.utc.iso8601
      metadata["status_changed_by_user_id"] = user.id
      event.update!(metadata: metadata)
    end
  end
end
