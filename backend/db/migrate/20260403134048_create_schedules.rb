class CreateSchedules < ActiveRecord::Migration[8.1]
  def change
    create_table :schedules do |t|
      t.string :name
      t.boolean :is_default
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end
