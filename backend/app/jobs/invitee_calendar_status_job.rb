class InviteeCalendarStatusJob < ApplicationJob
  queue_as :default

  def perform(invitee_id:)
    invitee = EventInvitee.includes(:user, :event).find_by(id: invitee_id)
    return if invitee.blank? || invitee.user.blank?

    # Calendar provider RSVP status updates are intentionally handled by dedicated sync integrations.
    Rails.logger.info("[InviteeCalendarStatusJob] RSVP status queued for invitee=#{invitee.id}")
  end
end
