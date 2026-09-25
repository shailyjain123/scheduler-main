class AddMoreBookingSettingsToUserSettings < ActiveRecord::Migration[8.1]
  def change
    add_column :user_settings, :booking_range_type, :string, default: 'days'
    add_column :user_settings, :booking_range_count, :integer, default: 60
    add_column :user_settings, :max_bookings_per_day, :integer
  end
end
