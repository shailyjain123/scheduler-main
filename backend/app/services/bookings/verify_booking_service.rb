# app/services/bookings/verify_booking_service.rb
module Bookings
  class VerifyBookingService < BaseBookingService
    include AdvisoryLock

    MAX_ATTEMPTS = 5

    def call
      booking_request = PublicBookingRequest.find_by(
        id: params[:booking_request_id],
        event_type_id: event_type.id
      )

      return failure("Booking request not found", error_code: "NOT_FOUND") unless booking_request
      return success_result(booking_request.booking_event) if booking_request.verified?

      with_slot_lock(host.id, booking_request.start_time) do
        booking_request.reload

        # 1. Check Expiry
        if booking_request.expired?
          booking_request.update(status: 'expired')
          return failure("Verification code has expired", error_code: "EXPIRED")
        end

        # 2. Check Attempts
        if booking_request.verification_attempts >= MAX_ATTEMPTS
          booking_request.update(status: 'expired')
          return failure("Too many failed attempts", error_code: "LOCKED")
        end

        # 3. Validate Code
        unless booking_request.verification_code_valid?(params[:verification_code])
          booking_request.increment!(:verification_attempts)
          return failure("Invalid verification code", error_code: "INVALID_CODE")
        end

        # 4. Final Availability Check (Internal)
        unless slot_available?(booking_request.start_time, booking_request.timezone)
          return failure("Slot no longer available", error_code: "SLOT_TAKEN")
        end

        # 5. Last-Mile External Check (Phase 6)
        unless external_calendar_available?(booking_request)
          return failure("Conflict on external calendar", error_code: "EXTERNAL_CONFLICT")
        end

        # 6. Create Final Event
        event_result = build_event(
          guest_name: booking_request.guest_name,
          guest_email: booking_request.guest_email,
          notes: booking_request.notes.to_s,
          start_time: booking_request.start_time,
          timezone: booking_request.timezone
        )

        return event_result unless event_result.success?
        event = event_result.data

        ActiveRecord::Base.transaction do
          event.save!
          add_invitee!(event: event, guest_email: booking_request.guest_email, guest_name: booking_request.guest_name)
          booking_request.update!(status: 'verified', booking_event: event, verified_at: Time.current)
        end

        success_result(event)
      end
    rescue ActiveRecord::StatementInvalid => e
      if e.message.include?("no_overlapping_user_events")
        failure("Slot already booked", error_code: "SLOT_TAKEN")
      else
        raise
      end
    end

    private

    def success_result(event)
      Result.new(success?: true, data: event, type: "confirmed")
    end

    def external_calendar_available?(request)
      # Phase 6 implementation
      # If no integration, it returns true
      return true unless host.external_identities.any?
      
      # We check external availability for the next 48 hours only to avoid blocking
      return true if request.start_time > 48.hours.from_now
      
      # Implementation of ExternalCalendarService (mocked or actual)
      # For now, we assume it's integrated via a dedicated service
      begin
        Integrations::ExternalAvailabilityService.new(
          user: host,
          start_time: request.start_time,
          end_time: request.end_time
        ).free?
      rescue StandardError => e
        Rails.logger.error("[VerifyBookingService] External check failed: #{e.message}")
        true # Fail open to prevent blocking legitimate bookings
      end
    end
  end
end
