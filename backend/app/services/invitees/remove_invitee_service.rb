module Invitees
  class RemoveInviteeService
    Result = Struct.new(:success?, :error_code, :error_message, keyword_init: true)

    def initialize(user:, invitee_id:)
      @user = user
      @invitee_id = invitee_id
    end

    def call
      invitee = EventInvitee.joins(:event).find_by(id: invitee_id, events: { user_id: user.id })
      return failure("NOT_FOUND", "Invitee not found") if invitee.blank?

      InviteeNotificationJob.perform_later(invitee_id: invitee.id, action: :cancel)
      invitee.destroy!

      Result.new(success?: true)
    rescue ActiveRecord::RecordInvalid => e
      failure("VALIDATION_ERROR", e.message)
    end

    private

    attr_reader :user, :invitee_id

    def failure(code, message)
      Result.new(success?: false, error_code: code, error_message: message)
    end
  end
end
