require "rails_helper"

RSpec.describe Notifications::BroadcastService, type: :service do
  let(:user) { create(:user) }

  it "publishes grouped updates on the channel the client subscribes to" do
    notification = create(:notification, user: user, title: "Meeting updated")

    described_class.call(user: user, notification: notification, event: "notification.grouped")

    payloads = ActionCable.server.pubsub.broadcasts("notifications_#{user.id}").map { |raw| JSON.parse(raw) }
    grouped = payloads.find { |payload| payload["type"] == "NOTIFICATION_UPDATED" }

    expect(grouped).to be_present
    expect(grouped["event"]).to eq("notification.grouped")
    expect(grouped.dig("notification", "title")).to eq("Meeting updated")
  end
end
