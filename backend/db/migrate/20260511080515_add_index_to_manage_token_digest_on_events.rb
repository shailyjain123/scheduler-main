class AddIndexToManageTokenDigestOnEvents < ActiveRecord::Migration[8.1]
  def change
    add_index :events, :manage_token_digest, unique: true
  end
end
