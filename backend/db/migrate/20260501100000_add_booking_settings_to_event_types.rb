class AddBookingSettingsToEventTypes < ActiveRecord::Migration[8.1]
  def change
    add_column :event_types, :buffer_before, :integer
    add_column :event_types, :buffer_after, :integer
    add_column :event_types, :minimum_notice_value, :integer
    add_column :event_types, :minimum_notice_unit, :string
  end
end
