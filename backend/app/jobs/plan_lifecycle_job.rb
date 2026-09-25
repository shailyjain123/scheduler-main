class PlanLifecycleJob < ApplicationJob
  queue_as :default

  def perform
    # Handle expiries (today) and warnings (1 and 3 days before)
    [ 0, 1, 3 ].each do |days|
      User.expiring_in(days).find_each do |user|
        user.process_lifecycle_events!
      end
    end
  end
end
