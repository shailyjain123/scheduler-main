class CreateDateOverrides < ActiveRecord::Migration[8.1]
  def change
    create_table :date_overrides do |t|
      t.date :date
      t.boolean :is_available
      t.references :schedule, null: false, foreign_key: true
      t.string :comment

      t.timestamps
    end
  end
end
