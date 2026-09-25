class ReminderJob < ApplicationJob
  queue_as :reminders

  # Retry logic for network failures
  retry_on StandardError, attempts: 3, wait: :exponentially_longer

  def perform(reminder_id)
    reminder = Reminder.find_by(id: reminder_id)
    return if reminder.blank?

    # Guard 1: Status must be pending
    return unless reminder.pending?

    # Guard 2: Event must be scheduled
    return unless reminder.event&.scheduled?

    # Guard 3: Stale check (don't send if event already passed by more than 10 mins)
    return if Time.current > (reminder.event.start_time + 10.minutes)

    # Execute based on type
    case reminder.reminder_type
    when 'email'
      send_email_reminder(reminder)
    when 'sms'
      send_sms_reminder(reminder)
    when 'push'
      send_push_reminder(reminder)
    end
  rescue => e
    reminder.mark_as_failed!(e.message) if reminder
    raise e
  end

  private

  def send_email_reminder(reminder)
    # Using existing InviteeMailer or a new ReminderMailer
    # For now, let's assume we use a specialized ReminderMailer
    ReminderMailer.with(reminder: reminder).reminder_email.deliver_now
    reminder.mark_as_delivered!
  end

  def send_sms_reminder(reminder)
    # Future placeholder for SMS service (Twilio, etc.)
    Rails.logger.info "[SMS Reminder] Sent to #{reminder.recipient_type} for Event #{reminder.event_id}"
    reminder.mark_as_delivered!
  end

  def send_push_reminder(reminder)
    # Future placeholder for Push Notification service
    Rails.logger.info "[Push Reminder] Sent to #{reminder.recipient_type} for Event #{reminder.event_id}"
    reminder.mark_as_delivered!
  end
end
