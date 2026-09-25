class UpdateEventTypesAvailability < ActiveRecord::Migration[8.1]
  def change
    remove_column :event_types, :color, :string
    add_column :event_types, :availability, :jsonb, default: {}, null: false
  end
end
