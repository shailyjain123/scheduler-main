FactoryBot.define do
  factory :user_setting do
    user { nil }
    email_reminders_enabled { false }
    email_reminders_config { "" }
    sms_reminders_enabled { false }
    sms_reminders_config { "" }
    call_reminders_enabled { false }
    call_reminders_config { "" }
    ai_voice_assistant_enabled { false }
    ai_voice_assistant_config { "" }
    push_notifications_config { "" }
  end
end
