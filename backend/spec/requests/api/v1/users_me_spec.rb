require 'rails_helper'

RSpec.describe 'Api::V1::Users', type: :request do
  describe 'GET /api/v1/users/me' do
    let(:user) do
      create(
        :user,
        email: 'sync@example.com',
        integrations: { 'connected' => [ 'google', 'google_meet' ] }
      )
    end
    let(:token) { user.generate_token }

    before do
      AvailabilitySchedule.create!(
        user: user,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        timezone: 'UTC'
      )
    end

    it 'returns integrations and availability in serialized user data' do
      get '/api/v1/users/me', headers: { 'Authorization' => "Bearer #{token}" }

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body['success']).to be(true)

      serialized_user = body.dig('data', 'user')
      expect(serialized_user['integrations']).to eq({ 'connected' => [ 'google', 'google_meet' ] })
      expect(serialized_user['availability']).to eq(
        'Monday' => [ { 'start' => '09:00', 'end' => '17:00' } ],
        'Tuesday' => [],
        'Wednesday' => [],
        'Thursday' => [],
        'Friday' => [],
        'Saturday' => [],
        'Sunday' => []
      )
    end
  end
end
