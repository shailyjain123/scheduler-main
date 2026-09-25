class AddPlanLifecycleToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :cancel_at_period_end, :boolean, default: false, null: false
    add_column :users, :pending_plan_change, :jsonb, default: {}, null: false
  end
end
