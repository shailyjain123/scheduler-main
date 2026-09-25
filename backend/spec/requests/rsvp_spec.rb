require "rails_helper"

RSpec.describe "RSVP", type: :request do
  let(:host) { create(:user) }
  let(:event_type) { create(:event_type, user: host) }
  let(:event_start) { 2.days.from_now.change(hour: 10, min: 0, sec: 0) }
  let(:event_end) { event_start + 1.hour }
  let!(:event) do
    Event.create!(
      user: host,
      event_type: event_type,
      title: "RSVP Event",
      location: "Zoom",
      start_time: event_start,
      end_time: event_end,
      status: "completed",
      metadata: {}
    )
  end
  let!(:invitee) { EventInvitee.create!(event: event, email: "guest@example.com", status: "pending") }

  before do
    ActiveJob::Base.queue_adapter = :test
  end

  it "accepts RSVP by token and updates status" do
    get "/rsvp/#{invitee.token}/accept"

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("You have accepted")
    expect(invitee.reload.status).to eq("accepted")
    expect(invitee.responded_at).to be_present
    expect(ActiveJob::Base.queue_adapter.enqueued_jobs.last[:job]).to eq(RsvpNotificationJob)
  end

  it "declines RSVP by token and updates status" do
    get "/rsvp/#{invitee.token}/decline"

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("You have declined")
    expect(invitee.reload.status).to eq("declined")
  end

  it "marks RSVP as maybe by token" do
    get "/rsvp/#{invitee.token}/maybe"

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("You responded maybe")
    expect(invitee.reload.status).to eq("maybe")
    expect(invitee.responded_at).to be_present
  end

  it "shows cancelled message" do
    event.update!(status: "cancelled")

    get "/rsvp/#{invitee.token}/accept"

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("This event has been cancelled")
  end
end
