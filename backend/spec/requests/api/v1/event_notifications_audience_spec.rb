require "rails_helper"

RSpec.describe "Event notification audience", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  let(:host) { create(:user) }
  let(:token) { host.generate_token }
  let(:headers) { { "Authorization" => "Bearer #{token}" } }
  let!(:event_type) { create(:event_type, user: host) }
  let!(:guest_user_1) { create(:user, email: "guest1@example.com") }
  let!(:guest_user_2) { create(:user, email: "guest2@example.com") }

  before do
    travel_to Time.utc(2026, 4, 1, 8)
    ActiveJob::Base.queue_adapter = :test
    ActiveJob::Base.queue_adapter.enqueued_jobs.clear
    host.availability_schedules.create!(
      day_of_week: 3,
      start_time: "09:00",
      end_time: "18:00",
      is_active: true,
      timezone: "UTC"
    )
  end

  after { travel_back }

  it "creates host and guest notifications when event is created" do
    expect do
      post "/api/v1/events", params: {
        event: {
          title: "Audience Sync",
          location: "Zoom",
          start_time: "2026-04-08T10:00:00Z",
          end_time: "2026-04-08T11:00:00Z",
          status: "scheduled",
          invitees: [
            { email: guest_user_1.email, name: "Guest One" },
            { email: guest_user_2.email, name: "Guest Two" }
          ]
        }
      }, headers: headers
    end.to change(Notification, :count).by(3)

    expect(response).to have_http_status(:created)
    expect(host.notifications.where(event_name: "event.created").count).to eq(1)
    expect(guest_user_1.notifications.where(event_name: "event.created").count).to eq(1)
    expect(guest_user_2.notifications.where(event_name: "event.created").count).to eq(1)
    expect(Notifications::CreateJob).not_to have_been_enqueued
  end

  it "creates host and guest notifications when event is updated" do
    event = Event.create!(
      user: host,
      event_type: event_type,
      title: "Audience Sync",
      location: "Google Meet",
      start_time: "2026-04-08T10:00:00Z",
      end_time: "2026-04-08T11:00:00Z",
      status: "scheduled",
      metadata: {}
    )

    EventInvitee.create!(event: event, email: guest_user_1.email, user: guest_user_1, status: "pending")
    EventInvitee.create!(event: event, email: guest_user_2.email, user: guest_user_2, status: "pending")

    expect do
      patch "/api/v1/events/#{event.id}", params: {
        event: {
          start_time: "2026-04-08T11:00:00Z",
          end_time: "2026-04-08T12:00:00Z"
        }
      }, headers: headers
    end.to change(Notification, :count).by(3)

    expect(response).to have_http_status(:ok)
    expect(host.notifications.where(event_name: "event.updated").count).to eq(1)
    expect(guest_user_1.notifications.where(event_name: "event.updated").count).to eq(1)
    expect(guest_user_2.notifications.where(event_name: "event.updated").count).to eq(1)
  end

  it "creates host and guest notifications when event is cancelled" do
    event = Event.create!(
      user: host,
      event_type: event_type,
      title: "Audience Sync",
      location: "Google Meet",
      start_time: "2026-04-08T10:00:00Z",
      end_time: "2026-04-08T11:00:00Z",
      status: "scheduled",
      metadata: {}
    )

    EventInvitee.create!(event: event, email: guest_user_1.email, user: guest_user_1, status: "pending")
    EventInvitee.create!(event: event, email: guest_user_2.email, user: guest_user_2, status: "pending")

    expect do
      delete "/api/v1/events/#{event.id}", headers: headers
    end.to change(Notification, :count).by(3)

    expect(response).to have_http_status(:ok)
    expect(host.notifications.where(event_name: "event.cancelled").count).to eq(1)
    expect(guest_user_1.notifications.where(event_name: "event.cancelled").count).to eq(1)
    expect(guest_user_2.notifications.where(event_name: "event.cancelled").count).to eq(1)
  end
end
