class CreateSystemConfigurations < ActiveRecord::Migration[8.1]
  def change
    create_table :system_configurations do |t|
      t.string :key, null: false
      t.jsonb :value, null: false, default: {}
      t.timestamps
    end
    add_index :system_configurations, :key, unique: true
  end
end
