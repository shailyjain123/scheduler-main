class AddPasswordResetFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :password_reset_token_digest, :string
    add_column :users, :password_reset_sent_at, :datetime
    add_column :users, :password_reset_expires_at, :datetime
    add_column :users, :password_reset_failed_attempts, :integer, default: 0, null: false
    add_column :users, :password_reset_locked_until, :datetime
    add_column :users, :password_reset_request_count, :integer, default: 0, null: false
    add_column :users, :password_reset_request_window_started_at, :datetime

    add_index :users, :password_reset_locked_until
    add_index :users, :password_reset_expires_at
  end
end
