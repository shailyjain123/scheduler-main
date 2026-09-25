FactoryBot.define do
  factory :event do
    user
    event_type
    title { 'Team Meeting' }
    description { 'A regular team sync' }
    location { 'Zoom' }
    start_time { Time.current + 1.day }
    end_time { Time.current + 1.day + 30.minutes }
    status { 'scheduled' }
    metadata { { booking_source: 'direct' } }
  end
end
