module Events
  class ScheduleRemindersService
    def initialize(event:)
      @event = event
      @user = event.user
      @settings = @user.user_setting
    end

    def call
      return unless @settings

      # Invalidate existing pending/scheduled reminders for this event (Reschedule/Update)
      invalidate_existing_reminders

      schedule_email_reminders if @settings.email_reminders_enabled
      schedule_sms_reminders if @settings.sms_reminders_enabled
      schedule_push_notifications
    end

    private

    def invalidate_existing_reminders
      @event.reminders.where(status: :pending).update_all(status: :obsolete, updated_at: Time.current)
    end

    def schedule_email_reminders
      @settings.email_reminders_config.each do |config|
        next unless config["enabled"]

        run_at = calculate_run_at(config["offset"])
        next if run_at.nil? || run_at < Time.current

        create_reminder_and_job('email', config["recipient"], config["offset"], run_at)
      end
    end

    def schedule_sms_reminders
      @settings.sms_reminders_config.each do |config|
        next unless config["enabled"]

        run_at = calculate_run_at(config["offset"])
        next if run_at.nil? || run_at < Time.current

        create_reminder_and_job('sms', config["recipient"], config["offset"], run_at)
      end
    end

    def schedule_push_notifications
      config = @settings.push_notifications_config
      return unless config["meeting_soon"]

      run_at = @event.start_time - 5.minutes
      if run_at > Time.current
        create_reminder_and_job('push', 'host', '5 minutes before', run_at)
      end
    end

    def create_reminder_and_job(type, recipient, offset, run_at)
      # Increment version if multiple attempts exist for same offset
      version = @event.reminders.where(reminder_type: type, offset_identifier: offset).maximum(:version).to_i + 1

      reminder = @event.reminders.create!(
        reminder_type: type,
        status: :pending,
        scheduled_at: run_at,
        recipient_type: recipient,
        offset_identifier: offset,
        version: version
      )

      ReminderJob.set(wait_until: run_at).perform_later(reminder.id)
    end

    def calculate_run_at(offset_string)
      case offset_string
      when "24 hours before"
        @event.start_time - 24.hours
      when "1 hour before"
        @event.start_time - 1.hour
      when "30 minutes before"
        @event.start_time - 30.minutes
      when "15 minutes before"
        @event.start_time - 15.minutes
      when "10 minutes before"
        @event.start_time - 10.minutes
      else
        nil
      end
    end
  end
end
