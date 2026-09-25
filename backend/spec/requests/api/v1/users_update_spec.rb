require 'rails_helper'

RSpec.describe 'Api::V1::Users update', type: :request do
  let(:user) { create(:user) }
  let(:token) { user.generate_token }

  it 'allows updating default_buffer_time via PATCH /api/v1/users/:id' do
    patch "/api/v1/users/#{user.id}", headers: { 'Authorization' => "Bearer #{token}" }, params: {
      user: { default_buffer_time: 20 }
    }

    expect(response).to have_http_status(:ok)
    body = response.parsed_body
    expect(body.dig('data', 'user', 'default_buffer_time')).to eq(20)
    expect(user.reload.default_buffer_time).to eq(20)
  end
end
