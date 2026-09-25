require "rails_helper"

RSpec.describe Notifications::CreateService, type: :service do
  let(:user) { create(:user) }

  it "creates a notification" do
    result = described_class.call(
      user: user,
      event_name: "event.created",
      category: "meetings",
      title: "Event created",
      description: "A new event was created.",
      action_url: "/meetings"
    )

    expect(result.success?).to eq(true)
    expect(result.grouped).to eq(false)
    expect(result.notification).to be_present
    expect(result.notification.user_id).to eq(user.id)
  end

  it "groups repeated events using group_key" do
    first = described_class.call(
      user: user,
      event_name: "event.updated",
      category: "meetings",
      title: "Event updated",
      description: "Event has changes",
      group_key: "event-updated:42",
      group_window: 1.hour
    )

    second = described_class.call(
      user: user,
      event_name: "event.updated",
      category: "meetings",
      title: "Event updated",
      description: "Event has changes",
      group_key: "event-updated:42",
      group_window: 1.hour
    )

    expect(first.success?).to eq(true)
    expect(second.success?).to eq(true)
    expect(second.grouped).to eq(true)
    expect(user.notifications.count).to eq(1)
    expect(user.notifications.first.grouped_count).to eq(2)
  end
end
