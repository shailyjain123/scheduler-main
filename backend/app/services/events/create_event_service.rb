require "time"

module Events
  class CreateEventService
    Result = Struct.new(:success?, :data, :errors, :details, :error_code, keyword_init: true)
    InvalidTimestampError = Class.new(StandardError)

    def initialize(user:, params:)
      @user = user
      @params = params
    end

    def call
      normalized_params = normalize_time_params(@params)
      invitees = extract_invitees_from_params(normalized_params)
      event = @user.events.new(normalized_params.merge(event_type: resolve_event_type))
      created_invitee_ids = []

      if google_meet_location?(event.location)
        meet_result = GoogleMeetLinkService.new(user: @user, event: event).call
        unless meet_result.success?
          return Result.new(
            success?: false,
            errors: [ meet_result.error ],
            error_code: "MEETING_LINK_ERROR"
          )
        end

        event.metadata = (event.metadata.is_a?(Hash) ? event.metadata.deep_dup : {})
        event.metadata["meeting_link"] = meet_result.link
      end

      ActiveRecord::Base.transaction do
        unless event.save
          return Result.new(
            success?: false,
            errors: event.errors.full_messages,
            details: event.errors.as_json,
            error_code: "VALIDATION_ERROR"
          )
        end

        created_invitee_ids = add_initial_invitees(event, invitees)

        # Schedule reminders based on user settings
        Events::ScheduleRemindersService.new(event: event).call

        # Note: Future logic for background sync with Google/Microsoft goes here
        # CalendarSyncJob.perform_later(event_id: event.id, action: :create_event)
      end

      created_invitee_ids.each do |invitee_id|
        InviteeNotificationJob.perform_later(invitee_id: invitee_id, action: :invite)
      end

      Notifications::EventAudienceNotifier.call(
        event: event,
        kind: :created,
        actor: @user
      )

      Result.new(success?: true, data: event)
    rescue InvalidTimestampError => e
      Result.new(
        success?: false,
        errors: [ e.message ],
        details: { start_time: [ e.message ] },
        error_code: "VALIDATION_ERROR"
      )
    rescue ActiveRecord::RecordInvalid => e
      Result.new(
        success?: false,
        errors: [ e.record.errors.full_messages.to_sentence.presence || e.message ],
        details: e.record.errors.as_json,
        error_code: "VALIDATION_ERROR"
      )
    end

    private

    def google_meet_location?(location)
      location.to_s.downcase.include?("google meet") || location.to_s.downcase.include?("meet.google.com")
    end

    def normalize_time_params(raw_params)
      params = raw_params.to_h.deep_dup.with_indifferent_access
      params.delete(:event_type_id)
      metadata = params[:metadata].is_a?(Hash) ? params[:metadata].with_indifferent_access : {}.with_indifferent_access

      params[:start_time] = parse_event_timestamp(params[:start_time], metadata)
      params[:end_time] = parse_event_timestamp(params[:end_time], metadata)

      params
    end

    def parse_event_timestamp(value, metadata)
      return value if value.blank?
      return value.utc if value.respond_to?(:utc)

      string_value = value.to_s.strip
      event_timezone = metadata[:event_timezone].to_s.strip.presence || @user.timezone.presence || Time.zone.tzinfo.name

      return Time.iso8601(string_value).utc if string_value.match?(/(Z|[+-]\d{2}:\d{2})\z/)

      if string_value.match?(/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?\z/)
        zone = ActiveSupport::TimeZone[event_timezone]
        raise InvalidTimestampError, "Invalid timezone '#{event_timezone}' for event time" if zone.nil?

        format = string_value.length == 16 ? "%Y-%m-%dT%H:%M" : "%Y-%m-%dT%H:%M:%S"
        return zone.strptime(string_value, format).utc
      end

      raise InvalidTimestampError, "Invalid event time format. Use ISO 8601 (e.g. 2026-04-07T19:00:00+05:30)."
    rescue ArgumentError
      raise InvalidTimestampError, "Invalid event time format. Use ISO 8601 (e.g. 2026-04-07T19:00:00+05:30)."
    end

    def resolve_event_type
      @user.event_types.order(created_at: :asc).first || @user.event_types.create!(
        title: "General Meeting",
        duration: 60,
        location: "Custom",
        description: "System generated default event type",
        is_active: true
      )
    end

    def add_initial_invitees(event, invitees)
      created_ids = []

      normalize_invitees(invitees).each do |entry|
        result = Invitees::AddInviteeService.new(
          event: event,
          email: entry[:email],
          name: entry[:name],
          notify: false
        ).call

        if result.success?
          created_ids << result.invitee.id
          next
        end

        event.errors.add(:base, result.error_message)
        raise ActiveRecord::RecordInvalid, event
      end

      created_ids
    end

    def normalize_invitees(input)
      normalized = Array(input).filter_map do |entry|
        if entry.is_a?(String)
          email = entry.to_s.strip.downcase
          next if email.blank?

          { email: email, name: nil }
        else
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
      end

      normalized.uniq { |entry| entry[:email] }
    end

    def extract_invitees_from_params(normalized_params)
      explicit_invitees = normalized_params.delete(:invitees)
      return explicit_invitees if explicit_invitees.present?

      metadata = normalized_params[:metadata]
      return [] unless metadata.is_a?(Hash)

      metadata_attendees = metadata["attendees"] || metadata[:attendees]
      Array(metadata_attendees)
    end
  end
end
