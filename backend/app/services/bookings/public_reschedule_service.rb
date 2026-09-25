module Bookings
  class PublicRescheduleService < BaseBookingService
    include AdvisoryLock

    def initialize(event:, new_start_time:, timezone:)
      @old_event = event
      @event_type = @old_event.event_type
      @host = @old_event.user
      @params = { start_time: new_start_time, timezone: timezone }
    end

    def call
      timezone = normalize_timezone
      start_time = parse_event_timestamp(params[:start_time], timezone)

      # 1. Acquire advisory lock for the NEW slot to prevent double-booking
      with_slot_lock(host.id, start_time) do
        # 2. Validate availability for the new slot
        unless slot_available?(start_time, timezone)
          return failure("Selected time is no longer available. Please choose another slot.", error_code: "SLOT_TAKEN")
        end

        ActiveRecord::Base.transaction do
          # 3. Create NEW event (Cancel old + Create new atomically)
          @new_event = build_new_event(start_time, timezone)
          @new_event.save!

          # 4. Copy invitees to the new event
          copy_invitees!

          # 5. Link events and mark old one as cancelled
          @old_event.update!(
            status: "cancelled",
            cancelled_at: Time.current,
            cancel_reason: "Rescheduled to #{@new_event.booking_uid}",
            rescheduled_to_event_id: @new_event.id,
            managed_by_attendee: true
          )
          
          @new_event.update!(rescheduled_from_event_id: @old_event.id)

          # 6. Schedule reminders for the new meeting
          Events::ScheduleRemindersService.new(event: @new_event).call
          
          # 7. Cancel reminders for the old meeting
          @old_event.reminders.update_all(status: 'cancelled')
        end
      end

      # 8. Notifications & Emails
      dispatch_notifications

      Result.new(success?: true, data: @new_event)
    rescue InvalidTimestampError => e
      failure(e.message)
    rescue => e
      failure("Failed to reschedule: #{e.message}")
    end

    private

    def build_new_event(start_time, timezone)
      host.events.new(
        event_type: event_type,
        title: @old_event.title,
        description: @old_event.description,
        location: @old_event.location,
        start_time: start_time,
        end_time: start_time + event_type.duration.minutes,
        status: "scheduled",
        buffer_before_minutes: @old_event.buffer_before_minutes,
        buffer_after_minutes: @old_event.buffer_after_minutes,
        metadata: (@old_event.metadata || {}).merge({
          "rescheduled" => true,
          "rescheduled_from" => @old_event.booking_uid,
          "event_timezone" => timezone
        })
      )
    end

    def copy_invitees!
      @old_event.event_invitees.each do |invitee|
        @new_event.event_invitees.create!(
          email: invitee.email,
          name: invitee.name,
          user_id: invitee.user_id,
          status: "pending"
        )
      end
    end

    def dispatch_notifications
      # Send new invitation for the new slot
      @new_event.event_invitees.each do |invitee|
        InviteeNotificationJob.perform_later(
          invitee_id: invitee.id, 
          action: :invite
        )
      end

      # Notify host about the reschedule
      Notifications::EventAudienceNotifier.call(
        event: @new_event,
        kind: :updated,
        actor: nil,
        change_summary: {
          "start_time" => {
            "from" => @old_event.start_time.iso8601,
            "to" => @new_event.start_time.iso8601
          }
        }
      )
    end
  end
end
