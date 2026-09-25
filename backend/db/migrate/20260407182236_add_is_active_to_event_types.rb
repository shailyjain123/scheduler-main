class AddIsActiveToEventTypes < ActiveRecord::Migration[8.1]
  def change
    add_column :event_types, :is_active, :boolean
  end
end
