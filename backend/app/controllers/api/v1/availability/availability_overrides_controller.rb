module Api
  module V1
    module Availability
      class AvailabilityOverridesController < BaseController
        def index
          overrides = current_user.availability_overrides.order(:date, :start_time)
          if params[:month].present?
            month_date = Date.parse("#{params[:month]}-01")
            overrides = overrides.where(date: month_date.beginning_of_month..month_date.end_of_month)
          end

          render json: {
            success: true,
            data: overrides.map { |override| AvailabilityOverrideSerializer.new(override).as_json }
          }, status: :ok
        rescue ArgumentError
          render json: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid month filter",
              details: { month: [ "is invalid" ] }
            }
          }, status: :unprocessable_entity
        end

        def create
          override = current_user.availability_overrides.new(override_params)

          if override.save
            render json: {
              success: true,
              data: AvailabilityOverrideSerializer.new(override).as_json
            }, status: :created
          else
            render json: {
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: "Failed to create availability override",
                details: override.errors.to_hash(true)
              }
            }, status: :unprocessable_entity
          end
        end

        def update
          override = current_user.availability_overrides.find(params[:id])

          if override.update(override_params)
            render json: {
              success: true,
              data: AvailabilityOverrideSerializer.new(override).as_json
            }, status: :ok
          else
            render json: {
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: "Failed to update availability override",
                details: override.errors.to_hash(true)
              }
            }, status: :unprocessable_entity
          end
        end

        def destroy
          override = current_user.availability_overrides.find(params[:id])
          override.destroy
          head :no_content
        end

        private

        def override_params
          tz = params.dig(:override, :timezone) || current_user.timezone || "UTC"
          params.require(:override).permit(:date, :start_time, :end_time, :is_unavailable, :reason, :timezone).merge(timezone: tz)
        end
      end
    end
  end
end
