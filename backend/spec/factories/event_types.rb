FactoryBot.define do
  factory :event_type do
    association :user
    title { 'Discovery Call' }
    duration { 30 }
    location { 'Zoom' }
    description { 'Initial consultation call' }
  end
end
