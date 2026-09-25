require 'rails_helper'

RSpec.describe Availability::ValidationService do
  let(:user) { create(:user, timezone: 'UTC') }
  let(:event_type) { create(:event_type, user: user, duration: 30) }
  let!(:setting) { create(:user_setting, user: user, buffer_before: 15, buffer_after: 15) }
  
  # Set up 9 AM - 5 PM availability
  let!(:schedule) do
    create(:availability_schedule, 
           user: user, 
           day_of_week: 1, # Monday
           start_time: '09:00', 
           end_time: '17:00', 
           timezone: 'UTC')
  end

  describe '#call' do
    let(:next_monday) { (Date.current + 7.days).beginning_of_week(:monday) + 7.days } 
    let(:monday_str) { next_monday.strftime('%Y-%m-%d') }

    context 'when within working hours' do
      it 'validates 2:30 PM to 3:00 PM successfully' do
        start_time = Time.zone.parse("#{monday_str} 14:30:00 UTC")
        end_time = Time.zone.parse("#{monday_str} 15:00:00 UTC")
        
        result = described_class.call(
          user: user,
          event_type: event_type,
          start_time: start_time,
          end_time: end_time
        )
        
        expect(result[:success]).to be true
      end

      it 'validates boundary slots (ending exactly at 5 PM)' do
        start_time = Time.zone.parse("#{monday_str} 16:30:00 UTC")
        end_time = Time.zone.parse("#{monday_str} 17:00:00 UTC")
        
        result = described_class.call(
          user: user,
          event_type: event_type,
          start_time: start_time,
          end_time: end_time
        )
        
        expect(result[:success]).to be true
      end
    end

    context 'when outside working hours' do
      it 'rejects slots ending after 5 PM' do
        start_time = Time.zone.parse("#{monday_str} 16:45:00 UTC")
        end_time = Time.zone.parse("#{monday_str} 17:15:00 UTC")
        
        result = described_class.call(
          user: user,
          event_type: event_type,
          start_time: start_time,
          end_time: end_time
        )
        
        expect(result[:success]).to be false
        expect(result[:errors]).to include('Event time is outside your availability slots')
      end
    end

    context 'buffer logic' do
      let!(:existing_event) do
        create(:event, 
               user: user, 
               event_type: event_type,
               start_time: Time.zone.parse("#{monday_str} 13:00:00 UTC"),
               end_time: Time.zone.parse("#{monday_str} 14:00:00 UTC"),
               status: 'scheduled',
               buffer_before_minutes: 15,
               buffer_after_minutes: 15)
      end

      it 'rejects events that violate additive buffers (needs 30m gap)' do
        # Existing ends at 14:00 + 15m post = 14:15.
        # New starts at 14:15 + 15m pre = 14:30.
        # So a 14:15-14:45 event should FAIL because it needs to start at 14:30 or later.
        start_time = Time.zone.parse("#{monday_str} 14:15:00 UTC")
        end_time = Time.zone.parse("#{monday_str} 14:45:00 UTC")

        result = described_class.call(
          user: user,
          event_type: event_type,
          start_time: start_time,
          end_time: end_time
        )

        expect(result[:success]).to be false
        expect(result[:errors]).to include(/conflicts with an existing event/)
      end

      it 'allows events with sufficient additive buffers' do
        # 14:30 start should PASS (15m post + 15m pre = 30m gap)
        start_time = Time.zone.parse("#{monday_str} 14:30:00 UTC")
        end_time = Time.zone.parse("#{monday_str} 15:00:00 UTC")

        result = described_class.call(
          user: user,
          event_type: event_type,
          start_time: start_time,
          end_time: end_time
        )

        expect(result[:success]).to be true
      end
    end

    context 'timezone logic' do
      let(:tokyo_user) { create(:user, timezone: 'Asia/Tokyo') } # UTC+9
      let!(:tokyo_schedule) do
        create(:availability_schedule, 
               user: tokyo_user, 
               day_of_week: 1, 
               start_time: '09:00', # 9 AM Tokyo is 12 AM UTC
               end_time: '17:00',   # 5 PM Tokyo is 8 AM UTC
               timezone: 'Asia/Tokyo')
      end

      it 'validates slots using the correct timezone' do
        # 2:30 PM Tokyo is 5:30 AM UTC
        start_time = Time.find_zone('Asia/Tokyo').parse("#{monday_str} 14:30:00")
        end_time = Time.find_zone('Asia/Tokyo').parse("#{monday_str} 15:00:00")

        result = described_class.call(
          user: tokyo_user,
          start_time: start_time,
          end_time: end_time
        )

        expect(result[:success]).to be true
      end
    end
  end
end
