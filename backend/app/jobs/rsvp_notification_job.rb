class RsvpNotificationJob < ApplicationJob
  queue_as :default

  retry_on StandardError, attempts: 3

  def perform(invitee_id:)
    invitee = EventInvitee.includes(event: :user).find_by(id: invitee_id)
    return if invitee.blank?

    HostMailer.with(invitee: invitee).rsvp_received.deliver_now

    host = invitee.event.user
    return if host.blank?

    Notifications::CreateService.call(
      user: host,
      event_name: "invitee.rsvp_received",
      category: "meetings",
      notification_type: "booking",
      title: "RSVP received",
      description: "A guest responded to a meeting invitation.",
      action_url: "/meetings",
      metadata: {
        event_id: invitee.event_id,
        invitee_id: invitee.id,
        invitee_status: invitee.status
      }
    )
  end
end
