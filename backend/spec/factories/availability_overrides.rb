FactoryBot.define do
  factory :availability_override do
    user
    date { Date.current }
    start_time { "12:00" } # 12:00 PM
    end_time { "13:00" } # 1:00 PM
    is_unavailable { false }
    reason { nil }
  end
end
