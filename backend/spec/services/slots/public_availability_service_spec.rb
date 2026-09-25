require 'rails_helper'

RSpec.describe Slots::PublicAvailabilityService, type: :service do
  let(:host) { create(:user, timezone: 'UTC') }
  let(:event_type) do
    create(
      :event_type,
      user: host,
      duration: 30,
      availability: {
        'Wednesday' => [
          { 'start' => '09:00', 'end' => '11:00' }
        ]
      }
    )
  end

  describe '#call' do
    before do
      # Stub Time.current to be before the test dates to pass minimum notice validations
      allow(Time).to receive(:current).and_return(Time.utc(2026, 4, 1, 12, 0, 0))
    end

    it 'returns empty slots when the event type is inactive' do
      event_type.update!(is_active: false)

      result = described_class.new(event_type: event_type, timezone: 'UTC').call

      expect(result.available_slots).to be_empty
      expect(result.booked_times).to be_empty
    end

    it 'builds slots from event-specific availability' do
      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29),
        end_date: Date.new(2026, 4, 29)
      ).call

      expect(result.timezone).to eq('UTC')
      expect(result.event_duration).to eq(30)
      expect(result.available_slots.length).to eq(4)
      expect(result.available_slots.first[:start_time]).to eq('2026-04-29T09:00:00Z')
      expect(result.available_slots.first[:label]).to eq('09:00 AM - 09:30 AM')
      expect(result.available_slots.first[:available]).to be(true)
    end

    it 'filters out booked slots' do
      create(
        :event,
        user: host,
        event_type: event_type,
        start_time: Time.utc(2026, 4, 29, 9, 0, 0),
        end_time: Time.utc(2026, 4, 29, 9, 30, 0),
        status: 'scheduled'
      )

      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29),
        end_date: Date.new(2026, 4, 29)
      ).call

      expect(result.booked_times.length).to eq(1)
      expect(result.booked_times.first[:start_time].iso8601).to eq('2026-04-29T09:00:00Z')
      expect(result.available_slots.map { |slot| slot[:start_time] }).not_to include('2026-04-29T09:00:00Z')
    end

    it 'allows back-to-back bookings when there is no buffer' do
      # Booked from 9:00 to 9:30
      create(
        :event,
        user: host,
        event_type: event_type,
        start_time: Time.utc(2026, 4, 29, 9, 0, 0),
        end_time: Time.utc(2026, 4, 29, 9, 30, 0),
        status: 'scheduled'
      )

      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29),
        end_date: Date.new(2026, 4, 29)
      ).call

      # Next slot starting exactly at 9:30 should be available
      expect(result.available_slots.map { |s| s[:start_time] }).to include('2026-04-29T09:30:00Z')
    end

    it 'blocks both slots for a partial overlap booking' do
      # Booked from 9:15 to 9:45 should prevent both 9:00 and 9:30 slots
      create(
        :event,
        user: host,
        event_type: event_type,
        start_time: Time.utc(2026, 4, 29, 9, 15, 0),
        end_time: Time.utc(2026, 4, 29, 9, 45, 0),
        status: 'scheduled'
      )

      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29),
        end_date: Date.new(2026, 4, 29)
      ).call

      expect(result.available_slots.map { |s| s[:start_time] }).not_to include('2026-04-29T09:00:00Z')
      expect(result.available_slots.map { |s| s[:start_time] }).not_to include('2026-04-29T09:30:00Z')
    end

    it 'converts slot times into the requested timezone' do
      host.update!(timezone: 'America/New_York')
      event_type.update!(availability: {
        'Wednesday' => [
          { 'start' => '09:00', 'end' => '10:00' }
        ]
      })

      result = described_class.new(
        event_type: event_type,
        timezone: 'America/Los_Angeles',
        start_date: Date.new(2026, 4, 29),
        end_date: Date.new(2026, 4, 29)
      ).call

      expect(result.available_slots.length).to eq(2)
      expect(result.available_slots.first[:start_time]).to eq('2026-04-29T06:00:00-07:00')
      expect(result.available_slots.first[:end_time]).to eq('2026-04-29T06:30:00-07:00')
    end


    it 'builds slots from event-specific availability in the new slots format' do
      # Wednesday is wday 3. frontend day_of_week for Wednesday is 2 (0=Mon, 1=Tue, 2=Wed)
      event_type.update!(availability: {
        'slots' => [
          { 'day_of_week' => 2, 'start_time' => '09:00', 'end_time' => '10:00', 'is_active' => true }
        ]
      })

      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29), # Wednesday
        end_date: Date.new(2026, 4, 29)
      ).call

      expect(result.available_slots.length).to eq(2)
      expect(result.available_slots.first[:start_time]).to eq('2026-04-29T09:00:00Z')
    end

    it 'respects host default buffer time' do
      host.user_setting.update!(buffer_before: 15, buffer_after: 15)

      # Booked from 9:00 to 9:30
      create(
        :event,
        user: host,
        event_type: event_type,
        start_time: Time.utc(2026, 4, 29, 9, 0, 0),
        end_time: Time.utc(2026, 4, 29, 9, 30, 0),
        status: 'scheduled'
      )

      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29),
        end_date: Date.new(2026, 4, 29)
      ).call

      # Slots: 9:00 (booked), 9:30 (overlaps buffer), 10:00 (available), 10:30 (available)
      expect(result.available_slots.map { |s| s[:start_time] }).to eq([ '2026-04-29T10:00:00Z', '2026-04-29T10:30:00Z' ])
    end

    it 'respects event-type specific buffer_time over host default' do
      host.user_setting.update!(buffer_before: 5, buffer_after: 5)
      event_type.update!(buffer_time: 20)

      # Booked from 9:00 to 9:30
      create(
        :event,
        user: host,
        event_type: event_type,
        start_time: Time.utc(2026, 4, 29, 9, 0, 0),
        end_time: Time.utc(2026, 4, 29, 9, 30, 0),
        status: 'scheduled'
      )

      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29),
        end_date: Date.new(2026, 4, 29)
      ).call

      # With event_type.buffer_time = 20, both 9:00 and 9:30 slots should be blocked
      expect(result.available_slots.map { |s| s[:start_time] }).not_to include('2026-04-29T09:00:00Z')
      expect(result.available_slots.map { |s| s[:start_time] }).not_to include('2026-04-29T09:30:00Z')
    end

    it 'respects explicit zero buffer_before and buffer_after over host default' do
      host.update!(default_buffer_time: 10)
      event_type.update!(buffer_before: 0, buffer_after: 0, buffer_time: nil)

      create(
        :event,
        user: host,
        event_type: event_type,
        start_time: Time.utc(2026, 4, 29, 9, 0, 0),
        end_time: Time.utc(2026, 4, 29, 9, 30, 0),
        status: 'scheduled'
      )

      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29),
        end_date: Date.new(2026, 4, 29)
      ).call

      expect(result.available_slots.map { |s| s[:start_time] }).to include('2026-04-29T09:30:00Z')
    end

    it 'falls back to host schedules when event-specific availability is empty' do
      event_type.update!(availability: {})

      create(
        :availability_schedule,
        user: host,
        day_of_week: 3,
        start_time: '13:00',
        end_time: '14:00',
        is_active: true
      )

      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29),
        end_date: Date.new(2026, 4, 29)
      ).call

      expect(result.available_slots.length).to eq(2)
      expect(result.available_slots.first[:start_time]).to eq('2026-04-29T13:00:00Z')
    end

    it 'falls back to host schedules when event-specific availability settings are missing required keys' do
      event_type.update!(availability: { 'slots' => [] })

      create(
        :availability_schedule,
        user: host,
        day_of_week: 3,
        start_time: '13:00',
        end_time: '14:00',
        is_active: true
      )

      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29),
        end_date: Date.new(2026, 4, 29)
      ).call

      expect(result.available_slots.length).to eq(2)
      expect(result.available_slots.first[:start_time]).to eq('2026-04-29T13:00:00Z')
    end

    it 'falls back to host schedules when event-specific availability has unsupported shape' do
      event_type.update!(availability: { 'timezone' => 'UTC' })

      create(
        :availability_schedule,
        user: host,
        day_of_week: 3,
        start_time: '13:00',
        end_time: '14:00',
        is_active: true
      )

      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29),
        end_date: Date.new(2026, 4, 29)
      ).call

      expect(result.available_slots.length).to eq(2)
      expect(result.available_slots.first[:start_time]).to eq('2026-04-29T13:00:00Z')
    end

    it 'returns no slots for a day marked inactive in event-specific availability' do
      event_type.update!(availability: {
        'slots' => [
          { 'day_of_week' => 2, 'start_time' => '09:00', 'end_time' => '10:00', 'is_active' => false }
        ]
      })

      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29), # Wednesday
        end_date: Date.new(2026, 4, 29)
      ).call

      expect(result.available_slots).to eq([])
    end

    it 'respects global booking range (days)' do
      host.user_setting.update!(booking_range_type: 'days', booking_range_count: 7)

      # Time.current is Apr 1. Range is 7 days -> Apr 8.
      # Testing for Apr 29 which is outside range.
      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29),
        end_date: Date.new(2026, 4, 29)
      ).call

      expect(result.available_slots).to be_empty
    end

    it 'respects global max bookings per day limit' do
      host.user_setting.update!(max_bookings_per_day: 1)

      # Create one booking for Apr 29
      create(
        :event,
        user: host,
        event_type: event_type,
        start_time: Time.utc(2026, 4, 29, 10, 0, 0),
        end_time: Time.utc(2026, 4, 29, 10, 30, 0),
        status: 'scheduled'
      )

      result = described_class.new(
        event_type: event_type,
        timezone: 'UTC',
        start_date: Date.new(2026, 4, 29),
        end_date: Date.new(2026, 4, 29)
      ).call

      # Should have 0 slots because limit is reached
      expect(result.available_slots).to be_empty
    end
  end
end
