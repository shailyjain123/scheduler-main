require 'rails_helper'

RSpec.describe 'Event Double Booking Prevention', type: :model do
  let(:user) { create(:user, timezone: 'UTC') }
  let(:event_type) { create(:event_type, user: user, duration: 30) }

  describe 'no_double_booking validation' do
    before do
      # Set up availability for all weekdays 9-5
      (1..5).each do |day|
        create(:availability_schedule,
          user: user,
          day_of_week: day,
          start_time: 540,
          end_time: 1020,
          is_active: true
        )
      end
    end

    context 'when creating non-overlapping events' do
      it 'allows the event' do
        existing_event = create(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:00'),
          end_time: Time.zone.parse('2026-04-28 10:30'),
          status: 'scheduled'
        )

        new_event = build(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 11:00'),
          end_time: Time.zone.parse('2026-04-28 11:30'),
          status: 'scheduled'
        )

        expect(new_event).to be_valid
      end
    end

    context 'when creating overlapping events' do
      it 'rejects events that fully overlap' do
        existing_event = create(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:00'),
          end_time: Time.zone.parse('2026-04-28 10:30'),
          status: 'scheduled'
        )

        new_event = build(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:00'),
          end_time: Time.zone.parse('2026-04-28 10:30'),
          status: 'scheduled'
        )

        expect(new_event).not_to be_valid
        expect(new_event.errors[:base]).to include('This time slot conflicts with an existing event')
      end

      it 'rejects events that partially overlap (start before existing end)' do
        existing_event = create(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:00'),
          end_time: Time.zone.parse('2026-04-28 10:30'),
          status: 'scheduled'
        )

        new_event = build(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:15'),
          end_time: Time.zone.parse('2026-04-28 10:45'),
          status: 'scheduled'
        )

        expect(new_event).not_to be_valid
        expect(new_event.errors[:base]).to include('This time slot conflicts with an existing event')
      end

      it 'rejects events that partially overlap (start after existing start, end before existing end)' do
        existing_event = create(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:00'),
          end_time: Time.zone.parse('2026-04-28 11:00'),
          status: 'scheduled'
        )

        new_event = build(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:15'),
          end_time: Time.zone.parse('2026-04-28 10:45'),
          status: 'scheduled'
        )

        expect(new_event).not_to be_valid
        expect(new_event.errors[:base]).to include('This time slot conflicts with an existing event')
      end

      it 'respects explicit zero buffer_before and buffer_after over legacy buffer_time' do
        event_type.update!(buffer_before: 0, buffer_after: 0, buffer_time: 10)

        create(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:00'),
          end_time: Time.zone.parse('2026-04-28 10:30'),
          status: 'scheduled'
        )

        new_event = build(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:30'),
          end_time: Time.zone.parse('2026-04-28 11:00'),
          status: 'scheduled'
        )

        expect(new_event).to be_valid
      end
    end

    context 'when updating an event' do
      it 'allows rescheduling to a non-conflicting time' do
        existing_event = create(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:00'),
          end_time: Time.zone.parse('2026-04-28 10:30'),
          status: 'scheduled'
        )

        updating_event = create(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 11:00'),
          end_time: Time.zone.parse('2026-04-28 11:30'),
          status: 'scheduled'
        )

        updating_event.update(
          start_time: Time.zone.parse('2026-04-28 14:00'),
          end_time: Time.zone.parse('2026-04-28 14:30')
        )

        expect(updating_event).to be_valid
      end
    end

    context 'when event is not scheduled' do
      it 'skips double booking validation for cancelled events' do
        existing_event = create(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:00'),
          end_time: Time.zone.parse('2026-04-28 10:30'),
          status: 'cancelled'
        )

        new_event = build(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:00'),
          end_time: Time.zone.parse('2026-04-28 10:30'),
          status: 'scheduled'
        )

        expect(new_event).to be_valid
      end

      it 'skips double booking validation for completed events' do
        existing_event = create(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:00'),
          end_time: Time.zone.parse('2026-04-28 10:30'),
          status: 'completed'
        )

        new_event = build(:event,
          user: user,
          event_type: event_type,
          start_time: Time.zone.parse('2026-04-28 10:00'),
          end_time: Time.zone.parse('2026-04-28 10:30'),
          status: 'scheduled'
        )

        expect(new_event).to be_valid
      end
    end
  end
end
