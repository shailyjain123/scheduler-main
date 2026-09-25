require "rails_helper"

RSpec.describe Notifications::Dispatcher, type: :service do
  include ActiveSupport::Testing::TimeHelpers

  let(:host) { create(:user, full_name: "Host User") }
  let(:event_type) { create(:event_type, user: host) }
  let(:event) do
    Event.create!(
      user: host,
      event_type: event_type,
      title: "Intro",
      location: "Zoom",
      start_time: "2026-04-08T09:00:00Z",
      end_time: "2026-04-08T10:00:00Z",
      status: "scheduled",
      metadata: { "guest_name" => "Alex Guest" }
    )
  end

  before do
    travel_to Time.utc(2026, 4, 1, 8)
    ActiveJob::Base.queue_adapter = :test
    ActiveJob::Base.queue_adapter.enqueued_jobs.clear
    AvailabilitySchedule.create!(
      user: host,
      day_of_week: 3,
      start_time: "00:00",
      end_time: "23:59",
      is_active: true,
      timezone: "UTC"
    )
  end

  after { travel_back }

  it "routes meeting.booked through the audience notifier and does not enqueue a second writer" do
    expect {
      described_class.trigger("meeting.booked", actor: nil, target: event)
    }.to change(Notification, :count).by(1)

    notification = host.notifications.order(:created_at).last
    expect(notification.event_name).to eq("meeting.booked")
    expect(notification.title).to eq("New meeting booked")
    expect(Notifications::CreateJob).not_to have_been_enqueued
  end

  it "ignores a meeting event whose target is not an event" do
    expect {
      described_class.trigger("meeting.booked", actor: host, target: host)
    }.not_to change(Notification, :count)
  end
end
