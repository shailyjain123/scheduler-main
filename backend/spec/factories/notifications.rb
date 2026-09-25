FactoryBot.define do
  factory :notification do
    association :user
    notification_type { "booking" }
    category { "meetings" }
    event_name { "event.created" }
    title { "Event created" }
    description { "Your event was created." }
    read_at { nil }
    metadata { {} }
    priority { "normal" }
    action_url { "/meetings" }
    grouped_count { 1 }
    last_occurred_at { Time.current }
  end
end
