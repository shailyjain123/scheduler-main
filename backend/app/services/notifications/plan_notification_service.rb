module Notifications
  class PlanNotificationService
    def self.notify_usage(user, percentage)
      title = case percentage
              when 100
                "You’ve exhausted your credits"
              when 80
                "You’re running low on credits"
              when 50
                "You’ve used 50% of your credits"
              else
                "Credit usage update"
              end

      description = if percentage >= 100
                      "No credits remaining. Please upgrade your plan to continue using premium features."
                    else
                      "You have used #{percentage}% of your plan credits. Current balance: #{user.remaining_credits}."
                    end

      # We use a group_key based on percentage to avoid duplicate notifications in a short time
      Notifications::CreateService.call(
        user: user,
        event_name: "plan.usage_alert",
        category: "credit",
        title: title,
        description: description,
        priority: percentage >= 80 ? "high" : "normal",
        action_url: "/settings/plan",
        group_key: "usage-alert-#{percentage}-#{user.id}",
        group_window: 24.hours # Only notify once every 24h for the same percentage
      )
    end

    def self.notify_activation(user)
      Notifications::CreateService.call(
        user: user,
        event_name: "plan.activated",
        category: "plan",
        title: "Your #{user.plan_type.capitalize} plan is now active",
        description: "Welcome to your new plan! You have #{user.total_credits} credits available until #{user.plan_expires_at.strftime('%B %d, %Y')}.",
        priority: "high",
        action_url: "/settings/plan"
      )
    end

    def self.notify_update(user)
      Notifications::CreateService.call(
        user: user,
        event_name: "plan.updated",
        category: "plan",
        title: "Your plan has been updated successfully",
        description: "Your subscription has been updated to the #{user.plan_type.capitalize} plan. New credits have been added to your balance.",
        priority: "high",
        action_url: "/settings/plan"
      )
    end

    def self.notify_expiry_warning(user, days_left)
      title = days_left == 1 ? "Urgent: Your plan expires tomorrow" : "Your plan expires in #{days_left} days"
      
      Notifications::CreateService.call(
        user: user,
        event_name: "plan.expiry_warning",
        category: "plan",
        title: title,
        description: "Your #{user.plan_type.capitalize} plan will expire on #{user.plan_expires_at.strftime('%B %d')}. Please renew or upgrade to keep your premium features.",
        priority: "high",
        action_url: "/settings/plan",
        group_key: "expiry-warning-#{days_left}-#{user.id}"
      )
    end

    def self.notify_expiry(user)
      Notifications::CreateService.call(
        user: user,
        event_name: "plan.expired",
        category: "plan",
        title: "Your plan has expired",
        description: "Your premium features are now disabled. You have been moved to the Free plan.",
        priority: "high",
        action_url: "/settings/plan"
      )
    end

    def self.notify_cancellation(user)
      Notifications::CreateService.call(
        user: user,
        event_name: "plan.cancelled",
        category: "plan",
        title: "Subscription cancellation confirmed",
        description: "Your plan will remain active until #{user.plan_expires_at.strftime('%B %d, %Y')}, after which you will be moved to the Free plan.",
        priority: "normal",
        action_url: "/settings/plan"
      )
    end

    def self.notify_downgrade_scheduled(user, new_plan)
      Notifications::CreateService.call(
        user: user,
        event_name: "plan.downgrade_scheduled",
        category: "plan",
        title: "Plan downgrade scheduled",
        description: "Your plan will be changed to #{new_plan.capitalize} at the end of your current billing cycle on #{user.plan_expires_at.strftime('%B %d, %Y')}.",
        priority: "normal",
        action_url: "/settings/plan"
      )
    end

    def self.notify_usage_exhausted_block(user)
      Notifications::CreateService.call(
        user: user,
        event_name: "plan.usage_blocked",
        category: "credit",
        title: "Action required: Credits exhausted",
        description: "You have used all your plan credits. Please upgrade your plan to continue using this feature.",
        priority: "high",
        action_url: "/settings/plan",
        group_key: "usage-blocked-#{user.id}",
        group_window: 1.hour
      )
    end
  end
end
