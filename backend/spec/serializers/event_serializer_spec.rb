require 'rails_helper'

RSpec.describe EventSerializer do
  let(:user) { create(:user) }
  let!(:availability_schedules) do
    (0..6).map do |day_of_week|
      user.availability_schedules.create!(
        day_of_week: day_of_week,
        start_time: '08:00',
        end_time: '18:00',
        is_active: true,
        timezone: 'UTC'
      )
    end
  end
  let(:event_type) do
    create(
      :event_type,
      user: user,
      title: 'Demo',
      duration: 30,
      location: 'Zoom',
      description: 'Demo event',
      color: '#5C6EFF'
    )
  end

  describe '#as_json' do
    it 'serializes attendees from metadata.attendees' do
      attendees = [ { 'name' => 'Alice', 'email' => 'alice@example.com' } ]
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Planning Session',
        location: 'Zoom',
        start_time: Time.zone.parse('2026-04-08 09:00:00 UTC'),
        end_time: Time.zone.parse('2026-04-08 10:00:00 UTC'),
        status: 'scheduled',
        metadata: { 'attendees' => attendees }
      )

      serialized = described_class.new(event).as_json
      expect(serialized[:attendees]).to eq(attendees)
    end

    it 'falls back to metadata.guests for legacy records' do
      guests = [ { 'name' => 'Bob', 'email' => 'bob@example.com' } ]
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Legacy Session',
        location: 'Google Meet',
        start_time: Time.zone.parse('2026-04-08 11:00:00 UTC'),
        end_time: Time.zone.parse('2026-04-08 12:00:00 UTC'),
        status: 'scheduled',
        metadata: { 'guests' => guests }
      )

      serialized = described_class.new(event).as_json
      expect(serialized[:attendees]).to eq(guests)
    end

    it 'normalizes string and nested attendee payloads' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Imported Session',
        location: 'Google Meet',
        start_time: Time.zone.parse('2026-04-09 09:00:00 UTC'),
        end_time: Time.zone.parse('2026-04-09 10:00:00 UTC'),
        status: 'scheduled',
        metadata: {
          'attendees' => [
            'alice@example.com',
            { 'emailAddress' => { 'address' => 'bob@example.com', 'name' => 'Bob' } },
            { 'email' => 'alice@example.com', 'name' => 'Alice Duplicate' }
          ]
        }
      )

      serialized = described_class.new(event).as_json
      expect(serialized[:attendees]).to eq([
        { 'name' => 'alice', 'email' => 'alice@example.com' },
        { 'name' => 'Bob', 'email' => 'bob@example.com' }
      ])
    end

    it 'uses metadata location fallback for phone and offline meetings' do
      phone_event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Phone Session',
        location: 'Phone Call',
        start_time: Time.zone.parse('2026-04-10 09:00:00 UTC'),
        end_time: Time.zone.parse('2026-04-10 10:00:00 UTC'),
        status: 'scheduled',
        metadata: { 'invitee_phone' => '+919999999999' }
      )

      offline_event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Offline Session',
        location: 'Offline (In-person meeting)',
        start_time: Time.zone.parse('2026-04-11 09:00:00 UTC'),
        end_time: Time.zone.parse('2026-04-11 10:00:00 UTC'),
        status: 'scheduled',
        metadata: { 'in_person_location' => '221B Baker Street, London' }
      )

      expect(described_class.new(phone_event).as_json[:location]).to eq('+919999999999')
      expect(described_class.new(offline_event).as_json[:location]).to eq('221B Baker Street, London')
    end

    it 'exposes meeting_link from metadata when available' do
      event = Event.create!(
        user: user,
        event_type: event_type,
        title: 'Conference Session',
        location: 'Google Meet',
        start_time: Time.zone.parse('2026-04-12 09:00:00 UTC'),
        end_time: Time.zone.parse('2026-04-12 10:00:00 UTC'),
        status: 'scheduled',
        metadata: { 'meeting_link' => 'https://meet.google.com/abc-defg-hij' }
      )

      serialized = described_class.new(event).as_json
      expect(serialized[:meeting_link]).to eq('https://meet.google.com/abc-defg-hij')
    end
  end
end
