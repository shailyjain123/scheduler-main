class AddEventsCountToEventTypes < ActiveRecord::Migration[8.1]
  def change
    add_column :event_types, :events_count, :integer, default: 0, null: false
  end
end
