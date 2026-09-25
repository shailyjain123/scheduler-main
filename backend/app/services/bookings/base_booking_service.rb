require "time"

module Bookings
  class BaseBookingService
    Result = Struct.new(:success?, :data, :errors, :details, :error_code, :type, keyword_init: true)
    InvalidTimestampError = Class.new(StandardError)

    def initialize(event_type:, params:)
      @event_type = event_type
      @host = event_type.user
      @params = params
    end

    private

    attr_reader :event_type, :host, :params

    def normalize_guest_name
      params[:guest_name].to_s.strip
    end

    def normalize_guest_email
      params[:guest_email].to_s.strip.downcase
    end

    def normalize_notes
      params[:notes].to_s.strip
    end

    def normalize_timezone
      params[:timezone].to_s.strip.presence || host.timezone.presence || "UTC"
    end

    def validation_errors_for_guest(guest_name:, guest_email:, requires_start_time: true)
      errors = []
      errors << "Guest name is required" if guest_name.blank?
      errors << "Guest email is required" if guest_email.blank?
      errors << "Guest email is invalid" if guest_email.present? && !URI::MailTo::EMAIL_REGEXP.match?(guest_email)
      errors << "Start time is required" if requires_start_time && params[:start_time].blank?
      errors
    end

    def parse_event_timestamp(value, timezone)
      return value if value.respond_to?(:utc)

      string_value = value.to_s.strip
      return Time.iso8601(string_value).utc if string_value.match?(/(Z|[+-]\d{2}:\d{2})\z/)

      if string_value.match?(/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?\z/)
        zone = ActiveSupport::TimeZone[timezone]
        raise InvalidTimestampError, "Invalid timezone '#{timezone}' for event time" if zone.nil?

        format = string_value.length == 16 ? "%Y-%m-%dT%H:%M" : "%Y-%m-%dT%H:%M:%S"
        return zone.strptime(string_value, format).utc
      end

      raise InvalidTimestampError, "Invalid event time format. Use ISO 8601 (e.g. 2026-04-07T19:00:00+05:30)."
    rescue ArgumentError
      raise InvalidTimestampError, "Invalid event time format. Use ISO 8601 (e.g. 2026-04-07T19:00:00+05:30)."
    end

    def slot_available?(start_time, timezone)
      end_time = start_time + event_type.duration.minutes
      
      # 1. Check if it's within availability schedules (Business Hours)
      # We still use the probe event for this as it contains the complex schedule logic
      probe_event = booking_probe_event(
        start_time: start_time,
        end_time: end_time,
        guest_name: "Probe",
        guest_email: "probe@example.com",
        notes: nil,
        timezone: timezone,
        source: "availability_check"
      )
      
      probe_event.validate
      return false if probe_event.errors.any? { |e| e.include?("outside your availability") }

      # 2. Check for overlaps in DB (Events)
      blocked = Bookings::AvailabilityService.blocked_ranges(host.id)
      
      setting = host.user_setting
      new_buffer_before = setting&.buffer_before.to_i
      new_buffer_after = setting&.buffer_after.to_i
      
      blocked.none? do |range|
        range_start = Time.parse(range[:start].to_s).utc
        range_end = Time.parse(range[:end].to_s).utc
        range_buffer_before = range[:buffer_before].to_i
        range_buffer_after = range[:buffer_after].to_i
        
        # Precise Buffered Overlap Formula:
        # A new slot (S, E) with buffers (NB, NA) overlaps with (BS, BE) with buffers (BB, BA) if:
        # (S < BE + BA + NB) AND (E > BS - BB - NA)
        overlap_start = range_start - range_buffer_before.minutes - new_buffer_after.minutes
        overlap_end = range_end + range_buffer_after.minutes + new_buffer_before.minutes
        
        start_time < overlap_end && end_time > overlap_start
      end
    end

    def build_event(guest_name:, guest_email:, notes:, start_time:, timezone:)
      setting = host.user_setting
      
      event = host.events.new(
        event_type: event_type,
        title: event_type.title,
        description: notes.presence || event_type.description,
        location: event_type.location,
        start_time: start_time,
        end_time: start_time + event_type.duration.minutes,
        status: "scheduled",
        buffer_before_minutes: setting&.buffer_before.to_i,
        buffer_after_minutes: setting&.buffer_after.to_i,
        event_source: "guest_booking",
        metadata: {
          "booking_source" => "public_booking",
          "event_timezone" => timezone,
          "guest_name" => guest_name,
          "guest_email" => guest_email,
          "guest_notes" => notes.presence,
          "attendees" => [{ "name" => guest_name, "email" => guest_email }]
        }.compact
      )

      if google_meet_location?(event.location)
        meet_result = Events::GoogleMeetLinkService.new(user: host, event: event).call
        if meet_result.success?
          event.metadata["meeting_link"] = meet_result.link
        end
      end

      Result.new(success?: true, data: event)
    end

    def add_invitee!(event:, guest_email:, guest_name:)
      Invitees::AddInviteeService.new(
        event: event,
        email: guest_email,
        name: guest_name,
        notify: true,
        notification_action: :invite
      ).call
    end

    def failure(messages, error_code: "VALIDATION_ERROR", details: nil)
      Result.new(
        success?: false,
        errors: Array(messages),
        details: details || { base: Array(messages) },
        error_code: error_code
      )
    end

    def google_meet_location?(location)
      location.to_s.downcase.include?("google meet") || location.to_s.downcase.include?("meet.google.com")
    end

    def unavailable_slot_error(start_time, end_time, guest_name, notes)
      "Selected time is no longer available. Please choose another slot."
    end

    def booking_probe_event(start_time:, end_time:, guest_name:, guest_email:, notes:, timezone:, source:)
      host.events.new(
        event_type: event_type,
        title: event_type.title,
        start_time: start_time,
        end_time: end_time,
        status: "scheduled",
        metadata: { "booking_source" => source }
      )
    end
  end
end
