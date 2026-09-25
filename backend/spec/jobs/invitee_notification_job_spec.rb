require "rails_helper"

RSpec.describe InviteeNotificationJob, type: :job do
  let(:host) { create(:user) }
  let(:event_type) { create(:event_type, user: host) }
  let(:event) do
    Event.create!(
      user: host,
      event_type: event_type,
      title: "Notification Job Event",
      location: "Zoom",
      start_time: 2.days.from_now.change(hour: 10, min: 0, sec: 0),
      end_time: 2.days.from_now.change(hour: 11, min: 0, sec: 0),
      status: "completed",
      metadata: {}
    )
  end
  let!(:invitee) { EventInvitee.create!(event: event, email: "guest@example.com", status: "pending") }

  before do
    ActionMailer::Base.deliveries.clear
  end

  it "creates a sent notification log for invite action" do
    described_class.perform_now(invitee_id: invitee.id, action: :invite)

    log = InviteeNotificationLog.order(:created_at).last
    expect(log).to be_present
    expect(log.action).to eq("invite")
    expect(log.delivery_status).to eq("sent")
    expect(log.recipient_email).to eq("guest@example.com")
    expect(log.event_id).to eq(event.id)
    expect(log.event_invitee_id).to eq(invitee.id)
  end

  it "persists change summary on update action" do
    change_summary = {
      "start_time" => {
        "from" => "2026-04-10T09:00:00Z",
        "to" => "2026-04-10T10:00:00Z"
      }
    }

    described_class.perform_now(invitee_id: invitee.id, action: :update, change_summary: change_summary)

    log = InviteeNotificationLog.order(:created_at).last
    expect(log.action).to eq("update")
    expect(log.change_summary).to eq(change_summary)
  end
end
