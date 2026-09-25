class AddBillingCycleToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :billing_cycle, :string, default: "yearly"
  end
end
