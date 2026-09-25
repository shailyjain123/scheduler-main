require "time"

module Api
  module V1
    class EventsController < Api::BaseController
      def index
        # Fetch events where the current user is either the host or a participant (invitee)
        events = Event.preload(:user, :event_invitees)
                      .where(user: current_user)
                      .or(Event.where(id: EventInvitee.where(user: current_user).select(:event_id)))
                      .order(start_time: :asc)

        if params[:from].present?
          from_time = parse_filter_time(params[:from])
          return if performed?

          events = events.where("start_time >= ?", from_time)
        end

        if params[:to].present?
          to_time = parse_filter_time(params[:to])
          return if performed?

          events = events.where("start_time <= ?", to_time)
        end

        page = pagination_page
        per_page = pagination_per_page
        total_count = events.count
        events = events.offset((page - 1) * per_page).limit(per_page)
        serialized_events = events.map { |event| EventSerializer.new(event).as_json }

        render json: {
          success: true,
          data: serialized_events,
          pagination: {
            page: page,
            per_page: per_page,
            total_count: total_count,
            total_pages: (total_count.to_f / per_page).ceil
          }
        }
      end

      def create
        result = Events::CreateEventService.new(user: current_user, params: event_params).call

        if result.success?
          render json: {
            success: true,
            data: EventSerializer.new(result.data).as_json
          }, status: :created
        else
          render json: {
            success: false,
            error: {
              code: result.error_code || "VALIDATION_ERROR",
              message: result.errors.to_sentence,
              details: result.details
            }
          }, status: :unprocessable_entity
        end
      end

      def update
        event = current_user.events.find(params[:id])
        normalized_params = normalize_event_time_params(event_params)

        if @event_time_parse_error.present?
          render json: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: @event_time_parse_error
            }
          }, status: :unprocessable_entity
          return
        end

        result = Events::UpdateEventService.new(
          user: current_user,
          event: event,
          params: normalized_params,
          invitees: invitees_param
        ).call

        if result.success?
          render json: {
            success: true,
            data: EventSerializer.new(result.data).as_json
          }
        else
          render json: {
            success: false,
            error: {
              code: result.error_code || "VALIDATION_ERROR",
              message: result.errors.to_sentence
            }
          }, status: :unprocessable_entity
        end
      end

      def destroy
        event = current_user.events.find(params[:id])
        result = Events::DeleteEventService.new(user: current_user, event: event).call

        unless result.success?
          render json: {
            success: false,
            error: {
              code: result.error_code || "VALIDATION_ERROR",
              message: result.errors.to_sentence
            }
          }, status: :unprocessable_entity
          return
        end

        render json: {
          success: true,
          message: "Event cancelled successfully"
        }
      end

      private

      def event_params
        permitted = params.require(:event).permit(
          :title, :description, :location,
          :start_time, :end_time, :status,
          invitees: %i[email name],
          attendees: %i[name email avatar],
          metadata: {}
        )

        incoming_metadata = permitted[:metadata].is_a?(ActionController::Parameters) ? permitted[:metadata].to_unsafe_h : (permitted[:metadata] || {})
        base_metadata = current_event&.metadata.is_a?(Hash) ? current_event.metadata.deep_dup : {}
        metadata = base_metadata.merge(incoming_metadata)

        attendees = permitted.delete(:attendees)
        if attendees.present?
          normalized_attendees = Array(attendees).filter_map do |attendee|
            attendee_hash = attendee.is_a?(ActionController::Parameters) ? attendee.to_unsafe_h : attendee
            email = attendee_hash["email"].to_s.strip
            next if email.blank?

            {
              "name" => attendee_hash["name"].to_s.strip.presence || email.split("@").first,
              "email" => email
            }
          end

          metadata["attendees"] = normalized_attendees if normalized_attendees.any?
        end

        status = permitted[:status].to_s.strip.downcase

        if status == "cancelled"
          metadata.delete("meeting_link")
          metadata.delete("conference_link")
          metadata.delete("join_url")
        else
          lock_existing_meeting_link!(metadata)
        end

        permitted[:metadata] = metadata
        permitted
      end

      def invitees_param
        invitees = params.dig(:event, :invitees)
        attendees = params.dig(:event, :attendees)

        source = if invitees.present?
          invitees
        elsif attendees.present?
          attendees
        else
          nil
        end
        return nil if source.nil?

        Array(source)
      end

      def current_event
        @current_event ||= params[:id].present? ? current_user.events.find_by(id: params[:id]) : nil
      end

      def lock_existing_meeting_link!(metadata)
        return if current_event.blank?
        return unless current_event.metadata.is_a?(Hash)

        existing_link = current_event.metadata["meeting_link"].to_s.strip
        metadata["meeting_link"] = existing_link if existing_link.present?
      end

      def normalize_event_time_params(raw_params)
        params = raw_params.to_h.deep_dup.with_indifferent_access
        metadata = params[:metadata].is_a?(Hash) ? params[:metadata].with_indifferent_access : {}.with_indifferent_access

        if params[:start_time].present?
          params[:start_time] = parse_event_timestamp(params[:start_time], metadata)
        end

        if params[:end_time].present?
          params[:end_time] = parse_event_timestamp(params[:end_time], metadata)
        end

        params
      rescue ArgumentError
        @event_time_parse_error = "Invalid event time format. Use ISO 8601 (e.g. 2026-04-07T19:00:00+05:30)."
        raw_params
      end

      def parse_event_timestamp(value, metadata)
        return value.utc if value.respond_to?(:utc)

        string_value = value.to_s.strip
        event_timezone = metadata[:event_timezone].to_s.strip.presence || current_user.timezone.presence || Time.zone.tzinfo.name

        return Time.iso8601(string_value).utc if string_value.match?(/(Z|[+-]\d{2}:\d{2})\z/)

        if string_value.match?(/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?\z/)
          zone = ActiveSupport::TimeZone[event_timezone]
          raise ArgumentError if zone.nil?

          format = string_value.length == 16 ? "%Y-%m-%dT%H:%M" : "%Y-%m-%dT%H:%M:%S"
          return zone.strptime(string_value, format).utc
        end

        raise ArgumentError
      end

      def parse_filter_time(value)
        Time.iso8601(value.to_s)
      rescue ArgumentError
        render json: {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid datetime filter: #{value}. Use ISO 8601 format."
          }
        }, status: :unprocessable_entity
        nil
      end

      def pagination_page
        page = params[:page].to_i
        page.positive? ? page : 1
      end

      def pagination_per_page
        per_page = params[:per_page].to_i
        return 25 if per_page <= 0

        [ per_page, 100 ].min
      end
    end
  end
end
