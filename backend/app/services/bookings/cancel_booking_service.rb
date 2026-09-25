module Bookings
  class CancelBookingService < BaseBookingService
    def initialize(event:, reason: nil, managed_by_attendee: false)
      @event = event
      @reason = reason
      @managed_by_attendee = managed_by_attendee
      @host = event.user
      @event_type = event.event_type
    end

    def call
      return failure("Booking is already cancelled") if @event.status == "cancelled"
      return failure("Booking is already completed") if @event.status == "completed"

      ActiveRecord::Base.transaction do
        @event.update!(
          status: "cancelled",
          cancelled_at: Time.current,
          cancel_reason: @reason,
          managed_by_attendee: @managed_by_attendee
        )

        # Update invitees
        @event.event_invitees.update_all(status: "declined", responded_at: Time.current)

        # Trigger notifications
        dispatch_notifications
      end

      Result.new(success?: true, data: @event)
    rescue => e
      failure("Failed to cancel booking: #{e.message}")
    end

    private

    def dispatch_notifications
      @event.event_invitees.each do |invitee|
        InviteeNotificationJob.perform_later(
          invitee_id: invitee.id, 
          action: :cancel
        )
      end

      Notifications::EventAudienceNotifier.call(
        event: @event,
        kind: :cancelled,
        actor: nil
      )
    end
  end
end
