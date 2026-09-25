module Api
  module V1
    module Public
      class BookingsManagementController < Api::BaseController
        skip_before_action :authenticate_user!
        before_action :set_invitee

        def show
          render json: {
            success: true,
            data: {
              id: @event.id,
              uid: @event.booking_uid,
              title: @event.title,
              description: @event.description,
              start_time: @event.start_time.utc.iso8601,
              end_time: @event.end_time.utc.iso8601,
              location: @event.location,
              status: @event.status,
              host_name: @host.full_name,
              guest_name: @event.metadata["guest_name"],
              guest_email: @event.metadata["guest_email"],
              event_type: {
                id: @event_type.id,
                title: @event_type.title,
                duration: @event_type.duration
              }
            }
          }
        end

        def cancel
          reason = params[:reason]

          result = Bookings::CancelBookingService.new(
            event: @event,
            reason: reason,
            managed_by_attendee: true
          ).call

          if result.success?
            render json: { success: true, message: "Booking cancelled successfully" }
          else
            render json: { success: false, error: result.errors.to_sentence }, status: :unprocessable_entity
          end
        end

        def reschedule
          new_start_time = params[:start_time]
          timezone = params[:timezone] || "UTC"

          if new_start_time.blank?
            return render json: { success: false, error: "New start time is required" }, status: :unprocessable_entity
          end

          result = Bookings::PublicRescheduleService.new(
            event: @event,
            new_start_time: new_start_time,
            timezone: timezone
          ).call

          if result.success?
            render json: { 
              success: true, 
              data: {
                id: result.data.id,
                uid: result.data.booking_uid,
                token: result.data.management_token # Send back new token for the new booking
              }
            }
          else
            render json: { 
              success: false, 
              error: result.errors.to_sentence,
              code: result.error_code 
            }, status: :unprocessable_entity
          end
        end

        private

        def set_invitee
          # Support both unified token flow and legacy uid+token flow
          @event = if params[:token].present?
            Event.find_by_management_link(params[:token])
          else
            Event.find_by_management_link(params[:booking_uid], params[:legacy_token] || params[:token])
          end
          
          if @event.nil?
            return render json: { success: false, error: "Invalid or expired management link" }, status: :forbidden
          end

          @host = @event.user
          @event_type = @event.event_type
          @event.update_columns(last_management_access_at: Time.current)
        end
      end
    end
  end
end
