class RemoveLegacyAvailabilityFromUsers < ActiveRecord::Migration[8.1]
  def change
    remove_column :users, :availability, :jsonb
  end
end
