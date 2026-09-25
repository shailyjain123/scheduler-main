module Api
  module V1
    class EventTypesController < Api::BaseController
      before_action :set_event_type, only: [ :show, :update, :destroy ]

      # GET /api/v1/event_types
      def index
        event_types = current_user.event_types.includes(:events).order(created_at: :desc)
        event_types_with_stats = event_types.map do |et|
          et.as_json(only: [ :id, :title, :duration, :location, :description, :availability, :is_active, :kind, :max_participants, :created_at ])
            .merge(
              bookings_count: et.bookings_count,
              conversion_rate: et.conversion_rate,
              revenue: et.revenue,
              canceled_count: et.canceled_count,
              upcoming_count: et.upcoming_count
            )
        end
        render json: {
          success: true,
          data: {
            event_types: event_types_with_stats
          }
        }
      end

      # GET /api/v1/event_types/:id
      def show
        event_type_with_stats = @event_type.as_json(only: [ :id, :title, :duration, :location, :description, :availability, :is_active, :kind, :max_participants, :created_at ])
          .merge(
            bookings_count: @event_type.bookings_count,
            conversion_rate: @event_type.conversion_rate,
            revenue: @event_type.revenue,
            canceled_count: @event_type.canceled_count,
            upcoming_count: @event_type.upcoming_count
          )
        render json: {
          success: true,
          data: { event_type: event_type_with_stats }
        }
      end

      # POST /api/v1/event_types
      def create
        event_type = current_user.event_types.build(event_type_params)
        if event_type.save
          event_type_with_stats = event_type.as_json(only: [ :id, :title, :duration, :location, :description, :availability, :is_active, :kind, :max_participants, :created_at ])
            .merge(
              bookings_count: event_type.bookings_count,
              conversion_rate: event_type.conversion_rate,
              revenue: event_type.revenue,
              canceled_count: event_type.canceled_count,
              upcoming_count: event_type.upcoming_count
            )
          render json: {
            success: true,
            data: { event_type: event_type_with_stats },
            message: "Event type created"
          }
        else
          render json: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: event_type.errors.full_messages.to_sentence
            }
          }, status: 422
        end
      end

      # PATCH/PUT /api/v1/event_types/:id
      def update
        if @event_type.update(event_type_params)
          event_type_with_stats = @event_type.as_json(only: [ :id, :title, :duration, :location, :description, :availability, :is_active, :kind, :max_participants, :created_at ])
            .merge(
              bookings_count: @event_type.bookings_count,
              conversion_rate: @event_type.conversion_rate,
              revenue: @event_type.revenue,
              canceled_count: @event_type.canceled_count,
              upcoming_count: @event_type.upcoming_count
            )
          render json: {
            success: true,
            data: { event_type: event_type_with_stats },
            message: "Event type updated"
          }
        else
          render json: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: @event_type.errors.full_messages.to_sentence
            }
          }, status: 422
        end
      end

      # DELETE /api/v1/event_types/:id
      def destroy
        @event_type.destroy
        render json: {
          success: true,
          message: "Event type deleted"
        }
      end

      private

      def set_event_type
        @event_type = current_user.event_types.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: {
          success: false,
          error: { code: "NOT_FOUND", message: "Event type not found" }
        }, status: 404
      end

      def event_type_params
        # Permit scalar fields as well as the nested JSON structure for availability slots
        params.require(:event_type).permit(
          :title, :duration, :location, :description, :is_active, :kind, :max_participants,
          availability: {}
        )
      end
    end
  end
end
