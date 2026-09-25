FactoryBot.define do
  factory :availability_schedule do
    user
    day_of_week { 1 } # Monday
    start_time { "09:00" } # 9:00 AM
    end_time { "17:00" } # 5:00 PM
    timezone { 'UTC' }
    is_active { true }
  end
end
