class AddNotificationDeliveryFields < ActiveRecord::Migration[8.1]
  def change
    add_column :notifications, :category, :string, default: "system", null: false
    add_column :notifications, :event_name, :string, default: "generic", null: false
    add_column :notifications, :group_key, :string
    add_column :notifications, :grouped_count, :integer, default: 1, null: false
    add_column :notifications, :last_occurred_at, :datetime

    add_index :notifications, [ :user_id, :read_at, :created_at ], name: "index_notifications_on_user_read_created"
    add_index :notifications, [ :user_id, :category, :created_at ], name: "index_notifications_on_user_category_created"
    add_index :notifications, [ :user_id, :group_key ], name: "index_notifications_on_user_group_key"
  end
end
