require 'rails_helper'

RSpec.describe 'Api::V1::Dashboard', type: :request do
  describe 'GET /api/v1/dashboard/stats' do
    it 'does not load invitees once per event' do
      user_id = 31
      current_user = instance_double(User, id: user_id)

      ActiveRecord::Base.connection.execute(<<~SQL)
        INSERT INTO users (id, email, password_digest, full_name, status, plan_type, created_at, updated_at)
        VALUES (#{user_id}, 'dashboard-stats@example.com', '#{BCrypt::Password.create('ValidPass1!')}', 'Dashboard Stats', 'active', 'free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      SQL

      event_type = EventType.create!(
        user_id: user_id,
        title: 'Stats Call',
        duration: 30,
        location: 'Zoom',
        kind: 'one_on_one',
        max_participants: 1
      )

      4.times do |index|
        event = Event.create!(
          user_id: user_id,
          event_type: event_type,
          title: "Stats Event #{index + 1}",
          location: 'Zoom',
          start_time: Time.zone.parse("2026-05-0#{index + 1} 10:00:00 UTC"),
          end_time: Time.zone.parse("2026-05-0#{index + 1} 10:30:00 UTC"),
          status: index.even? ? 'completed' : 'cancelled',
          metadata: {}
        )

        EventInvitee.create!(
          event: event,
          name: "Guest #{index + 1}",
          email: "guest#{index + 1}@example.com",
          token: SecureRandom.urlsafe_base64(32),
          status: 'pending'
        )
      end

      allow_any_instance_of(Api::BaseController).to receive(:authenticate_user!).and_return(true)
      allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(current_user)

      event_invitee_loads = 0

      callback = lambda do |_name, _started, _finished, _id, payload|
        event_invitee_loads += 1 if payload[:name] == 'EventInvitee Load'
      end

      ActiveSupport::Notifications.subscribed(callback, 'sql.active_record') do
        get '/api/v1/dashboard/stats'
      end

      expect(response).to have_http_status(:ok)
      expect(event_invitee_loads).to eq(0)
      expect(response.parsed_body.dig('data', 'totalBookings')).to eq(4)
    end
  end
end