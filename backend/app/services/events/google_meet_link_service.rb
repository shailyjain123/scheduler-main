require "net/http"
require "uri"
require "json"

module Events
  class GoogleMeetLinkService
    Result = Struct.new(:success?, :link, :error, keyword_init: true)

    TOKEN_REFRESH_URL = "https://oauth2.googleapis.com/token".freeze
    CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1".freeze
    REQUIRED_SCOPES = %w[
      https://www.googleapis.com/auth/calendar.events
      https://www.googleapis.com/auth/calendar
    ].freeze

    def initialize(user:, event:)
      @user = user
      @event = event
    end

    def call
      identity = user.external_identities.find_by(provider: "google_oauth2")
      return Result.new(success?: false, error: "Google account is not connected") if identity.blank?

      unless sufficient_scope?(identity.scopes)
        return Result.new(
          success?: false,
          error: "Google Calendar permission is missing. Please reconnect Google Meet integration and allow calendar access."
        )
      end

      token = ensure_valid_access_token(identity)
      if token.blank?
        return Result.new(success?: false, error: reconnect_google_message)
      end

      response = create_calendar_event_with_meet(token)

      if response.code.to_i == 401
        token = refresh_access_token(identity)
        return Result.new(success?: false, error: reconnect_google_message) if token.blank?

        response = create_calendar_event_with_meet(token)
      end

      if response.code.to_i == 401
        return Result.new(success?: false, error: reconnect_google_message)
      end

      if response.code.to_i == 403 && insufficient_scope_response?(response.body)
        return Result.new(
          success?: false,
          error: "Google token scope is insufficient. Reconnect Google Meet and grant calendar permission, then create the event again."
        )
      end

      return Result.new(success?: false, error: "Google Meet creation failed (#{response.code})") unless response.code.to_i.between?(200, 299)

      body = JSON.parse(response.body)
      meeting_link = extract_meet_link(body)
      return Result.new(success?: false, error: "Google Meet link missing in API response") if meeting_link.blank?

      Result.new(success?: true, link: meeting_link)
    rescue JSON::ParserError
      Result.new(success?: false, error: "Invalid response from Google Meet API")
    rescue StandardError => e
      Rails.logger.error("[Events::GoogleMeetLinkService] #{e.class}: #{e.message}")
      Result.new(success?: false, error: "Unable to create Google Meet link")
    end

    private

    attr_reader :user, :event

    def ensure_valid_access_token(identity)
      return refresh_access_token(identity) if identity.expires_at.present? && identity.expires_at <= 60.seconds.from_now

      identity.access_token.to_s.presence
    end

    def refresh_access_token(identity)
      return nil if identity.refresh_token.blank?

      params = {
        client_id: ENV["GOOGLE_CLIENT_ID"],
        client_secret: ENV["GOOGLE_CLIENT_SECRET"],
        refresh_token: identity.refresh_token,
        grant_type: "refresh_token"
      }

      uri = URI.parse(TOKEN_REFRESH_URL)
      request = Net::HTTP::Post.new(uri)
      request.set_form_data(params)

      response = perform_http(uri, request)
      unless response.code.to_i.between?(200, 299)
        Rails.logger.warn("[Events::GoogleMeetLinkService] Refresh token rejected (status=#{response.code})")
        return nil
      end

      body = JSON.parse(response.body)
      new_token = body["access_token"].to_s
      return nil if new_token.blank?

      expires_in = body["expires_in"].to_i
      identity.update(
        access_token: new_token,
        expires_at: expires_in.positive? ? Time.current + expires_in.seconds : identity.expires_at
      )

      new_token
    rescue JSON::ParserError
      nil
    end

    def reconnect_google_message
      "Google authorization has expired or was revoked. Please reconnect Google and try again."
    end

    def create_calendar_event_with_meet(access_token)
      uri = URI.parse(CALENDAR_EVENTS_URL)
      request = Net::HTTP::Post.new(uri)
      request["Authorization"] = "Bearer #{access_token}"
      request["Content-Type"] = "application/json"
      log_time_debug_values
      request.body = JSON.generate(calendar_event_payload)

      perform_http(uri, request)
    end

    def calendar_event_payload
      zone = meeting_time_zone
      start_local = event_datetime_for_google("event_local_start", event.start_time, zone)
      end_local = event_datetime_for_google("event_local_end", event.end_time, zone)

      {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: start_local,
          timeZone: zone
        },
        end: {
          dateTime: end_local,
          timeZone: zone
        },
        conferenceData: {
          createRequest: {
            requestId: SecureRandom.uuid,
            conferenceSolutionKey: {
              type: "hangoutsMeet"
            }
          }
        }
      }
    end

    def meeting_time_zone
      # Prefer per-event timezone if provided; fallback to user's timezone, then UTC.
      event_timezone = event.metadata.is_a?(Hash) ? event.metadata["event_timezone"].to_s.strip : ""
      timezone_name = event_timezone.presence || user.timezone.presence || Time.zone.tzinfo.name

      # Return plain IANA timezone string directly for Google API payload.
      ActiveSupport::TimeZone[timezone_name]&.tzinfo&.name || "UTC"
    end

    def metadata_local_datetime(key)
      return nil unless event.metadata.is_a?(Hash)

      value = event.metadata[key].to_s.strip
      return nil if value.blank?

      # Expected format: YYYY-MM-DDTHH:MM:SS (no offset), interpreted with provided timeZone.
      return value if value.match?(/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?\z/)

      nil
    end

    def event_datetime_for_google(metadata_key, time_value, timezone_name)
      local_value = metadata_local_datetime(metadata_key)
      zone = ActiveSupport::TimeZone[timezone_name] || ActiveSupport::TimeZone["UTC"]

      if local_value.present?
        format = local_value.length == 16 ? "%Y-%m-%dT%H:%M" : "%Y-%m-%dT%H:%M:%S"
        return zone.strptime(local_value, format).iso8601
      end

      time_value.in_time_zone(zone).iso8601
    end

    def log_time_debug_values
      zone = meeting_time_zone

      Rails.logger.info("[Events::GoogleMeetLinkService] start_time=#{event.start_time}")
      Rails.logger.info("[Events::GoogleMeetLinkService] start_time_utc=#{event.start_time&.utc}")
      Rails.logger.info("[Events::GoogleMeetLinkService] start_time_#{zone}=#{event.start_time&.in_time_zone(zone)}")
    end

    def extract_meet_link(body)
      entry_points = body.dig("conferenceData", "entryPoints")
      uri_link = Array(entry_points).find { |entry| entry["entryPointType"] == "video" }&.dig("uri").to_s
      return uri_link if uri_link.present?

      body["hangoutLink"].to_s.presence
    end

    def perform_http(uri, request)
      Net::HTTP.start(uri.host, uri.port, use_ssl: true, read_timeout: 15, open_timeout: 10) do |http|
        http.request(request)
      end
    end

    def sufficient_scope?(scopes)
      granted_scopes = Array(scopes).map(&:to_s)
      granted_scopes.any? { |scope| REQUIRED_SCOPES.include?(scope) }
    end

    def insufficient_scope_response?(response_body)
      parsed = JSON.parse(response_body)
      details = parsed.dig("error", "details")
      return false unless details.is_a?(Array)

      details.any? { |detail| detail.is_a?(Hash) && detail["reason"] == "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }
    rescue JSON::ParserError
      false
    end
  end
end
