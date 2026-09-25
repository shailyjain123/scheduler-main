# app/services/bookings/create_booking_service.rb
require 'zlib'

module Bookings
  class CreateBookingService < BaseBookingService
    include AdvisoryLock

    def call
      guest_name = normalize_guest_name
      guest_email = normalize_guest_email
      notes = normalize_notes
      timezone = normalize_timezone
      start_time = parse_event_timestamp(params[:start_time], timezone)

      # 2. Idempotency Check
      if params[:idempotency_key].present?
        # Check for existing confirmed event
        existing_event = Event.where(user_id: host.id)
                             .where.not(status: "cancelled")
                             .where("metadata->>'idempotency_key' = ?", params[:idempotency_key])
                             .first
        return Result.new(success?: true, data: existing_event, type: "seamless") if existing_event

        # Check for legacy pending request
        existing_request = PublicBookingRequest.find_by(idempotency_key: params[:idempotency_key])
        return Result.new(success?: true, data: existing_request, type: "verify") if existing_request
      end

      validation_errors = validation_errors_for_guest(guest_name: guest_name, guest_email: guest_email)
      return failure(validation_errors) if validation_errors.any?

      # 3. Security Check (Strict Validation)
      email_validation = EmailValidationService.new(email: guest_email, host: host).call
      unless email_validation.safe?
        return failure("We could not verify your email address. Please use a deliverable, non-disposable email.", error_code: "EMAIL_UNVERIFIED")
      end

      # 4. Slot-Level Serialization (Advisory Lock)
      with_slot_lock(host.id, start_time) do
        # 5. Availability Check (Internal)
        unless slot_available?(start_time, timezone)
          return failure(unavailable_slot_error(start_time, nil, guest_name, notes), error_code: "SLOT_TAKEN")
        end

        # PATH: SEAMLESS ONLY
        create_seamless_booking(guest_name, guest_email, notes, start_time, timezone)
      end
    rescue ActiveRecord::StatementInvalid => e
      if e.message.include?("no_overlapping_user_events")
        failure("This slot was just booked by someone else. Please choose another time.", error_code: "SLOT_TAKEN")
      else
        raise
      end
    rescue InvalidTimestampError => e
      failure(e.message)
    end

    private

    def notify_booking(event)
      Notifications::Dispatcher.trigger("meeting.booked", actor: nil, target: event)
    rescue StandardError => e
      Rails.logger.warn("[Bookings::CreateBookingService] meeting.booked notification failed for event_id=#{event.id}: #{e.class} #{e.message}")
    end

    def create_seamless_booking(name, email, notes, start, tz)
      event_result = build_event(
        guest_name: name,
        guest_email: email,
        notes: notes,
        start_time: start,
        timezone: tz
      )
      return event_result unless event_result.success?

      event = event_result.data
      
      # Persist idempotency key in metadata
      event.metadata ||= {}
      event.metadata["idempotency_key"] = params[:idempotency_key] if params[:idempotency_key].present?

      ActiveRecord::Base.transaction do
        event.save!
        add_invitee!(event: event, guest_email: email, guest_name: name)
      end

      notify_booking(event)

      Result.new(success?: true, data: event, type: "seamless")
    end
  end
end
