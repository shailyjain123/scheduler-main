require "rails_helper"

RSpec.describe "Api::V1::Invitees", type: :request do
  let(:host) { create(:user) }
  let(:token) { host.generate_token }
  let(:headers) { { "Authorization" => "Bearer #{token}" } }
  let(:event_type) { create(:event_type, user: host) }
  let(:event_start) { 2.days.from_now.change(hour: 10, min: 0, sec: 0) }
  let(:event_end) { event_start + 1.hour }
  let!(:event) do
    Event.create!(
      user: host,
      event_type: event_type,
      title: "Invitees API Event",
      location: "Zoom",
      start_time: event_start,
      end_time: event_end,
      status: "completed",
      metadata: {}
    )
  end

  before do
    ActiveJob::Base.queue_adapter = :test
  end

  describe "POST /api/v1/events/:event_id/invitees" do
    it "creates an invitee and enqueues invite email" do
      expect do
        post "/api/v1/events/#{event.id}/invitees", params: {
          invitee: {
            email: "guest@example.com",
            name: "Guest"
          }
        }, headers: headers
      end.to change(EventInvitee, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(ActiveJob::Base.queue_adapter.enqueued_jobs.last[:job]).to eq(InviteeNotificationJob)
    end

    it "rejects duplicate invitee email" do
      EventInvitee.create!(event: event, email: "guest@example.com", status: "pending")

      post "/api/v1/events/#{event.id}/invitees", params: {
        invitee: {
          email: "guest@example.com",
          name: "Guest"
        }
      }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body.dig("error", "message")).to include("Invitee already added")
    end
  end

  describe "GET /api/v1/events/:event_id/invitees" do
    it "returns invitees with summary meta" do
      EventInvitee.create!(event: event, email: "a@example.com", status: "accepted")
      EventInvitee.create!(event: event, email: "b@example.com", status: "declined")
      EventInvitee.create!(event: event, email: "d@example.com", status: "maybe")
      EventInvitee.create!(event: event, email: "c@example.com", status: "pending")

      get "/api/v1/events/#{event.id}/invitees", headers: headers

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body.dig("meta", "total")).to eq(4)
      expect(body.dig("meta", "accepted")).to eq(1)
      expect(body.dig("meta", "declined")).to eq(1)
      expect(body.dig("meta", "maybe")).to eq(1)
      expect(body.dig("meta", "pending")).to eq(1)
    end
  end
end
