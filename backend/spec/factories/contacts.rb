FactoryBot.define do
  factory :contact do
    first_name { "John" }
    last_name { "Doe" }
    sequence(:email) { |n| "contact#{n}@example.com" }
    phone { "+14155552671" }
    status { "active" }
    type_category { "Client" }
    notes { "Sample note" }
    association :user
  end
end
