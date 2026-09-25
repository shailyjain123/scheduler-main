class AddBuffersToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :buffer_before_minutes, :integer, default: 0, null: false
    add_column :events, :buffer_after_minutes, :integer, default: 0, null: false
  end
end
