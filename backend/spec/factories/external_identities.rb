FactoryBot.define do
  factory :external_identity do
    user
    provider { "google_oauth2" }
    sequence(:uid) { |n| "uid-#{n}" }
    provider_email { user.email }
    access_token { "access-token-123" }
    refresh_token { "refresh-token-456" }
    expires_at { 1.hour.from_now }
    scopes { [ "openid", "email", "profile" ] }
    account_type { "personal" }
  end
end
