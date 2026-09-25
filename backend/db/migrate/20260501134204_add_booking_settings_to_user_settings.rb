class AddBookingSettingsToUserSettings < ActiveRecord::Migration[8.1]
  def change
    add_column :user_settings, :buffer_before, :integer, default: 0
    add_column :user_settings, :buffer_after, :integer, default: 0
    add_column :user_settings, :minimum_notice_value, :integer, default: 4
    add_column :user_settings, :minimum_notice_unit, :string, default: "Hours"

    # Data migration
    reversible do |dir|
      dir.up do
        User.find_each do |user|
          setting = user.user_setting || user.create_user_setting!

          # Find the most recently updated event type
          event_type = user.event_types.order(updated_at: :desc).first

          if event_type
            setting.update!(
              buffer_before: event_type.buffer_before || 0,
              buffer_after: event_type.buffer_after || 0,
              minimum_notice_value: event_type.minimum_notice_value || 4,
              minimum_notice_unit: event_type.minimum_notice_unit || "Hours"
            )
          end
        end
      end
    end
  end
end
