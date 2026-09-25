module Invitees
  class AddInviteeService
    MAX_INVITEES = 50
    Result = Struct.new(:success?, :invitee, :error_code, :error_message, keyword_init: true)

    def initialize(event:, email:, name: nil, notify: true, notification_action: :invite)
      @event = event
      @email = email.to_s.strip.downcase
      @name = name.to_s.strip.presence
      @notify = notify
      @notification_action = notification_action
    end

    def call
      return failure("VALIDATION_ERROR", "Email is required") if email.blank?
      return failure("VALIDATION_ERROR", "Cannot invite event host") if email == event.user.email.to_s.downcase
      return failure("VALIDATION_ERROR", "Invitee limit exceeded (max #{MAX_INVITEES})") if event.event_invitees.count >= MAX_INVITEES

      if event.event_invitees.where("LOWER(email) = ?", email).exists?
        return failure("VALIDATION_ERROR", "Invitee already added")
      end

      invitee = event.event_invitees.new(
        email: email,
        name: name,
        user_id: resolved_user_id,
        status: "pending"
      )

      if invitee.save
        enqueue_notification(invitee)
        Result.new(success?: true, invitee: invitee)
      else
        failure("VALIDATION_ERROR", invitee.errors.full_messages.to_sentence)
      end
    end

    private

    attr_reader :event, :email, :name, :notify, :notification_action

    def resolved_user_id
      @resolved_user_id ||= Invitees::ResolveInviteeService.new(email: email).call
    end

    def failure(code, message)
      Result.new(success?: false, error_code: code, error_message: message)
    end

    def enqueue_notification(invitee)
      return unless notify

      InviteeNotificationJob.perform_later(invitee_id: invitee.id, action: notification_action)
    end
  end
end
