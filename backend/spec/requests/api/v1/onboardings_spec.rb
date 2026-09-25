require 'rails_helper'

RSpec.describe "Api::V1::Onboardings", type: :request do
  let(:user) { create(:user) }
  let(:token) { user.generate_token }
  let(:auth_headers) { { 'Authorization' => "Bearer #{token}" } }

  describe "POST /api/v1/onboarding/profile" do
    it "saves profile information" do
      params = {
        full_name: 'John Doe',
        username: 'johndoe',
        timezone: 'America/New_York',
        work_type: 'Freelancer'
      }

      post '/api/v1/onboarding/profile',
        params: params,
        headers: auth_headers

      expect(response).to have_http_status(200)
      body = response.parsed_body
      expect(body['success']).to be true
      expect(body['data']['user']['username']).to eq('johndoe')
      expect(body['data']['user']['email']).to eq(user.email)
      expect(body['data']['user']['onboarding_stage']).to eq(2)
    end

    it "updates onboarding stage to 2" do
      params = {
        full_name: 'Jane Doe',
        username: 'janedoe',
        timezone: 'America/Los_Angeles'
      }

      post '/api/v1/onboarding/profile',
        params: params,
        headers: auth_headers

      user.reload
      expect(user.onboarding_stage).to eq(2)
    end

    it "requires authentication" do
      post '/api/v1/onboarding/profile',
        params: { username: 'test' }

      expect(response).to have_http_status(401)
    end

    it 'rejects invalid username format' do
      params = {
        full_name: 'John Doe',
        username: 'john doe',
        timezone: 'UTC'
      }

      post '/api/v1/onboarding/profile',
        params: params,
        headers: auth_headers

      expect(response).to have_http_status(400)
      expect(response.parsed_body.dig('error', 'message')).to include('Username')
    end
  end

  describe "POST /api/v1/onboarding/finalise" do
    before do
      # Set all required onboarding fields before finalizing
      user.update(
        onboarding_stage: 5,
        username: 'testuser',
        timezone: 'UTC',
        full_name: 'Test User'
      )
    end

    it "marks onboarding as completed" do
      post '/api/v1/onboarding/finalise',
        headers: auth_headers

      expect(response).to have_http_status(200)
      user.reload
      expect(user.onboarding_completed).to be true
    end

    it "requires correct onboarding progression" do
      user.update(onboarding_stage: 3)

      post '/api/v1/onboarding/finalise',
        headers: auth_headers

      expect(response).to have_http_status(403)
    end
  end
end
