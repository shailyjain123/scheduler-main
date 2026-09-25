class AddEventSourceToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :event_source, :string, default: 'host_created'
    add_index :events, :event_source
  end
end
