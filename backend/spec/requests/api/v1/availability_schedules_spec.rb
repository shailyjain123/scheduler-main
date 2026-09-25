require 'rails_helper'

RSpec.describe 'Api::V1::Availability::Schedules', type: :request do
  let(:user) { create(:user, timezone: 'UTC') }
  let(:token) { user.generate_token }
  let(:headers) { { 'Authorization' => "Bearer #{token}" } }

  describe 'POST /api/v1/availability/schedules' do
    it 'creates a schedule block with valid payload' do
      post '/api/v1/availability/schedules',
           params: {
             schedule: {
               day_of_week: 1,
               start_time: '09:00',
               end_time: '17:00',
               is_active: true,
               timezone: 'UTC'
             }
           },
           headers: headers

      expect(response).to have_http_status(:created)
      expect(response.parsed_body['success']).to be(true)
      expect(user.availability_schedules.count).to eq(1)
    end

    it 'rejects a block where end_time is before start_time' do
      post '/api/v1/availability/schedules',
           params: {
             schedule: {
               day_of_week: 1,
               start_time: '17:00',
               end_time: '09:00',
               timezone: 'UTC'
             }
           },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['success']).to be(false)
    end

    it 'rejects overlapping blocks for the same day' do
      user.availability_schedules.create!(day_of_week: 1, start_time: '09:00', end_time: '12:00', is_active: true, timezone: 'UTC')

      post '/api/v1/availability/schedules',
           params: {
             schedule: {
               day_of_week: 1,
               start_time: '11:00',
               end_time: '13:00',
               timezone: 'UTC'
             }
           },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['success']).to be(false)
      expect(response.parsed_body.dig('error', 'details', 'start_time')).to include('Start time cannot overlap another slot on the same day')
    end

    it 'allows back-to-back slots on the same day' do
      user.availability_schedules.create!(day_of_week: 1, start_time: '09:00', end_time: '12:00', is_active: true, timezone: 'UTC')

      post '/api/v1/availability/schedules',
           params: {
             schedule: {
               day_of_week: 1,
               start_time: '12:00',
               end_time: '13:30',
               timezone: 'UTC'
             }
           },
           headers: headers

      expect(response).to have_http_status(:created)
      expect(response.parsed_body['success']).to be(true)
    end

    it 'rejects slots shorter than 30 minutes' do
      post '/api/v1/availability/schedules',
           params: {
             schedule: {
               day_of_week: 1,
               start_time: '09:00',
               end_time: '09:15',
               timezone: 'UTC'
             }
           },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['success']).to be(false)
      expect(response.parsed_body.dig('error', 'details', 'end_time')).to include('End time must be at least 30 minutes after start_time')
    end

    it 'returns wall-clock HH:MM values unchanged for Asia/Calcutta users' do
      user.update!(timezone: 'Asia/Calcutta')

      post '/api/v1/availability/schedules',
           params: {
             schedule: {
               day_of_week: 1,
               start_time: '09:00',
               end_time: '20:00',
               is_active: true,
               timezone: 'Asia/Calcutta'
             }
           },
           headers: headers

      expect(response).to have_http_status(:created)
      expect(response.parsed_body['success']).to be(true)

      get '/api/v1/availability/schedules', headers: headers
      expect(response).to have_http_status(:ok)

      monday = response.parsed_body['data'].find { |item| item['day_of_week'] == 1 }
      expect(monday['start_time']).to eq('09:00')
      expect(monday['end_time']).to eq('20:00')
    end
  end

  describe 'PATCH /api/v1/availability/schedules/:id' do
    let!(:schedule) { user.availability_schedules.create!(day_of_week: 2, start_time: '09:00', end_time: '17:00', is_active: true, timezone: 'UTC') }

    it 'updates a block with valid payload' do
      patch "/api/v1/availability/schedules/#{schedule.id}",
            params: {
              schedule: {
                start_time: '10:00',
                end_time: '18:00'
              }
            },
            headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['success']).to be(true)
      expect(schedule.reload.start_time.strftime('%H:%M')).to eq('10:00')
    end

    it 'rejects invalid day_of_week values' do
      patch "/api/v1/availability/schedules/#{schedule.id}",
            params: {
              schedule: {
                day_of_week: 7
              }
            },
            headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['success']).to be(false)
    end

    it 'allows updates that create back-to-back slots with neighboring slots' do
      user.availability_schedules.create!(day_of_week: 2, start_time: '18:30', end_time: '20:00', is_active: true, timezone: 'UTC')

      patch "/api/v1/availability/schedules/#{schedule.id}",
            params: {
              schedule: {
                start_time: '10:00',
                end_time: '18:30'
              }
            },
            headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['success']).to be(true)
    end
  end

  describe 'GET /api/v1/availability/slots' do
    let!(:schedule) do
      user.availability_schedules.create!(
        day_of_week: 1,
        start_time: '09:00',
        end_time: '11:00',
        is_active: true,
        timezone: 'UTC'
      )
    end

    it 'returns computed slots for date and duration' do
      get '/api/v1/availability/slots',
          params: { date: '2026-04-13', timezone: 'UTC', duration: 30 },
          headers: headers

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body['success']).to be(true)
      expect(body.dig('data', 'slots').length).to eq(4)
      expect(body.dig('data', 'slots', 0, 'start_time')).to end_with('09:00:00Z')
      expect(body.dig('data', 'slots', 0, 'end_time')).to end_with('09:30:00Z')
    end

    it 'applies unavailable date override windows' do
      user.availability_overrides.create!(
        date: Date.iso8601('2026-04-13'),
        is_unavailable: true,
        start_time: '09:30',
        end_time: '10:30',
        reason: 'Busy'
      )

      get '/api/v1/availability/slots',
          params: { date: '2026-04-13', timezone: 'UTC', duration: 30 },
          headers: headers

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      starts = body.dig('data', 'slots').map { |slot| slot['start_time'] }
      expect(starts).to include(a_string_ending_with('09:00:00Z'))
      expect(starts).to include(a_string_ending_with('10:30:00Z'))
      expect(starts).not_to include(a_string_ending_with('09:30:00Z'))
      expect(starts).not_to include(a_string_ending_with('10:00:00Z'))
    end

    it 'returns validation error for invalid date' do
      get '/api/v1/availability/slots',
          params: { date: 'not-a-date', timezone: 'UTC', duration: 30 },
          headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['success']).to be(false)
    end
  end
end
