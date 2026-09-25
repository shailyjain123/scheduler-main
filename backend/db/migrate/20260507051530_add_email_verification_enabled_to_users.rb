class AddEmailVerificationEnabledToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :email_verification_enabled, :boolean, default: false, null: false
  end
end
