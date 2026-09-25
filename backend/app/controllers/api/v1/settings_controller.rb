module Api
  module V1
    class SettingsController < Api::BaseController
      # GET /api/v1/settings
      def show
        # Use find_or_create logic to ensure settings always exist
        user_setting = current_user.user_setting || current_user.create_user_setting!
        render json: {
          success: true,
          data: settings_payload(user_setting)
        }
      end

      # PATCH /api/v1/settings
      def update
        user_setting = current_user.user_setting || current_user.create_user_setting!

        # Handle User model attributes separately
        timezone = params.dig(:settings, :timezone)
        current_user.update(timezone: timezone) if timezone.present?

        # Handle Plan Changes
        if settings_params[:plan_type].present? || settings_params[:billing_cycle].present?
          new_plan = settings_params[:plan_type] || current_user.plan_type
          new_cycle = settings_params[:billing_cycle] || current_user.billing_cycle

          if new_plan != current_user.plan_type || new_cycle != current_user.billing_cycle
            handle_plan_change(new_plan, new_cycle)
          end
        end

        if settings_params[:preferred_currency].present?
          current_user.update(preferred_currency: settings_params[:preferred_currency])
        end

        if user_setting.update(settings_params.except(:timezone, :plan_type, :preferred_currency, :billing_cycle))
          render json: {
            success: true,
            data: settings_payload(user_setting),
            message: "Settings updated successfully"
          }
        else
          render json: {
            success: false,
            error: {
              code: "UPDATE_FAILED",
              message: user_setting.errors.full_messages.to_sentence
            }
          }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/settings/cancel_subscription
      def cancel_subscription
        current_user.cancel_plan!
        Notifications::PlanNotificationService.notify_cancellation(current_user)
        render json: {
          success: true,
          data: settings_payload(current_user.user_setting),
          message: "Subscription will be cancelled at the end of the period"
        }
      end

      # POST /api/v1/settings/reactivate_subscription
      def reactivate_subscription
        current_user.reactivate_plan!
        render json: {
          success: true,
          data: settings_payload(current_user.user_setting),
          message: "Subscription reactivated"
        }
      end

      private

      def settings_params
        # Permit top level attributes and nested JSON structures
        params.require(:settings).permit(
          :email_reminders_enabled,
          :sms_reminders_enabled,
          :buffer_before,
          :buffer_after,
          :minimum_notice_value,
          :minimum_notice_unit,
          :booking_range_type,
          :booking_range_count,
          :max_bookings_per_day,
          :timezone,
          :plan_type,
          :preferred_currency,
          :billing_cycle,
          email_reminders_config: [ :offset, :recipient, :enabled ],
          sms_reminders_config: [ :offset, :recipient, :enabled ],
          push_notifications_config: [ :new_booking, :cancellation, :reschedule, :meeting_soon, :no_show, :daily_digest ]
        )
      end

      def handle_plan_change(new_plan, new_cycle)
        # Logic for Upgrade vs Downgrade
        plan_rank = { "free" => 0, "starter" => 1, "pro" => 2, "enterprise" => 3, "ultimate" => 4, "premium" => 5 }
        current_rank = plan_rank[current_user.plan_type] || 0
        new_rank = plan_rank[new_plan] || 0

        if new_rank > current_rank
          # Upgrade: Apply immediately
          current_user.upgrade_plan!(new_plan, new_cycle)
        elsif new_rank < current_rank
          # Downgrade: Schedule for later
          current_user.downgrade_plan!(new_plan, new_cycle)
          Notifications::PlanNotificationService.notify_downgrade_scheduled(current_user, new_plan)
        else
          # Same plan level: Reset credits and cycle (effectively a renewal)
          current_user.activate_plan!(new_plan, new_cycle)
        end
      end

      def settings_payload(user_setting)
        payload = user_setting.as_json(only: [
          :id,
          :user_id,
          :email_reminders_enabled,
          :email_reminders_config,
          :sms_reminders_enabled,
          :sms_reminders_config,
          :push_notifications_config,
          :buffer_before,
          :buffer_after,
          :minimum_notice_value,
          :minimum_notice_unit,
          :booking_range_type,
          :booking_range_count,
          :max_bookings_per_day
        ])

        payload["timezone"] = current_user.timezone
        payload["plan_type"] = current_user.plan_type
        payload["preferred_currency"] = current_user.preferred_currency
        payload["billing_cycle"] = current_user.billing_cycle

        # Credit & Plan lifecycle
        payload["total_credits"] = current_user.total_credits
        payload["used_credits"] = current_user.used_credits
        payload["remaining_credits"] = current_user.remaining_credits
        payload["plan_started_at"] = current_user.plan_started_at
        payload["plan_expires_at"] = current_user.plan_expires_at
        payload["days_remaining"] = current_user.days_remaining
        payload["plan_expired"] = current_user.plan_expired?
        payload["credits_exhausted"] = current_user.credits_exhausted?
        payload["cancel_at_period_end"] = current_user.cancel_at_period_end
        payload["pending_plan_change"] = current_user.pending_plan_change

        push_config = payload["push_notifications_config"] || {}
        payload["push_notifications_config"] = push_config.except("payment_received")
        payload
      end
    end
  end
end
