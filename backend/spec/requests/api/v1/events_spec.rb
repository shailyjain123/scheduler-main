require 'rails_helper'

RSpec.describe 'Api::V1::Events', type: :request do
  describe 'POST /api/v1/events' do
    let(:user) { create(:user) }
    let(:token) { user.generate_token }
    let(:headers) { { 'Authorization' => "Bearer #{token}" } }
    let!(:availability_schedule) do
      user.availability_schedules.create!(
        day_of_week: 4,
        start_time: '09:00',
        end_time: '17:00',
        is_active: true,
        timezone: 'UTC'
      )
    end
    let(:attendees) do
      [
        { 'name' => 'Alice', 'email' => 'alice@example.com' },
        { 'name' => 'Bob', 'email' => 'bob@example.com' }
      ]
    end

    before do
      ActiveJob::Base.queue_adapter = :test
    end

    it 'creates an event and returns attendees from metadata.attendees' do
      post '/api/v1/events', params: {
        event: {
          title: 'Planning Session',
          location: 'Zoom',
          start_time: '2026-04-08T09:00:00Z',
          end_time: '2026-04-08T10:00:00Z',
          status: 'scheduled',
          metadata: {
            attendees: attendees,
            type: 'group'
          }
        }
      }, headers: headers

      expect(response).to have_http_status(:created)
      body = response.parsed_body

      expect(body['success']).to be(true)
      expect(body.dig('data', 'attendees')).to eq(attendees)

      created_event = Event.find(body.dig('data', 'id'))
      expect(created_event.metadata['attendees']).to eq(attendees)
    end

    it 'persists event description on create and returns it in the response' do
      post '/api/v1/events', params: {
        event: {
          title: 'Planning Session',
          description: "Discuss roadmap milestones\nand blockers",
          location: 'Zoom',
          start_time: '2026-04-08T09:00:00Z',
          end_time: '2026-04-08T10:00:00Z',
          status: 'scheduled'
        }
      }, headers: headers

      expect(response).to have_http_status(:created)
      body = response.parsed_body

      expect(body.dig('data', 'description')).to eq("Discuss roadmap milestones\nand blockers")

      created_event = Event.find(body.dig('data', 'id'))
      expect(created_event.description).to eq("Discuss roadmap milestones\nand blockers")
    end

    it 'accepts top-level attendees and persists them into metadata.attendees' do
      post '/api/v1/events', params: {
        event: {
          title: 'Planning Session',
          location: 'Zoom',
          start_time: '2026-04-08T09:00:00Z',
          end_time: '2026-04-08T10:00:00Z',
          status: 'scheduled',
          attendees: attendees
        }
      }, headers: headers

      expect(response).to have_http_status(:created)
      body = response.parsed_body

      expect(body['success']).to be(true)
      expect(body.dig('data', 'attendees')).to eq(attendees)

      created_event = Event.find(body.dig('data', 'id'))
      expect(created_event.metadata['attendees']).to eq(attendees)
    end

    it 'ignores event_type_id from input and uses a user-owned event type internally' do
      owned_type = create(:event_type, user: user, title: 'Owned Type', duration: 45, location: 'Zoom')
      foreign_type = create(:event_type)

      post '/api/v1/events', params: {
        event: {
          event_type_id: foreign_type.id,
          title: 'Type Ignored Session',
          location: 'Zoom',
          start_time: '2026-04-08T09:00:00Z',
          end_time: '2026-04-08T10:00:00Z',
          status: 'scheduled'
        }
      }, headers: headers

      expect(response).to have_http_status(:created)
      body = response.parsed_body

      created_event = Event.find(body.dig('data', 'id'))
      expect(created_event.event_type_id).to eq(owned_type.id)
    end

    it 'parses local ISO timestamps using metadata.event_timezone and stores UTC in DB' do
      post '/api/v1/events', params: {
        event: {
          title: 'IST Planning Session',
          location: 'Zoom',
          start_time: '2026-04-08T19:00:00',
          end_time: '2026-04-08T20:00:00',
          status: 'scheduled',
          metadata: {
            event_timezone: 'Asia/Kolkata'
          }
        }
      }, headers: headers

      expect(response).to have_http_status(:created)
      body = response.parsed_body
      created_event = Event.find(body.dig('data', 'id'))

      expect(created_event.start_time.utc.iso8601).to eq('2026-04-08T13:30:00Z')
      expect(created_event.end_time.utc.iso8601).to eq('2026-04-08T14:30:00Z')
      expect(body.dig('data', 'start_time')).to eq('2026-04-08T13:30:00Z')
      expect(body.dig('data', 'end_time')).to eq('2026-04-08T14:30:00Z')
    end

    it 'rejects event creation outside availability slots' do
      post '/api/v1/events', params: {
        event: {
          title: 'Late Session',
          location: 'Zoom',
          start_time: '2026-04-08T18:00:00Z',
          end_time: '2026-04-08T19:00:00Z',
          status: 'scheduled'
        }
      }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      body = response.parsed_body

      expect(body['success']).to be(false)
      expect(body.dig('error', 'message')).to include('outside your availability slots')
    end

    it 'creates a per-event Google Meet link when google_meet integration is connected' do
      user.update!(integrations: { 'connected' => [ 'google_meet' ] })
      allow_any_instance_of(Events::GoogleMeetLinkService)
        .to receive(:call)
        .and_return(Events::GoogleMeetLinkService::Result.new(success?: true, link: 'https://meet.google.com/real-room-001'))

      post '/api/v1/events', params: {
        event: {
          title: 'Google Meet Session',
          location: 'Google Meet',
          start_time: '2026-04-08T09:00:00Z',
          end_time: '2026-04-08T10:00:00Z',
          status: 'scheduled'
        }
      }, headers: headers

      expect(response).to have_http_status(:created)
      body = response.parsed_body
      expect(body.dig('data', 'meeting_link')).to eq('https://meet.google.com/real-room-001')
    end

    it 'returns error when google_meet location is selected but real link cannot be created' do
      user.update!(integrations: { 'connected' => [ 'google_meet' ] })
      allow_any_instance_of(Events::GoogleMeetLinkService)
        .to receive(:call)
        .and_return(Events::GoogleMeetLinkService::Result.new(success?: false, error: 'Google API failure'))

      post '/api/v1/events', params: {
        event: {
          title: 'Google Meet Session',
          location: 'Google Meet',
          start_time: '2026-04-08T09:00:00Z',
          end_time: '2026-04-08T10:00:00Z',
          status: 'scheduled'
        }
      }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      body = response.parsed_body
      expect(body.dig('error', 'message')).to include('Google API failure')
    end

    it 'creates invitees from event.invitees and queues invite emails' do
      expect do
        post '/api/v1/events', params: {
          event: {
            title: 'Invitee Session',
            location: 'Zoom',
            start_time: '2026-04-08T09:00:00Z',
            end_time: '2026-04-08T10:00:00Z',
            status: 'scheduled',
            invitees: [
              { email: 'guest1@example.com', name: 'Guest One' },
              { email: 'guest2@example.com', name: 'Guest Two' }
            ]
          }
        }, headers: headers
      end.to change(EventInvitee, :count).by(2)

      expect(response).to have_http_status(:created)
      expect(ActiveJob::Base.queue_adapter.enqueued_jobs.count { |job| job[:job] == InviteeNotificationJob }).to be >= 2
    end

    it 'creates invitees from attendees payload and queues invite emails' do
      expect do
        post '/api/v1/events', params: {
          event: {
            title: 'Attendee Invite Session',
            location: 'Zoom',
            start_time: '2026-04-08T09:00:00Z',
            end_time: '2026-04-08T10:00:00Z',
            status: 'scheduled',
            attendees: [
              { name: 'Guest A', email: 'guesta@example.com' },
              { name: 'Guest B', email: 'guestb@example.com' }
            ]
          }
        }, headers: headers
      end.to change(EventInvitee, :count).by(2)

      expect(response).to have_http_status(:created)
      expect(ActiveJob::Base.queue_adapter.enqueued_jobs.count { |job| job[:job] == InviteeNotificationJob }).to be >= 2
    end

    it 'links registered invitees and keeps unregistered invitees with nil user_id' do
      registered = create(:user, email: 'known@example.com')

      post '/api/v1/events', params: {
        event: {
          title: 'Mixed Invitees Session',
          location: 'Zoom',
          start_time: '2026-04-08T09:00:00Z',
          end_time: '2026-04-08T10:00:00Z',
          status: 'scheduled',
          invitees: [
            { email: registered.email, name: 'Known User' },
            { email: 'external@example.com', name: 'External Guest' }
          ]
        }
      }, headers: headers

      expect(response).to have_http_status(:created)
      created_event_id = response.parsed_body.dig('data', 'id')
      invitees = EventInvitee.where(event_id: created_event_id).order(:email)

      expect(invitees.map(&:email)).to eq(%w[external@example.com known@example.com])
      expect(invitees.find { |i| i.email == 'known@example.com' }&.user_id).to eq(registered.id)
      expect(invitees.find { |i| i.email == 'external@example.com' }&.user_id).to be_nil
      expect(ActiveJob::Base.queue_adapter.enqueued_jobs.count { |job| job[:job] == InviteeNotificationJob }).to be >= 2
    end
  end

  describe 'GET /api/v1/events' do
    let(:user) do
      User.create!(
        email: 'events-index@example.com',
        password: 'ValidPass1!',
        full_name: 'Events Index User',
        status: 'active',
        email_verified_at: Time.current,
        plan_type: 'free'
      )
    end
    let(:token) { user.generate_token }
    let(:headers) { { 'Authorization' => "Bearer #{token}" } }
    let(:event_type) { create(:event_type, user: user, title: 'Discovery Call', duration: 30, location: 'Zoom') }

    it 'preloads invitees to avoid one query per event' do
      3.times do |index|
        event = Event.create!(
          user: user,
          event_type: event_type,
          title: "Session #{index + 1}",
          location: 'Zoom',
          start_time: format('2026-05-07T%02d:00:00Z', 9 + index),
          end_time: format('2026-05-07T%02d:30:00Z', 9 + index),
          status: 'cancelled',
          metadata: {
            'attendees' => [
              { 'name' => "Guest #{index + 1}A", 'email' => "guest#{index + 1}a@example.com" },
              { 'name' => "Guest #{index + 1}B", 'email' => "guest#{index + 1}b@example.com" }
            ]
          }
        )

        EventInvitee.create!(
          event: event,
          name: "Invitee #{index + 1}",
          email: "invitee#{index + 1}@example.com",
          token: SecureRandom.urlsafe_base64(32),
          status: 'pending'
        )
      end

      invitee_queries = []

      subscriber = lambda do |_name, _started, _finished, _id, payload|
        invitee_queries << payload if payload[:name] == 'EventInvitee Load'
      end

      ActiveSupport::Notifications.subscribed(subscriber, 'sql.active_record') do
        get '/api/v1/events', headers: headers
      end

      expect(response).to have_http_status(:ok)
      expect(invitee_queries.size).to eq(1)
    end
  end

  describe 'PATCH /api/v1/events/:id' do
    let(:user) { create(:user) }
    let(:token) { user.generate_token }
    let(:headers) { { 'Authorization' => "Bearer #{token}" } }
    let!(:availability_schedule) do
      user.availability_schedules.create!(
        day_of_week: 3,
        start_time: '09:00',
        end_time: '17:00',
        is_active: true,
        timezone: 'UTC'
      )
    end
    let(:event_type) do
      create(
        :event_type,
        user: user,
        title: 'Discovery Call',
        duration: 30,
        location: 'Zoom',
        description: 'Intro call'
      )
    end

    before do
      ActiveJob::Base.queue_adapter = :test
    end

    it 'removes meeting link on cancel but keeps attendees metadata' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Session',
        location: 'Google Meet',
        start_time: '2026-04-08T09:00:00Z',
        end_time: '2026-04-08T10:00:00Z',
        status: 'scheduled',
        metadata: {
          'meeting_link' => 'https://meet.google.com/abc-defg-hij',
          'attendees' => [ { 'name' => 'Alice', 'email' => 'alice@example.com' } ]
        }
      )

      patch "/api/v1/events/#{event.id}", params: {
        event: {
          status: 'cancelled'
        }
      }, headers: headers

      expect(response).to have_http_status(:ok)

      event.reload
      expect(event.metadata['meeting_link']).to be_nil
      expect(event.metadata['attendees']).to eq([ { 'name' => 'Alice', 'email' => 'alice@example.com' } ])
    end

    it 'rejects updating event time outside availability slots' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Session',
        location: 'Google Meet',
        start_time: '2026-04-29T09:00:00Z',
        end_time: '2026-04-29T10:00:00Z',
        status: 'scheduled',
        metadata: {}
      )

      patch "/api/v1/events/#{event.id}", params: {
        event: {
          start_time: '2026-04-08T18:00:00Z',
          end_time: '2026-04-08T19:00:00Z'
        }
      }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      body = response.parsed_body

      expect(body['success']).to be(false)
      expect(body.dig('error', 'message')).to include('outside your availability slots')
    end

    it 'keeps meeting_link immutable after event creation' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Session',
        location: 'Google Meet',
        start_time: '2026-04-08T09:00:00Z',
        end_time: '2026-04-08T10:00:00Z',
        status: 'scheduled',
        metadata: {
          'meeting_link' => 'https://meet.google.com/original-link'
        }
      )

      patch "/api/v1/events/#{event.id}", params: {
        event: {
          metadata: {
            meeting_link: 'https://meet.google.com/changed-link'
          }
        }
      }, headers: headers

      expect(response).to have_http_status(:ok)
      event.reload
      expect(event.metadata['meeting_link']).to eq('https://meet.google.com/original-link')
    end

    it 'updates event description through the API' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Session',
        description: 'Original description',
        location: 'Zoom',
        start_time: '2026-04-08T09:00:00Z',
        end_time: '2026-04-08T10:00:00Z',
        status: 'scheduled',
        metadata: {}
      )

      patch "/api/v1/events/#{event.id}", params: {
        event: {
          description: 'Updated description for attendees'
        }
      }, headers: headers

      expect(response).to have_http_status(:ok)
      event.reload
      expect(event.description).to eq('Updated description for attendees')
      expect(response.parsed_body.dig('data', 'description')).to eq('Updated description for attendees')
    end

    it 'rejects restoring cancelled events when they are not upcoming' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Cancelled Session',
        location: 'Google Meet',
        start_time: '2026-04-08T09:00:00Z',
        end_time: '2026-04-08T10:00:00Z',
        status: 'cancelled',
        metadata: {}
      )

      patch "/api/v1/events/#{event.id}", params: {
        event: {
          status: 'scheduled'
        }
      }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      body = response.parsed_body
      expect(body.dig('error', 'message')).to include('Only upcoming cancelled events can be restored')
    end

    it 'allows cancelling an upcoming scheduled event' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Upcoming Session',
        location: 'Google Meet',
        start_time: '2026-05-06T09:00:00Z',
        end_time: '2026-05-06T10:00:00Z',
        status: 'scheduled',
        metadata: {}
      )

      patch "/api/v1/events/#{event.id}", params: {
        event: { status: 'cancelled' }
      }, headers: headers

      expect(response).to have_http_status(:ok)
      event.reload
      expect(event.status).to eq('cancelled')
      expect(event.metadata['status_history'].last['to']).to eq('cancelled')
    end

    it 'restores upcoming cancelled event back to scheduled and records status history' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Upcoming Cancelled Session',
        location: 'Google Meet',
        start_time: '2026-05-06T09:00:00Z',
        end_time: '2026-05-06T10:00:00Z',
        status: 'cancelled',
        metadata: {}
      )

      patch "/api/v1/events/#{event.id}", params: {
        event: { status: 'scheduled' }
      }, headers: headers

      expect(response).to have_http_status(:ok)
      event.reload
      expect(event.status).to eq('scheduled')
      expect(event.metadata['status_changed_at']).to be_present
      expect(event.metadata['status_history'].last['from']).to eq('cancelled')
      expect(event.metadata['status_history'].last['to']).to eq('scheduled')
    end

    it 'marks past scheduled event as completed and records status history' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Past Session',
        location: 'Google Meet',
        start_time: Time.zone.parse('2026-04-29 09:00:00 UTC'),
        end_time: Time.zone.parse('2026-04-29 10:00:00 UTC'),
        status: 'scheduled',
        metadata: {}
      )

      patch "/api/v1/events/#{event.id}", params: {
        event: { status: 'completed' }
      }, headers: headers

      expect(response).to have_http_status(:ok)
      event.reload
      expect(event.status).to eq('completed')
      expect(event.metadata['status_changed_at']).to be_present
      expect(event.metadata['status_history'].last['to']).to eq('completed')
    end

    it 'marks past scheduled event as cancelled and records status history' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Past Session',
        location: 'Google Meet',
        start_time: Time.zone.parse('2026-04-29 09:00:00 UTC'),
        end_time: Time.zone.parse('2026-04-29 10:00:00 UTC'),
        status: 'scheduled',
        metadata: {}
      )

      patch "/api/v1/events/#{event.id}", params: {
        event: { status: 'cancelled' }
      }, headers: headers

      expect(response).to have_http_status(:ok)
      event.reload
      expect(event.status).to eq('cancelled')
      expect(event.metadata['status_changed_at']).to be_present
      expect(event.metadata['status_history'].last['to']).to eq('cancelled')
    end

    it 'rejects marking future scheduled event as completed' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Future Session',
        location: 'Google Meet',
        start_time: '2026-05-06T09:00:00Z',
        end_time: '2026-05-06T10:00:00Z',
        status: 'scheduled',
        metadata: {}
      )

      patch "/api/v1/events/#{event.id}", params: {
        event: { status: 'completed' }
      }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body.dig('error', 'message')).to include('Only past events can be marked as completed')
    end

    it 'resets invitee statuses and queues update emails when event time changes' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Session',
        location: 'Google Meet',
        start_time: '2026-04-08T09:00:00Z',
        end_time: '2026-04-08T10:00:00Z',
        status: 'scheduled',
        metadata: {}
      )

      invitee = EventInvitee.create!(event: event, email: 'guest@example.com', status: 'accepted', responded_at: Time.current)

      patch "/api/v1/events/#{event.id}", params: {
        event: {
          start_time: '2026-04-08T10:00:00Z',
          end_time: '2026-04-08T11:00:00Z'
        }
      }, headers: headers

      expect(response).to have_http_status(:ok)
      invitee.reload
      expect(invitee.status).to eq('pending')
      expect(invitee.responded_at).to be_nil
      expect(ActiveJob::Base.queue_adapter.enqueued_jobs.any? do |job|
        job[:job] == InviteeNotificationJob && job[:args].to_s.include?('update')
      end).to be(true)
    end

    it 'does not queue update emails when only invitee list changes' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Session',
        location: 'Google Meet',
        start_time: '2026-04-08T09:00:00Z',
        end_time: '2026-04-08T10:00:00Z',
        status: 'scheduled',
        metadata: {}
      )

      EventInvitee.create!(event: event, email: 'existing@example.com', status: 'pending')

      patch "/api/v1/events/#{event.id}", params: {
        event: {
          invitees: [
            { email: 'existing@example.com', name: 'Existing Guest' },
            { email: 'new@example.com', name: 'New Guest' }
          ]
        }
      }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(ActiveJob::Base.queue_adapter.enqueued_jobs.count do |job|
        job[:job] == InviteeNotificationJob && job[:args].to_s.include?('update')
      end).to eq(0)
      expect(ActiveJob::Base.queue_adapter.enqueued_jobs.count do |job|
        job[:job] == InviteeNotificationJob && job[:args].to_s.include?('invite')
      end).to eq(1)
    end

    it 'queues update notifications for existing and newly added invitees when event details change' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Session',
        location: 'Google Meet',
        start_time: '2026-04-08T09:00:00Z',
        end_time: '2026-04-08T10:00:00Z',
        status: 'completed',
        metadata: {}
      )

      EventInvitee.create!(event: event, email: 'existing@example.com', status: 'accepted', responded_at: Time.current)

      patch "/api/v1/events/#{event.id}", params: {
        event: {
          start_time: '2026-04-08T10:00:00Z',
          end_time: '2026-04-08T11:00:00Z',
          invitees: [
            { email: 'existing@example.com', name: 'Existing Guest' },
            { email: 'new@example.com', name: 'New Guest' }
          ]
        }
      }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(EventInvitee.where(event: event).pluck(:email).sort).to eq(%w[existing@example.com new@example.com])

      update_jobs = ActiveJob::Base.queue_adapter.enqueued_jobs.select do |job|
        job[:job] == InviteeNotificationJob && job[:args].to_s.include?('update')
      end
      total_invitee_jobs = ActiveJob::Base.queue_adapter.enqueued_jobs.count { |job| job[:job] == InviteeNotificationJob }

      expect(update_jobs.size).to eq(2)
      expect(total_invitee_jobs).to eq(2)
    end

    it 'syncs invitees from attendees payload during update' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Session',
        location: 'Google Meet',
        start_time: '2026-04-08T09:00:00Z',
        end_time: '2026-04-08T10:00:00Z',
        status: 'completed',
        metadata: {}
      )

      patch "/api/v1/events/#{event.id}", params: {
        event: {
          attendees: [
            { name: 'Guest One', email: 'guest1@example.com' },
            { name: 'Guest Two', email: 'guest2@example.com' }
          ]
        }
      }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(EventInvitee.where(event: event).pluck(:email).sort).to eq(%w[guest1@example.com guest2@example.com])
      expect(ActiveJob::Base.queue_adapter.enqueued_jobs.count { |job| job[:job] == InviteeNotificationJob }).to eq(2)
      expect(ActiveJob::Base.queue_adapter.enqueued_jobs.count do |job|
        job[:job] == InviteeNotificationJob && job[:args].to_s.include?('update')
      end).to eq(0)
    end
  end

  describe 'DELETE /api/v1/events/:id' do
    let(:user) { create(:user) }
    let(:token) { user.generate_token }
    let(:headers) { { 'Authorization' => "Bearer #{token}" } }
    let(:event_type) { create(:event_type, user: user) }
    let!(:availability_schedule) do
      user.availability_schedules.create!(
        day_of_week: 3,
        start_time: '09:00',
        end_time: '17:00',
        is_active: true,
        timezone: 'UTC'
      )
    end

    before do
      ActiveJob::Base.queue_adapter = :test
    end

    it 'cancels event, declines invitees and queues cancellation notifications' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Session',
        location: 'Google Meet',
        start_time: '2026-04-29T09:00:00Z',
        end_time: '2026-04-29T10:00:00Z',
        status: 'scheduled',
        metadata: {}
      )
      invitee = EventInvitee.create!(event: event, email: 'guest@example.com', status: 'pending')

      delete "/api/v1/events/#{event.id}", headers: headers

      expect(response).to have_http_status(:ok)
      expect(event.reload.status).to eq('cancelled')
      expect(invitee.reload.status).to eq('declined')
      expect(ActiveJob::Base.queue_adapter.enqueued_jobs.any? do |job|
        job[:job] == InviteeNotificationJob && job[:args].to_s.include?('cancel')
      end).to be(true)
    end
  end
end
