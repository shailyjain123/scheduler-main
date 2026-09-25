class AddCreditAndPlanFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :total_credits, :integer, default: 0, null: false
    add_column :users, :used_credits, :integer, default: 0, null: false
    add_column :users, :plan_started_at, :datetime
    add_column :users, :plan_expires_at, :datetime
  end
end
