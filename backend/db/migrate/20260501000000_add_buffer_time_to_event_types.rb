class AddBufferTimeToEventTypes < ActiveRecord::Migration[8.1]
  def change
    add_column :event_types, :buffer_time, :integer
  end
end
