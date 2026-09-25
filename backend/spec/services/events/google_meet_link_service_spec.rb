require 'rails_helper'

RSpec.describe Events::GoogleMeetLinkService do
  describe '#calendar_event_payload' do
    let(:user) { create(:user, timezone: 'UTC') }
    let(:event_type) { create(:event_type, user: user, title: 'Demo', duration: 60) }

    let(:event) do
      Event.new(
        user: user,
        event_type: event_type,
        title: 'Timezone Sync Test',
        description: 'Validate Google payload timezone handling',
        location: 'Google Meet',
        start_time: Time.iso8601('2026-04-07T13:30:00Z'),
        end_time: Time.iso8601('2026-04-07T14:30:00Z'),
        status: 'scheduled',
        metadata: {
          'event_timezone' => 'Asia/Kolkata'
        }
      )
    end

    it 'builds google payload with explicit timezone and local datetime offset' do
      payload = described_class.new(user: user, event: event).send(:calendar_event_payload)

      expect(payload.dig(:start, :timeZone)).to eq('Asia/Kolkata')
      expect(payload.dig(:end, :timeZone)).to eq('Asia/Kolkata')
      expect(payload.dig(:start, :dateTime)).to eq('2026-04-07T19:00:00+05:30')
      expect(payload.dig(:end, :dateTime)).to eq('2026-04-07T20:00:00+05:30')
    end
  end
end
