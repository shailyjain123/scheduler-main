
require "digest"

module Api
  module V1
    module Public
      class BookingsController < Api::BaseController
        skip_before_action :authenticate_user!, only: [ :create, :verify, :validate_email ]
        before_action :set_event_type, only: [ :create, :verify ]

        def create
          # Use an idempotency key based on the booking details if not provided
          # This prevents duplicate submissions in the same minute for the same user
          idempotency_key = params[:idempotency_key].presence ||
                           Digest::SHA256.hexdigest([
                             @event_type.id,
                             params[:booking][:guest_email],
                             params[:booking][:start_time],
                             params[:booking][:timezone]
                           ].join("-"))

          result = Bookings::CreateBookingService.new(
            event_type: @event_type,
            params: booking_params.to_h.merge(client_context).merge(idempotency_key: idempotency_key)
          ).call

          if result.success?
            if result.type == "seamless"
              render_seamless_success(result.data)
            else
              render_verify_required(result.data)
            end
          else
            render_error(result)
          end
        end

        def verify
          result = Bookings::VerifyBookingService.new(
            event_type: @event_type,
            params: verification_params.to_h.merge(client_context)
          ).call

          if result.success?
            render json: {
              success: true,
              type: "confirmed",
              data: {
                booking: EventSerializer.new(result.data).as_json,
                guest: {
                  name: result.data.metadata&.dig("guest_name"),
                  email: result.data.metadata&.dig("guest_email")
                }
              },
              message: "Booking confirmed"
            }, status: :created
          else
            render_error(result)
          end
        end

        def validate_email
          email = params[:email].to_s.strip
          if email.blank?
            return render json: { valid: false, message: "Email is required" }, status: :unprocessable_entity
          end

          # Identify host safely
          host = if params[:event_type_id]
            EventType.find_by(id: params[:event_type_id])&.user
          end

          if host.nil?
             return render json: { success: false, error: { code: "HOST_NOT_FOUND", message: "System is not ready" } }, status: :service_unavailable
          end

          # SKIP validation for free plans
          if host.plan_type == 'free'
            return render json: {
              success: true,
              data: {
                valid: true,
                message: "Basic validation passed",
                classification: "Deliverable"
              }
            }
          end

          result = Bookings::EmailValidationService.new(email: email, host: host).call
          
          render json: {
            success: true,
            data: {
              valid: result.valid?,
              message: result.message,
              classification: result.classification
            }
          }
        end

        private

        def render_seamless_success(event)
          render json: {
            success: true,
            data: {
              type: "seamless",
              booking: EventSerializer.new(event).as_json,
              guest: {
                name: event.metadata&.dig("guest_name"),
                email: event.metadata&.dig("guest_email")
              }
            },
            message: "Booking confirmed immediately"
          }, status: :created
        end

        def render_verify_required(request)
          render json: {
            success: true,
            data: {
              type: "verify",
              verification_required: true,
              booking_request_id: request.id,
              guest: {
                name: request.guest_name,
                email: request.guest_email
              }
            },
            message: "Verification code sent to your email"
          }, status: :accepted
        end

        def render_error(result)
          render json: {
            success: false,
            error: {
              code: result.error_code || "VALIDATION_ERROR",
              message: result.errors.to_sentence,
              details: result.details
            }
          }, status: error_status_for(result)
        end

        def set_event_type
          @event_type = EventType.includes(user: :availability_schedules).find(params[:event_type_id])
          return if @event_type.is_active != false

          render json: { success: false, error: { code: "NOT_FOUND", message: "Event type not found" } }, status: :not_found
        rescue ActiveRecord::RecordNotFound
          render json: { success: false, error: { code: "NOT_FOUND", message: "Event type not found" } }, status: :not_found
        end

        def booking_params
          params.require(:booking).permit(:guest_name, :guest_email, :notes, :start_time, :timezone)
        end

        def verification_params
          params.require(:booking).permit(:booking_request_id, :verification_code)
        end

        def client_context
          {
            client_ip: client_ip,
            user_agent: request.user_agent
          }
        end

        def client_ip
          request.headers["CF-Connecting-IP"].presence || request.remote_ip.to_s
        end

        def error_status_for(result)
          case result.error_code
          when "LOCKED" then :forbidden
          when "SLOT_TAKEN" then :conflict
          when "EMAIL_INVALID", "EXPIRED" then :unprocessable_entity
          else :unprocessable_entity
          end
        end
      end
    end
  end
end
