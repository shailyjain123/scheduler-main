FactoryBot.define do
  factory :event_invitee do
    event
    email { Faker::Internet.email }
    name { Faker::Name.name }
    user { nil } # Optional reference to a user
    status { 'pending' }
    token { SecureRandom.hex(16) }
  end
end
