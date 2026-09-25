class CreatePlanFeatures < ActiveRecord::Migration[8.1]
  def change
    create_table :plan_features do |t|
      t.references :plan, null: false, foreign_key: true
      t.string :feature_name, null: false
      t.string :feature_value
      t.timestamps
    end
  end
end
