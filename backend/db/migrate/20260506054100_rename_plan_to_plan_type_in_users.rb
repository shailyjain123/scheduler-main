class RenamePlanToPlanTypeInUsers < ActiveRecord::Migration[8.1]
  def change
    rename_column :users, :plan, :plan_type
  end
end
