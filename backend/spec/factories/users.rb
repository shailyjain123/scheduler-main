FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    password { 'ValidPass1!' }
    full_name { 'Test User' }
    status { 'active' }
    email_verified_at { Time.current }

    trait :inactive do
      status { 'inactive' }
      email_verified_at { nil }
    end

    trait :banned do
      status { 'banned' }
    end

    trait :unverified do
      status { 'inactive' }
      email_verified_at { nil }
    end
  end
end
