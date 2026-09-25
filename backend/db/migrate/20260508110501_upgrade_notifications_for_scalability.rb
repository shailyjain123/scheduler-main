class UpgradeNotificationsForScalability < ActiveRecord::Migration[8.1]
  def change
    add_column :notifications, :actor_id, :bigint
    add_column :notifications, :notifiable_type, :string
    add_column :notifications, :notifiable_id, :bigint
    add_column :notifications, :interacted_at, :datetime
    add_column :notifications, :dedup_hash, :string

    add_index :notifications, :actor_id
    add_index :notifications, [:notifiable_type, :notifiable_id]
    add_index :notifications, :dedup_hash, unique: true

    add_column :users, :unread_notifications_count, :integer, default: 0, null: false
  end
end
