require 'rails_helper'

RSpec.describe 'Api::V1::Public::EventTypes', type: :request do
  let(:host) { create(:user, full_name: 'Host User', username: 'hostuser', timezone: 'UTC') }
  let(:next_wednesday) { (Date.current..(Date.current + 21.days)).find { |d| d.wday == 3 } }
  let(:event_type) do
    create(
      :event_type,
      user: host,
      title: 'Discovery Call',
      duration: 30,
      location: 'Zoom',
      is_active: true,
      availability: {
        'Wednesday' => [
          { 'start' => '09:00', 'end' => '11:00' }
        ]
      }
    )
  end

  it 'returns a public booking payload without authentication' do
    get "/api/v1/public/event_types/#{event_type.id}"

    expect(response).to have_http_status(:ok)
    body = response.parsed_body

    expect(body['success']).to be(true)
    expect(body.dig('data', 'event_type', 'id')).to eq(event_type.id)
    expect(body.dig('data', 'host', 'full_name')).to eq('Host User')
    expect(body.dig('data', 'availability', 'Wednesday')).to eq([ { 'start' => '09:00', 'end' => '11:00' } ])
  end

  it 'includes host default buffer time in payload' do
    host.update!(default_buffer_time: 15)

    get "/api/v1/public/event_types/#{event_type.id}"

    expect(response).to have_http_status(:ok)
    body = response.parsed_body

    expect(body.dig('data', 'host', 'default_buffer_time')).to eq(15)
  end

  it 'includes event type buffer fields in payload' do
    event_type.update!(buffer_before: 0, buffer_after: 0)

    get "/api/v1/public/event_types/#{event_type.id}"

    expect(response).to have_http_status(:ok)
    body = response.parsed_body

    expect(body.dig('data', 'event_type', 'buffer_before')).to eq(0)
    expect(body.dig('data', 'event_type', 'buffer_after')).to eq(0)
  end

  it 'returns available slots based on event-specific availability' do
    get "/api/v1/public/event_types/#{event_type.id}", params: { timezone: 'UTC' }

    expect(response).to have_http_status(:ok)
    body = response.parsed_body

    slots = body.dig('data', 'available_slots')
    expect(slots).to be_an(Array)
    expect(slots.length).to be >= 4
    expect(slots.first['start_time']).to eq(Time.utc(next_wednesday.year, next_wednesday.month, next_wednesday.day, 9, 0, 0).iso8601)
    expect(slots.first['label']).to eq('09:00 AM - 09:30 AM')
    expect(slots.first['available']).to be(true)
  end

  it 'includes booked times in the response' do
    create(
      :event,
      user: host,
      event_type: event_type,
      start_time: Time.utc(next_wednesday.year, next_wednesday.month, next_wednesday.day, 9, 0, 0),
      end_time: Time.utc(next_wednesday.year, next_wednesday.month, next_wednesday.day, 9, 30, 0),
      status: 'scheduled'
    )

    get "/api/v1/public/event_types/#{event_type.id}", params: { timezone: 'UTC' }

    expect(response).to have_http_status(:ok)
    body = response.parsed_body

    booked_times = body.dig('data', 'booked_times')
    expect(booked_times).to be_an(Array)
    expect(booked_times.length).to eq(1)
    expect(booked_times.first['start_time']).to eq(Time.utc(next_wednesday.year, next_wednesday.month, next_wednesday.day, 9, 0, 0).iso8601)
    expect(booked_times.first['event_id']).to be_present
  end

  it 'returns timezone information' do
    get "/api/v1/public/event_types/#{event_type.id}", params: { timezone: 'America/New_York' }

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.dig('data', 'timezone')).to eq('America/New_York')
  end

  it 'falls back to host schedules when event type availability is empty' do
    event_type.update!(availability: {})
    create(:availability_schedule, user: host, day_of_week: 3, start_time: '13:00', end_time: '14:00', is_active: true)

    get "/api/v1/public/event_types/#{event_type.id}", params: { timezone: 'UTC' }

    expect(response).to have_http_status(:ok)
    body = response.parsed_body
    slots = body.dig('data', 'available_slots')
    expect(slots.length).to be >= 2
    expect(slots.map { |slot| slot['start_time'] }).to include(
      Time.utc(next_wednesday.year, next_wednesday.month, next_wednesday.day, 13, 0, 0).iso8601
    )
  end

  it 'falls back to host schedules when event type availability settings are missing required day keys' do
    event_type.update!(availability: { 'slots' => [] })
    create(:availability_schedule, user: host, day_of_week: 3, start_time: '13:00', end_time: '14:00', is_active: true)

    get "/api/v1/public/event_types/#{event_type.id}", params: { timezone: 'UTC' }

    expect(response).to have_http_status(:ok)
    body = response.parsed_body
    slots = body.dig('data', 'available_slots')
    expect(slots.length).to be >= 2
    expect(slots.map { |slot| slot['start_time'] }).to include(
      Time.utc(next_wednesday.year, next_wednesday.month, next_wednesday.day, 13, 0, 0).iso8601
    )
  end

  it 'returns not found for inactive event types' do
    inactive_event_type = create(:event_type, user: host, is_active: false)

    get "/api/v1/public/event_types/#{inactive_event_type.id}"

    expect(response).to have_http_status(:not_found)
    expect(response.parsed_body.dig('error', 'code')).to eq('NOT_FOUND')
  end
end
