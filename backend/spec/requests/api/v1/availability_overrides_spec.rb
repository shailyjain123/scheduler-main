require 'rails_helper'

RSpec.describe 'Api::V1::Availability::Overrides', type: :request do
  let(:user) { create(:user, timezone: 'UTC') }
  let(:token) { user.generate_token }
  let(:headers) { { 'Authorization' => "Bearer #{token}" } }

  describe 'POST /api/v1/availability/overrides' do
    it 'creates an all-day unavailable override with null times' do
      post '/api/v1/availability/overrides',
           params: {
             override: {
               date: (Date.current + 1).iso8601,
               is_unavailable: true,
               reason: 'Holiday'
             }
           },
           headers: headers

      expect(response).to have_http_status(:created)
      expect(response.parsed_body['success']).to be(true)
      expect(user.availability_overrides.count).to eq(1)
    end

    it 'rejects available override without times' do
      post '/api/v1/availability/overrides',
           params: {
             override: {
               date: (Date.current + 2).iso8601,
               is_unavailable: false,
               reason: 'Working partial day'
             }
           },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['success']).to be(false)
    end

    it 'rejects overrides created for past dates' do
      post '/api/v1/availability/overrides',
           params: {
             override: {
               date: (Date.current - 1).iso8601,
               is_unavailable: true,
               reason: 'Past'
             }
           },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['success']).to be(false)
    end

    it 'rejects all-day unavailable override when scheduled meetings already exist on that date' do
      blocked_date = Date.current + 5
      user.availability_schedules.create!(
        day_of_week: blocked_date.wday,
        start_time: '09:00',
        end_time: '18:00',
        is_active: true,
        timezone: 'UTC'
      )

      event_type = create(:event_type, user: user)
      zone = ActiveSupport::TimeZone['UTC']
      Event.create!(
        user: user,
        event_type: event_type,
        title: 'Booked call',
        start_time: zone.parse("#{blocked_date} 10:00"),
        end_time: zone.parse("#{blocked_date} 11:00"),
        status: 'scheduled'
      )

      post '/api/v1/availability/overrides',
           params: {
             override: {
               date: blocked_date.iso8601,
               is_unavailable: true,
               reason: 'Quick block'
             }
           },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['success']).to be(false)
      expect(response.parsed_body.dig('error', 'details', 'base')).to include('Cannot block time range with scheduled meetings')
    end

    it 'rejects partial unavailable override when a scheduled meeting overlaps that range' do
      blocked_date = Date.current + 6
      user.availability_schedules.create!(
        day_of_week: blocked_date.wday,
        start_time: '09:00',
        end_time: '18:00',
        is_active: true,
        timezone: 'UTC'
      )

      event_type = create(:event_type, user: user)
      zone = ActiveSupport::TimeZone['UTC']
      Event.create!(
        user: user,
        event_type: event_type,
        title: 'Team sync',
        start_time: zone.parse("#{blocked_date} 13:00"),
        end_time: zone.parse("#{blocked_date} 14:00"),
        status: 'scheduled'
      )

      post '/api/v1/availability/overrides',
           params: {
             override: {
               date: blocked_date.iso8601,
               is_unavailable: true,
               start_time: '12:30',
               end_time: '13:30',
               reason: 'Quick block partial'
             }
           },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['success']).to be(false)
      expect(response.parsed_body.dig('error', 'details', 'base')).to include('Cannot block time range with scheduled meetings')
    end
  end

  describe 'PATCH /api/v1/availability/overrides/:id' do
    let!(:override) do
      user.availability_overrides.create!(
        date: Date.current + 3,
        is_unavailable: false,
        start_time: '09:00',
        end_time: '11:00',
        reason: 'Office hours'
      )
    end

    it 'updates an override with valid payload' do
      patch "/api/v1/availability/overrides/#{override.id}",
            params: {
              override: {
                start_time: '10:00',
                end_time: '12:00'
              }
            },
            headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['success']).to be(true)
      expect(override.reload.start_time.strftime('%H:%M')).to eq('10:00')
    end

    it 'rejects invalid time ranges on update' do
      patch "/api/v1/availability/overrides/#{override.id}",
            params: {
              override: {
                start_time: '13:00',
                end_time: '12:00'
              }
            },
            headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['success']).to be(false)
    end
  end
end
