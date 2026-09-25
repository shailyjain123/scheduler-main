class CreatePlans < ActiveRecord::Migration[8.1]
  def change
    create_table :plans do |t|
      t.string :name, null: false
      t.integer :credits, null: false, default: 0
      t.decimal :price, precision: 10, scale: 2, null: false, default: 0.0
      t.string :billing_cycle, null: false, default: "monthly"
      t.boolean :active, null: false, default: true

      t.timestamps
    end
    
    add_index :plans, [:name, :billing_cycle], unique: true
  end
end
