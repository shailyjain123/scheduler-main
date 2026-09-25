class InviteeNotificationJob < ApplicationJob
  queue_as :default

  retry_on StandardError, attempts: 3

  def perform(invitee_id:, action:, change_summary: nil)
    invitee = EventInvitee.includes(event: :user).find_by(id: invitee_id)
    return if invitee.blank?

    mail = nil

    case action.to_s
    when "invite", "resend"
      mail = InviteeMailer.with(invitee: invitee, change_summary: change_summary).invite_email.deliver_now
    when "update"
      mail = InviteeMailer.with(invitee: invitee, change_summary: change_summary).update_email.deliver_now
    when "cancel"
      mail = InviteeMailer.with(invitee: invitee, change_summary: change_summary).cancellation_email.deliver_now
    else
      Rails.logger.warn("[InviteeNotificationJob] Unsupported action '#{action}'")
      return
    end

    invitee.update_columns(notified_at: Time.current, updated_at: Time.current)
    create_log(
      invitee: invitee,
      action: action,
      delivery_status: "sent",
      change_summary: change_summary,
      mailer_message_id: mail&.message_id,
      sent_at: Time.current
    )
  rescue StandardError => e
    create_log(
      invitee: invitee,
      action: action,
      delivery_status: "failed",
      change_summary: change_summary,
      error_message: e.message
    ) if invitee.present?
    raise
  end

  private

  def create_log(invitee:, action:, delivery_status:, change_summary:, mailer_message_id: nil, sent_at: nil, error_message: nil)
    InviteeNotificationLog.create!(
      event: invitee.event,
      event_invitee: invitee,
      action: action.to_s,
      delivery_status: delivery_status,
      recipient_email: invitee.email,
      mailer_message_id: mailer_message_id,
      error_message: error_message,
      change_summary: normalized_change_summary(change_summary),
      sent_at: sent_at
    )
  end

  def normalized_change_summary(change_summary)
    return {} unless change_summary.is_a?(Hash)

    change_summary
  end
end
