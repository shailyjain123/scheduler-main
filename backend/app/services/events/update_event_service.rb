module Events
  class UpdateEventService
    Result = Struct.new(:success?, :data, :errors, :details, :error_code, keyword_init: true)

    TRACKED_FIELDS = %w[title description start_time end_time location].freeze

    def initialize(user:, event:, params:, invitees: nil)
      @user = user
      @event = event
      @params = params
      @invitees = invitees
    end

    def call
      previous_values = tracked_values
      added_invitee_ids = []
      change_summary = {}
      cancelled_invitee_ids = []
      update_params = params.respond_to?(:except) ? params.except(:invitees) : params

      status_transition = validate_status_transition!(update_params[:status])
      return status_transition if status_transition.is_a?(Result) && !status_transition.success?

      ActiveRecord::Base.transaction do
        unless event.update(update_params)
          return failure(event.errors.full_messages, event.errors.as_json)
        end

        annotate_reschedule_metadata! if event.saved_change_to_start_time? || event.saved_change_to_end_time?

        added_invitee_ids = sync_invitees if invitees_provided?

        if event.saved_change_to_status? && event.status == "cancelled"
          cancelled_invitee_ids = cancel_all_invitees!
        else
          change_summary = build_change_summary(previous_values)
          reset_invitee_statuses! if change_summary.present?
        end

        append_status_change_log!(previous_values["status"], event.status) if event.saved_change_to_status?

        Events::ScheduleRemindersService.new(event: event).call if event.saved_change_to_start_time? || (event.saved_change_to_status? && event.status == "scheduled")
      end

      dispatch_notifications(
        added_invitee_ids: added_invitee_ids,
        change_summary: change_summary,
        cancelled_invitee_ids: cancelled_invitee_ids
      )

      notify_event_audience!(change_summary: change_summary, cancelled_invitee_ids: cancelled_invitee_ids)

      Result.new(success?: true, data: event)
    rescue ActiveRecord::RecordInvalid => e
      failure([ e.message ])
    end

    private

    attr_reader :user, :event, :params, :invitees

    def tracked_values
      {
        "title" => event.title.to_s,
        "description" => event.description.to_s,
        "start_time" => event.start_time,
        "end_time" => event.end_time,
        "location" => event.location.to_s,
        "meet_link" => meeting_link(event),
        "status" => event.status.to_s
      }
    end

    def validate_status_transition!(incoming_status)
      status = incoming_status.to_s.strip.downcase
      return nil if status.blank?
      return nil if status == event.status

      if status == "completed"
        unless event.status == "scheduled"
          return failure([ "Only scheduled events can be marked as completed" ])
        end

        unless event.end_time.present? && event.end_time <= Time.current
          return failure([ "Only past events can be marked as completed" ])
        end

        return nil
      end

      if status == "cancelled"
        unless event.status == "scheduled"
          return failure([ "Only scheduled events can be cancelled" ])
        end

        return nil
      end

      if status == "scheduled"
        unless event.status == "cancelled"
          return failure([ "Only cancelled events can be restored" ])
        end

        unless event.end_time.present? && event.end_time > Time.current
          return failure([ "Only upcoming cancelled events can be restored" ])
        end

        return nil
      end

      failure([ "Unsupported event status transition" ])
    end

    def annotate_reschedule_metadata!
      metadata = event.metadata.is_a?(Hash) ? event.metadata.deep_dup : {}

      if event.saved_change_to_start_time?
        previous_start = event.saved_change_to_start_time.first
        metadata["previous_start_time"] = previous_start&.utc&.iso8601
      end

      metadata["rescheduled"] = true
      event.update!(metadata: metadata)
    end

    def sync_invitees
      normalized = normalize_invitees(invitees)
      target_emails = normalized.map { |entry| entry[:email] }
      added_invitee_ids = []

      existing_invitees = event.event_invitees.index_by(&:email)
      existing_emails = existing_invitees.keys

      to_add = target_emails - existing_emails
      to_remove = existing_emails - target_emails

      normalized.each do |entry|
        next unless to_add.include?(entry[:email])

        result = Invitees::AddInviteeService.new(
          event: event,
          email: entry[:email],
          name: entry[:name],
          notify: false
        ).call

        if result.success?
          added_invitee_ids << result.invitee.id
          next
        end

        event.errors.add(:base, result.error_message)
        raise ActiveRecord::RecordInvalid, event
      end

      to_remove.each do |email|
        invitee = existing_invitees[email]
        next if invitee.blank?

        result = Invitees::RemoveInviteeService.new(user: user, invitee_id: invitee.id).call
        next if result.success?

        event.errors.add(:base, result.error_message)
        raise ActiveRecord::RecordInvalid, event
      end

      added_invitee_ids
    end

    def normalize_invitees(input)
      normalized = Array(input).filter_map do |entry|
        entry_hash = if entry.is_a?(ActionController::Parameters)
          entry.to_unsafe_h
        elsif entry.respond_to?(:to_h)
          entry.to_h
        else
          {}
        end
        email = entry_hash["email"].to_s.strip.downcase
        next if email.blank?

        {
          email: email,
          name: entry_hash["name"].to_s.strip.presence
        }
      end

      normalized.uniq { |entry| entry[:email] }
    end
    def dispatch_notifications(added_invitee_ids:, change_summary:, cancelled_invitee_ids:)
      if cancelled_invitee_ids.any?
        cancelled_invitee_ids.each do |invitee_id|
          InviteeNotificationJob.perform_later(invitee_id: invitee_id, action: :cancel)
        end
        return
      end

      if change_summary.present?
        event.event_invitees.pluck(:id).each do |invitee_id|
          InviteeNotificationJob.perform_later(
            invitee_id: invitee_id,
            action: :update,
            change_summary: change_summary
          )
        end
        return
      end

      added_invitee_ids.each do |invitee_id|
        InviteeNotificationJob.perform_later(invitee_id: invitee_id, action: :invite)
      end
    end

    def notify_event_audience!(change_summary:, cancelled_invitee_ids:)
      kind = cancelled_invitee_ids.any? ? :cancelled : :updated
      Notifications::EventAudienceNotifier.call(
        event: event,
        kind: kind,
        actor: user,
        change_summary: change_summary
      )
    end

    def reset_invitee_statuses!
      now = Time.current
      event.event_invitees.update_all(status: "pending", responded_at: nil, updated_at: now)
    end

    def append_status_change_log!(from_status, to_status)
      metadata = event.metadata.is_a?(Hash) ? event.metadata.deep_dup : {}
      history = Array(metadata["status_history"])

      history << {
        "from" => from_status,
        "to" => to_status,
        "changed_at" => Time.current.utc.iso8601,
        "changed_by_user_id" => user.id
      }

      metadata["status_history"] = history.last(25)
      metadata["status_changed_at"] = Time.current.utc.iso8601
      metadata["status_changed_by_user_id"] = user.id
      event.update!(metadata: metadata)
    end


    def invitees_provided?
      !invitees.nil?
    end

    def meeting_link(event)
      return "" unless event.metadata.is_a?(Hash)

      event.metadata["meeting_link"].to_s
    end

    def build_change_summary(previous_values)
      summary = {}

      TRACKED_FIELDS.each do |field|
        current = serialize_value(event.public_send(field))
        previous = serialize_value(previous_values[field])
        next if previous == current

        summary[field] = { "from" => previous, "to" => current }
      end

      previous_link = serialize_value(previous_values["meet_link"])
      current_link = serialize_value(meeting_link(event))
      if previous_link != current_link
        summary["meeting_link"] = { "from" => previous_link, "to" => current_link }
      end

      summary
    end

    def serialize_value(value)
      return value.utc.iso8601 if value.respond_to?(:utc)

      value.to_s
    end

    def cancel_all_invitees!
      cancelled_ids = []

      event.event_invitees.find_each do |invitee|
        invitee.update!(status: "declined", responded_at: Time.current)
        cancelled_ids << invitee.id
      end

      cancelled_ids
    end

    def failure(errors, details = nil)
      Result.new(
        success?: false,
        errors: errors,
        details: details,
        error_code: "VALIDATION_ERROR"
      )
    end
  end
end
