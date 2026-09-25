module Api
  module V1
    class OnboardingController < Api::BaseController
      # POST /api/v1/onboarding/profile
      def profile
        if profile_params[:full_name].blank? || profile_params[:username].blank?
          return render json: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Full name and username are required",
              details: {
                full_name: profile_params[:full_name].blank? ? [ "is required" ] : [],
                username: profile_params[:username].blank? ? [ "is required" ] : []
              }.reject { |_, v| v.empty? }
            }
          }, status: :unprocessable_entity
        end

        if current_user.update(profile_params.merge(onboarding_stage: 2))
          render json: {
            success: true,
            data: { user: UserSerializer.new(current_user).as_json },
            message: "Profile setup saved"
          }
        else
          render json: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Validation failed: #{current_user.errors.full_messages.to_sentence}",
              details: current_user.errors.as_json
            }
          }, status: 400
        end
      end

      # POST /api/v1/onboarding/integrations
      def integrations
        validate_stage(2) or return
        existing_integrations = (current_user.integrations || {}).deep_dup
        existing_connected = Array(existing_integrations["connected"])

        submitted_connected = if params[:integrations].is_a?(ActionController::Parameters) || params[:integrations].is_a?(Hash)
                               Array(params[:integrations][:connected])
        else
                               Array(params[:integrations])
        end

        existing_integrations["connected"] = (existing_connected | submitted_connected.map(&:to_s))

        if current_user.update(integrations: existing_integrations, onboarding_stage: 3)
          render json: {
            success: true,
            message: "Integrations saved"
          }
        else
          render_update_error
        end
      end

      # POST /api/v1/onboarding/availability
      def availability
        validate_stage(3) or return
        weekly_availability = normalize_weekly_availability(params[:availability])

        ActiveRecord::Base.transaction do
          upsert_weekly_schedules!(weekly_availability)
          current_user.update_columns(onboarding_stage: 4)
        end

        if current_user.reload.onboarding_stage == 4
          render json: {
            success: true,
            message: "Availability saved"
          }
        else
          render_update_error
        end
      rescue ActiveRecord::RecordInvalid => e
        render json: {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Failed to save availability",
            details: e.record.errors.to_hash(true)
          }
        }, status: :unprocessable_entity
      rescue => e
        render json: {
          success: false,
          error: {
            code: "UPDATE_ERROR",
            message: "Update failed: #{e.message}"
          }
        }, status: 400
      end

      # POST /api/v1/onboarding/meeting-types
      def meeting_types
        validate_stage(4) or return
        if current_user.update(onboarding_stage: 5)
          render json: {
            success: true,
            message: "Event types configured"
          }
        else
          render_update_error
        end
      end

      # POST /api/v1/onboarding/finalise
      def finalise
        validate_stage(5) or return
        if current_user.update(onboarding_completed: true)
          Notifications::CreateService.call(
            user: current_user,
            event_name: "onboarding.completed",
            category: "onboarding",
            notification_type: "insight",
            title: "Onboarding completed",
            description: "Your onboarding setup is complete.",
            action_url: "/dashboard",
            metadata: {
              onboarding_stage: current_user.onboarding_stage,
              completed_at: Time.current.iso8601
            }
          )

          render json: {
            success: true,
            message: "Onboarding complete"
          }
        else
          render_update_error
        end
      end

      private

      def profile_params
        params.permit(:username, :full_name, :timezone, :bio, :avatar_url, :work_type, :default_meeting_duration, :default_buffer_time)
      end

      def validate_stage(required_stage)
        return true if current_user.onboarding_stage >= required_stage

        render json: {
          success: false,
          error: {
            code: "INVALID_FLOW",
            message: "Must complete previous pages first. Current stage: #{current_user.onboarding_stage}"
          }
        }, status: 403
        false
      end

      def render_update_error
        render json: {
          success: false,
          error: {
            code: "UPDATE_ERROR",
            message: "Update failed: #{current_user.errors.full_messages.to_sentence}"
          }
        }, status: 400
      end

      def normalize_weekly_availability(raw)
        value = raw.is_a?(ActionController::Parameters) ? raw.to_unsafe_h : raw
        value = value.is_a?(Hash) ? value : {}

        %w[Monday Tuesday Wednesday Thursday Friday Saturday Sunday].each_with_object({}) do |day, acc|
          slots = value[day] || []
          acc[day] = Array(slots).map do |slot|
            slot_hash = slot.is_a?(ActionController::Parameters) ? slot.to_unsafe_h : slot
            {
              "start" => slot_hash["start"].to_s,
              "end" => slot_hash["end"].to_s
            }
          end
        end
      end

      def upsert_weekly_schedules!(weekly_availability)
        day_indices = {
          "Monday" => 1,
          "Tuesday" => 2,
          "Wednesday" => 3,
          "Thursday" => 4,
          "Friday" => 5,
          "Saturday" => 6,
          "Sunday" => 0
        }

        current_user.availability_schedules.destroy_all

        weekly_availability.each do |day_name, slots|
          backend_day = day_indices[day_name]
          next if backend_day.nil? || slots.blank?

          slots.each do |slot|
            start_time = slot["start"].to_s
            end_time = slot["end"].to_s
            next if start_time.blank? || end_time.blank?

            current_user.availability_schedules.create!(
              day_of_week: backend_day,
              start_time: start_time,
              end_time: end_time,
              is_active: true,
              timezone: current_user.timezone.presence || "UTC"
            )
          end
        end
      end
    end
  end
end
