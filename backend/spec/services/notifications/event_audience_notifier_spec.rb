require "rails_helper"

RSpec.describe Notifications::EventAudienceNotifier, type: :service do
  include ActiveSupport::Testing::TimeHelpers

  describe "meeting update message formatting" do
    let(:host) { create(:user, full_name: "Host User") }
    let(:guest) { create(:user, email: "guest@example.com") }
    let(:event_type) { create(:event_type, user: host) }
    let(:event) do
      Event.create!(
        user: host,
        event_type: event_type,
        title: "Old title",
        location: "Room A",
        start_time: "2026-04-08T09:00:00Z",
        end_time: "2026-04-08T10:00:00Z",
        status: "scheduled",
        metadata: {}
      )
    end

    before do
      travel_to Time.utc(2026, 4, 1, 8)
      AvailabilitySchedule.create!(
        user: host,
        day_of_week: 3, # Wednesday, 2026-04-08
        start_time: "00:00",
        end_time: "23:59",
        is_active: true,
        timezone: "UTC"
      )
      EventInvitee.create!(event: event, email: guest.email, user: guest, status: "pending")
    end

    after { travel_back }

    it "creates a concise human-readable update message with changed fields and new values" do
      described_class.call(
        event: event,
        kind: :updated,
        actor: host,
        change_summary: {
          "title" => { "from" => "Old title", "to" => "Team Sync" },
          "end_time" => { "from" => "2026-04-08T10:00:00Z", "to" => "2026-04-08T17:00:00Z" }
        }
      )

      host_message = host.notifications.order(:created_at).last.description
      guest_message = guest.notifications.order(:created_at).last.description

      expected = "Host User updated the meeting: title changed to 'Team Sync', end time moved to 5:00 PM UTC."
      expect(host_message).to eq(expected)
      expect(guest_message).to eq(expected)
    end
    it "creates a clear human-readable creation message" do
      described_class.call(
        event: event,
        kind: :created,
        actor: host
      )

      host_message = host.notifications.order(:created_at).last.description
      # expected: "{user_name} created a meeting: ‘{title}’ at {start_time}."
      # event title is "Old title", start_time is "2026-04-08T09:00:00Z" -> 9:00 AM UTC
      expected = "Host User created a meeting: 'Old title' at 9:00 AM UTC."
      expect(host_message).to eq(expected)
    end

    it "describes a guest booking with the guest name" do
      event.update!(metadata: { "guest_name" => "Alex Guest" })

      described_class.call(
        event: event,
        kind: :booked,
        actor: nil
      )

      host_notification = host.notifications.order(:created_at).last
      expect(host_notification.event_name).to eq("meeting.booked")
      expect(host_notification.title).to eq("New meeting booked")
      expect(host_notification.description).to eq("Alex Guest booked a meeting: 'Old title' at 9:00 AM UTC.")
    end
  end
end
