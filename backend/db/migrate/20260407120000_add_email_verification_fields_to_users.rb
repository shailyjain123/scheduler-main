class AddEmailVerificationFieldsToUsers < ActiveRecord::Migration[8.1]
  def up
    add_column :users, :email_verified_at, :datetime
    add_column :users, :otp_digest, :string
    add_column :users, :otp_sent_at, :datetime
    add_column :users, :otp_expires_at, :datetime
    add_column :users, :otp_failed_attempts, :integer, default: 0, null: false
    add_column :users, :otp_locked_until, :datetime
    add_column :users, :otp_resend_count, :integer, default: 0, null: false
    add_column :users, :otp_resend_window_started_at, :datetime

    add_index :users, :email_verified_at
    add_index :users, :otp_locked_until

    execute <<~SQL
      UPDATE users
      SET email_verified_at = NOW()
      WHERE status = 'active' AND email_verified_at IS NULL
    SQL
  end

  def down
    remove_index :users, :otp_locked_until
    remove_index :users, :email_verified_at

    remove_column :users, :otp_resend_window_started_at
    remove_column :users, :otp_resend_count
    remove_column :users, :otp_locked_until
    remove_column :users, :otp_failed_attempts
    remove_column :users, :otp_expires_at
    remove_column :users, :otp_sent_at
    remove_column :users, :otp_digest
    remove_column :users, :email_verified_at
  end
end
