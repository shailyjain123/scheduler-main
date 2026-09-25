require 'rails_helper'

RSpec.describe "Api::V1::Onboarding", type: :request do
  let(:user) { User.create!(email: 'test@example.com', password: 'ValidPass1!', full_name: 'Test User', username: 'testuser_initial', email_verified_at: Time.current) }
  let(:token) { user.generate_token }
  let(:headers) { { "Authorization" => "Bearer #{token}" } }

  describe "POST /api/v1/onboarding/profile" do
    it "updates user basic info and increments onboarding stage" do
      post "/api/v1/onboarding/profile",
           params: {
             full_name: 'Jane Doe',
             username: 'janedoe',
             bio: 'My bio',
             timezone: 'UTC',
             work_type: 'Small Team',
             default_meeting_duration: 45,
             default_buffer_time: 15
           },
           headers: headers

      expect(response).to have_http_status(:success)
      user.reload
      expect(user.full_name).to eq('Jane Doe')
      expect(user.username).to eq('janedoe')
      expect(user.work_type).to eq('Small Team')
      expect(user.default_meeting_duration).to eq(45)
      expect(user.onboarding_stage).to eq(2)
    end

    it 'rejects invalid usernames' do
      post '/api/v1/onboarding/profile',
           params: {
             full_name: 'Jane Doe',
             username: 'bad username',
             timezone: 'UTC'
           },
           headers: headers

      expect(response).to have_http_status(:bad_request)
      expect(response.parsed_body.dig('error', 'message')).to include('Username')
    end
  end

  describe "Onboarding stage flow validation" do
    it "prevents skipping to onboarding stage 3" do
      post "/api/v1/onboarding/availability",
           params: { availability: { hours: '9-5' } },
           headers: headers

      expect(response).to have_http_status(403)
      expect(JSON.parse(response.body)['error']['code']).to eq('INVALID_FLOW')
    end

    it "allows onboarding stage 2 after stage 1 is done" do
      user.update!(onboarding_stage: 2)
      post "/api/v1/onboarding/integrations",
           params: { integrations: { connected: [ 'google' ] } },
           headers: headers

      expect(response).to have_http_status(:success)
      expect(user.reload.onboarding_stage).to eq(3)
    end

    it "merges submitted integrations with existing connections" do
      user.update!(onboarding_stage: 2, integrations: { 'connected' => [ 'google' ] })

      post "/api/v1/onboarding/integrations",
           params: { integrations: { connected: [ 'google_meet' ] } },
           headers: headers

      expect(response).to have_http_status(:success)
      expect(user.reload.integrations['connected']).to include('google', 'google_meet')
    end
  end

  describe "POST /api/v1/onboarding/availability" do
    before do
      user.update!(onboarding_stage: 3, timezone: 'UTC')
    end

    it "rejects overlapping slots for the same day" do
      post "/api/v1/onboarding/availability",
           params: {
             availability: {
               "Monday" => [
                 { "start" => "09:00", "end" => "12:00" },
                 { "start" => "11:00", "end" => "13:00" }
               ]
             }
           },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      body = response.parsed_body
      expect(body['success']).to be(false)
      expect(body.dig('error', 'code')).to eq('VALIDATION_ERROR')
      expect(body.dig('error', 'details', 'base')).to include('Overlapping schedule block for this day')
    end

    it "rejects slots where end time is not after start time" do
      post "/api/v1/onboarding/availability",
           params: {
             availability: {
               "Monday" => [
                 { "start" => "14:00", "end" => "14:00" }
               ]
             }
           },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      body = response.parsed_body
      expect(body['success']).to be(false)
      expect(body.dig('error', 'code')).to eq('VALIDATION_ERROR')
      expect(body.dig('error', 'details', 'end_time')).to include('End time must be after start_time')
    end

    it "rejects slots when consecutive blocks do not keep a minimum 1 hour gap" do
      post "/api/v1/onboarding/availability",
           params: {
             availability: {
               "Monday" => [
                 { "start" => "09:00", "end" => "12:00" },
                 { "start" => "12:45", "end" => "13:45" }
               ]
             }
           },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      body = response.parsed_body
      expect(body['success']).to be(false)
      expect(body.dig('error', 'code')).to eq('VALIDATION_ERROR')
      expect(body.dig('error', 'details', 'start_time')).to include('Start time must be at least 1 hour after the previous slot end time')
    end
  end

  describe "POST /api/v1/onboarding/finalise" do
    it "completes onboarding" do
      user.update!(onboarding_stage: 5, timezone: 'UTC')
      post "/api/v1/onboarding/finalise", headers: headers

      expect(response).to have_http_status(:success)
      expect(user.reload.onboarding_completed).to be true
    end
  end
end
