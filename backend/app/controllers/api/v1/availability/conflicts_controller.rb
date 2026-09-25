module Api
  module V1
    module Availability
      class ConflictsController < BaseController
        before_action :authenticate_user!

        def index
          date = params[:date]
          start_time = params[:start_time]
          end_time = params[:end_time]

          if date.blank?
            return render json: { success: false, error: "Date is required" }, status: :bad_request
          end

          # If start_time and end_time are blank, we check the entire day
          if start_time.present? && end_time.present?
            # Check for overlapping events on this date and time range
            # We assume events are stored in UTC or user's timezone.
            # For simplicity, we compare the date and the time overlap.

            # Convert date + time to range
            zone = ActiveSupport::TimeZone[current_user.timezone.presence || "UTC"] || ActiveSupport::TimeZone["UTC"]
            query_start = zone.parse("#{date} #{start_time}")
            query_end = zone.parse("#{date} #{end_time}")

            conflicts = Event.where(status: "scheduled")
              .where("(events.user_id = :user_id OR EXISTS (SELECT 1 FROM event_invitees WHERE event_invitees.event_id = events.id AND event_invitees.user_id = :user_id))", user_id: current_user.id)
              .where("start_time < ? AND end_time > ?", query_end, query_start)
          else
            # Check for any scheduled events on this date
            zone = ActiveSupport::TimeZone[current_user.timezone.presence || "UTC"] || ActiveSupport::TimeZone["UTC"]
            day_start = zone.parse(date).beginning_of_day
            day_end = zone.parse(date).end_of_day

            conflicts = Event.where(status: "scheduled")
              .where("(events.user_id = :user_id OR EXISTS (SELECT 1 FROM event_invitees WHERE event_invitees.event_id = events.id AND event_invitees.user_id = :user_id))", user_id: current_user.id)
              .where("start_time < ? AND end_time > ?", day_end, day_start)
          end

          render json: {
            success: true,
            data: {
              conflicts_count: conflicts.count,
              conflicts: conflicts.map { |e| { id: e.id, title: e.title, start_time: e.start_time, end_time: e.end_time } }
            }
          }
        end
      end
    end
  end
end
