class ReminderMailer < ApplicationMailer
  def reminder_email
    @reminder = params[:reminder]
    @event = @reminder.event
    @host = @event.user
    
    # We prioritize guest emails for now as per current scale
    # In the future, we can handle multiple recipients
    recipients = if @reminder.recipient_type == 'guest'
      @event.event_invitees.pluck(:email)
    elsif @reminder.recipient_type == 'host'
      [@host.email]
    else
      @event.event_invitees.pluck(:email) + [@host.email]
    end

    return if recipients.empty?

    # Set timezone for the email content based on host's preference
    # In a real app, we might want to localize for each guest, 
    # but for now we follow host's timezone as the reference.
    Time.use_zone(@host.timezone || 'UTC') do
      mail(
        to: recipients,
        subject: "Reminder: #{@event.title} at #{@event.start_time.strftime('%-I:%M %p %Z')}"
      )
    end
  end
end
