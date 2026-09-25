class CreateUserSettings < ActiveRecord::Migration[8.1]
  def change
    create_table :user_settings do |t|
      t.references :user, null: false, foreign_key: true
      t.boolean :email_reminders_enabled, default: true, null: false
      t.jsonb :email_reminders_config, default: [
        { offset: "24 hours before", recipient: "guest", enabled: true },
        { offset: "1 hour before", recipient: "guest", enabled: true }
      ], null: false
      t.boolean :sms_reminders_enabled, default: true, null: false
      t.jsonb :sms_reminders_config, default: [
        { offset: "30 minutes before", recipient: "guest", enabled: true }
      ], null: false
      t.boolean :call_reminders_enabled, default: true, null: false
      t.jsonb :call_reminders_config, default: {
        timing: "10 minutes before",
        max_attempts: 2,
        script: "Hi {guest_name}, this is an automated reminder from {host_name}. Your appointment starts in 10 minutes. Please join using the link provided in your email.",
        fallback_sms: true,
        fallback_email: false
      }, null: false
      t.boolean :ai_voice_assistant_enabled, default: true, null: false
      t.jsonb :ai_voice_assistant_config, default: {
        voice_style: "Professional (Standard)",
        language: "English (US)"
      }, null: false
      t.jsonb :push_notifications_config, default: {
        new_booking: true,
        cancellation: true,
        reschedule: true,
        payment_received: false,
        meeting_soon: true,
        no_show: true
      }, null: false

      t.timestamps
    end
  end
end
