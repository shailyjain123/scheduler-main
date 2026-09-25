module Api
  module V1
    module Public
      class EventTypesController < Api::BaseController
        skip_before_action :authenticate_user!, only: [ :show ]

        def show
          event_type = EventType.find(params[:id])

          if event_type.is_active == false
            render json: {
              success: false,
              error: { code: "NOT_FOUND", message: "Event type not found" }
            }, status: :not_found
            return
          end

          # Determine guest's timezone (passed in query params or use host's timezone)
          guest_timezone = params[:timezone].presence || event_type.user.timezone.presence || "UTC"

          # Get availability slots for the next 21 days
          slots_service = Slots::PublicAvailabilityService.new(
            event_type: event_type,
            timezone: guest_timezone,
            start_date: params[:start_date] || Date.current,
            end_date: params[:end_date]
          )
          slots_result = slots_service.call

          render json: {
            success: true,
            data: {
              event_type: serialized_event_type(event_type),
              host: serialized_host(event_type.user),
              availability: event_type.availability.presence || AvailabilitySchedulesSerializer.new(event_type.user.availability_schedules).as_weekly_json,
              available_slots: slots_result.available_slots.map { |slot| serialize_slot(slot) },
              booked_times: slots_result.booked_times.map { |bt| serialize_booked_time(bt) },
              event_duration: slots_result.event_duration,
              timezone: slots_result.timezone
            }
          }
        rescue ActiveRecord::RecordNotFound
          render json: {
            success: false,
            error: { code: "NOT_FOUND", message: "Event type not found" }
          }, status: :not_found
        end

        private

        def serialized_event_type(event_type)
          event_type.as_json(only: [ :id, :title, :duration, :location, :description, :is_active, :kind, :max_participants, :created_at ])
        end

        def serialized_host(user)
          {
            id: user.id,
            full_name: user.full_name,
            username: user.username,
            avatar_url: user.avatar_url,
            timezone: user.timezone.presence || "UTC",
            default_buffer_time: user.default_buffer_time.to_i,
            plan_type: user.plan_type
          }
        end

        def serialize_slot(slot)
          {
            date: slot[:date].to_s,
            start_time: slot[:start_time],
            end_time: slot[:end_time],
            label: slot[:label],
            available: slot[:available] != false
          }
        end

        def serialize_booked_time(booked)
          {
            start_time: booked[:start_time].iso8601,
            end_time: booked[:end_time].iso8601,
            event_id: booked[:event_id],
            title: booked[:title]
          }
        end
      end
    end
  end
end
