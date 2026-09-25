require 'rails_helper'

RSpec.describe 'Api::V1::Public::Bookings', type: :request do
  let(:host) { create(:user, full_name: 'Host User', timezone: 'UTC') }
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

  before do
    ActiveJob::Base.queue_adapter = :test
    ActionMailer::Base.deliveries.clear
    Rails.cache.clear
  end

  def booking_params(overrides = {})
    {
      guest_name: 'Guest User',
      guest_email: 'guest@example.com',
      notes: 'Looking forward to it',
      start_time: '2026-05-06T09:00:00Z',
      timezone: 'UTC'
    }.merge(overrides)
  end

  def create_verification_request(event_type_id:, booking: booking_params)
    post "/api/v1/public/event_types/#{event_type_id}/bookings", params: { booking: booking }

    expect(response).to have_http_status(:accepted)
    body = response.parsed_body
    request_id = body.dig('data', 'booking_request_id')
    code = ActionMailer::Base.deliveries.last.body.encoded.match(/\b\d{6}\b/)&.[](0)

    [ request_id, code, body ]
  end

  def create_request(event_type_id:, booking: booking_params, headers: {})
    post "/api/v1/public/event_types/#{event_type_id}/bookings", params: { booking: booking }, headers: headers

    response
  end

  def booking_time(time_string)
    "2026-05-06T#{time_string}:00Z"
  end

  it 'creates a verification request instead of confirming the booking immediately' do
    expect do
      post "/api/v1/public/event_types/#{event_type.id}/bookings", params: {
        booking: booking_params
      }
    end.to change(PublicBookingRequest, :count).by(1)

    expect(response).to have_http_status(:accepted)
    body = response.parsed_body

    expect(body['success']).to be(true)
    expect(body.dig('data', 'verification_required')).to be(true)
    expect(body.dig('data', 'guest', 'email')).to eq('guest@example.com')
    expect(ActionMailer::Base.deliveries.size).to eq(1)
  end

  it 'verifies the booking code and creates the event after email ownership is confirmed' do
    request_id, code, = create_verification_request(event_type_id: event_type.id)

    expect do
      post "/api/v1/public/event_types/#{event_type.id}/bookings/verify", params: {
        booking: {
          booking_request_id: request_id,
          verification_code: code
        }
      }
    end.to change(Event, :count).by(1).and change(EventInvitee, :count).by(1)

    expect(response).to have_http_status(:created)
    body = response.parsed_body

    expect(body['success']).to be(true)
    expect(body.dig('data', 'guest', 'email')).to eq('guest@example.com')

    booking = Event.find(body.dig('data', 'booking', 'id'))
    expect(booking.user_id).to eq(host.id)
    expect(booking.event_type_id).to eq(event_type.id)
    expect(booking.end_time.utc.iso8601).to eq('2026-05-06T09:30:00Z')
    expect(booking.metadata['guest_email']).to eq('guest@example.com')
  end

  it 'rejects invalid email formats before sending verification' do
    post "/api/v1/public/event_types/#{event_type.id}/bookings", params: {
      booking: booking_params(guest_email: 'not-an-email')
    }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body.dig('error', 'message')).to include('Guest email is invalid')
    expect(ActionMailer::Base.deliveries).to be_empty
  end

  it 'rejects disposable email addresses before sending verification' do
    post "/api/v1/public/event_types/#{event_type.id}/bookings", params: {
      booking: booking_params(guest_email: 'guest@mailinator.com')
    }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body.dig('error', 'message')).to include('Temporary email addresses are not allowed')
    expect(ActionMailer::Base.deliveries).to be_empty
  end

  it 'limits repeated booking attempts per email' do
    %w[09:00 09:30 10:00].each_with_index do |time_string, index|
      api_response = create_request(
        event_type_id: event_type.id,
        booking: booking_params(
          guest_email: 'repeat@example.com',
          guest_name: "Repeat Guest #{index + 1}",
          start_time: booking_time(time_string)
        )
      )

      expect(api_response).to have_http_status(:accepted)
    end

    create_request(
      event_type_id: event_type.id,
      booking: booking_params(
        guest_email: 'repeat@example.com',
        guest_name: 'Repeat Guest 4',
        start_time: booking_time('10:30')
      )
    )

    expect(response).to have_http_status(:too_many_requests)
    expect(response.parsed_body.dig('error', 'code')).to eq('BOOKING_BLOCKED')
    expect(BookingAbuseLog.where(rule_violated: 'email_rate_limit').count).to be >= 1
  end

  it 'limits repeated booking attempts per IP address' do
    wide_event_type = create(
      :event_type,
      user: host,
      title: 'Wide Availability Call',
      duration: 30,
      location: 'Zoom',
      is_active: true,
      availability: {
        'Wednesday' => [
          { 'start' => '09:00', 'end' => '15:00' }
        ]
      }
    )

    %w[09:00 09:30 10:00 10:30 11:00].each_with_index do |time_string, index|
      api_response = create_request(
        event_type_id: wide_event_type.id,
        booking: booking_params(
          guest_email: "ip#{index + 1}@example.com",
          guest_name: "IP Guest #{index + 1}",
          start_time: booking_time(time_string)
        ),
        headers: {
          'REMOTE_ADDR' => '203.0.113.25',
          'HTTP_X_FORWARDED_FOR' => '203.0.113.25',
          'HTTP_USER_AGENT' => "IP-Limit-Test/#{index + 1}"
        }
      )

      expect(api_response).to have_http_status(:accepted)
    end

    create_request(
      event_type_id: wide_event_type.id,
      booking: booking_params(
        guest_email: 'ip6@example.com',
        guest_name: 'IP Guest 6',
        start_time: booking_time('11:30')
      ),
      headers: {
        'REMOTE_ADDR' => '203.0.113.25',
        'HTTP_X_FORWARDED_FOR' => '203.0.113.25',
        'HTTP_USER_AGENT' => 'IP-Limit-Test/6'
      }
    )

    expect(response).to have_http_status(:too_many_requests)
    expect(response.parsed_body.dig('error', 'message')).to include('network')
    expect(BookingAbuseLog.where(rule_violated: 'ip_rate_limit').count).to be >= 1
  end

  it 'keeps only one active pending hold per slot and releases it after expiry' do
    first_response = create_request(
      event_type_id: event_type.id,
      booking: booking_params(
        guest_email: 'hold1@example.com',
        start_time: booking_time('09:00')
      )
    )

    expect(first_response).to have_http_status(:accepted)
    first_request = PublicBookingRequest.last

    create_request(
      event_type_id: event_type.id,
      booking: booking_params(
        guest_email: 'hold2@example.com',
        start_time: booking_time('09:00')
      )
    )

    expect(response).to have_http_status(:conflict)
    expect(response.parsed_body.dig('error', 'code')).to eq('SLOT_HOLD_ACTIVE')

    first_request.update!(verification_expires_at: 1.minute.ago)
    ExpirePublicBookingRequestsJob.perform_now

    create_request(
      event_type_id: event_type.id,
      booking: booking_params(
        guest_email: 'hold2@example.com',
        start_time: booking_time('09:00')
      )
    )

    expect(response).to have_http_status(:accepted)
  end

  it 'locks out repeated invalid verification attempts' do
    request_id, = create_verification_request(event_type_id: event_type.id)

    5.times do
      post "/api/v1/public/event_types/#{event_type.id}/bookings/verify", params: {
        booking: {
          booking_request_id: request_id,
          verification_code: '000000'
        }
      }
    end

    expect(response).to have_http_status(:too_many_requests)
    expect(response.parsed_body.dig('error', 'code')).to eq('VERIFICATION_LOCKED')
  end

  it 'returns a meeting link error when Google Meet authorization is missing during verification' do
    google_meet_event_type = create(
      :event_type,
      user: host,
      title: 'GMeet Discovery',
      duration: 30,
      location: 'Google Meet',
      is_active: true,
      availability: {
        'Wednesday' => [
          { 'start' => '09:00', 'end' => '11:00' }
        ]
      }
    )

    allow_any_instance_of(Events::GoogleMeetLinkService)
      .to receive(:call)
      .and_return(Events::GoogleMeetLinkService::Result.new(success?: false, error: 'Google account is not connected'))

    request_id, code, = create_verification_request(event_type_id: google_meet_event_type.id)

    post "/api/v1/public/event_types/#{google_meet_event_type.id}/bookings/verify", params: {
      booking: {
        booking_request_id: request_id,
        verification_code: code
      }
    }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body.dig('error', 'code')).to eq('MEETING_LINK_ERROR')
    expect(response.parsed_body.dig('error', 'message')).to include('Google account is not connected')
  end

  it 'accepts authenticated users without requiring login' do
    logged_in = create(:user)

    post "/api/v1/public/event_types/#{event_type.id}/bookings", params: {
      booking: booking_params(guest_email: logged_in.email)
    }, headers: { 'Authorization' => "Bearer #{logged_in.generate_token}" }

    expect(response).to have_http_status(:accepted)
    expect(response.parsed_body.dig('data', 'guest', 'email')).to eq(logged_in.email)
  end

  it 'rejects bookings outside event-specific availability' do
    post "/api/v1/public/event_types/#{event_type.id}/bookings", params: {
      booking: booking_params(start_time: '2026-05-06T23:00:00Z')
    }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body.dig('error', 'message')).to include('outside your availability slots')
  end

  it 'rejects double bookings for the same time slot after verification' do
    request_id, code, = create_verification_request(event_type_id: event_type.id)

    post "/api/v1/public/event_types/#{event_type.id}/bookings/verify", params: {
      booking: {
        booking_request_id: request_id,
        verification_code: code
      }
    }

    expect(response).to have_http_status(:created)

    post "/api/v1/public/event_types/#{event_type.id}/bookings", params: {
      booking: booking_params(guest_name: 'Second Guest', guest_email: 'second@example.com')
    }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body.dig('error', 'message')).to include('conflicts with an existing event')
  end

  it 'rejects off-grid times that do not match a generated slot' do
    post "/api/v1/public/event_types/#{event_type.id}/bookings", params: {
      booking: booking_params(
        guest_name: 'Off Grid Guest',
        guest_email: 'offgrid@example.com',
        start_time: '2026-04-29T09:15:00Z'
      )
    }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body.dig('error', 'message')).to include('Selected time is no longer available')
  end

  it 'accepts a host-local slot when guest uses Asia/Calcutta alias timezone' do
    ist_host = create(:user, full_name: 'IST Host', timezone: 'Asia/Kolkata')
    ist_event_type = create(
      :event_type,
      user: ist_host,
      title: 'IST Discovery Call',
      duration: 30,
      location: 'Zoom',
      is_active: true,
      availability: {
        'slots' => [
          {
            'day_of_week' => 2,
            'start_time' => '09:00',
            'end_time' => '17:00',
            'is_active' => true
          }
        ]
      }
    )

    request_id, code, = create_verification_request(
      event_type_id: ist_event_type.id,
      booking: booking_params(
        guest_name: 'IST Guest',
        guest_email: 'istguest@example.com',
        start_time: '2026-05-06T09:00:00+05:30',
        timezone: 'Asia/Calcutta'
      )
    )

    post "/api/v1/public/event_types/#{ist_event_type.id}/bookings/verify", params: {
      booking: {
        booking_request_id: request_id,
        verification_code: code
      }
    }

    expect(response).to have_http_status(:created)
    body = response.parsed_body
    expect(body['success']).to be(true)

    booking = Event.find(body.dig('data', 'booking', 'id'))
    expect(booking.start_time.utc.iso8601).to eq('2026-05-06T03:30:00Z')
    expect(booking.end_time.utc.iso8601).to eq('2026-05-06T04:00:00Z')
  end
end
