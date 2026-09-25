require "rails_helper"

RSpec.describe EventInvitee, type: :model do
  let(:host) { create(:user) }
  let(:event_type) { create(:event_type, user: host) }
  let(:event) do
    Event.create!(
      user: host,
      event_type: event_type,
      title: "Invitee Test Event",
      location: "Zoom",
      start_time: 2.days.from_now.change(hour: 10),
      end_time: 2.days.from_now.change(hour: 11),
      status: "completed",
      metadata: {}
    )
  end

  it "generates a token on create" do
    invitee = described_class.create!(event: event, email: "person@example.com", status: "pending")

    expect(invitee.token).to be_present
  end

  it "enforces unique email per event" do
    described_class.create!(event: event, email: "person@example.com", status: "pending")
    duplicate = described_class.new(event: event, email: "person@example.com", status: "pending")

    expect(duplicate).not_to be_valid
    expect(duplicate.errors.full_messages.to_sentence).to include("Invitee already added")
  end

  it "restricts status values" do
    invitee = described_class.new(event: event, email: "person@example.com", status: "unknown")

    expect(invitee).not_to be_valid
    expect(invitee.errors[:status]).to be_present
  end

  it "allows maybe status" do
    invitee = described_class.new(event: event, email: "person2@example.com", status: "maybe")

    expect(invitee).to be_valid
  end
end
