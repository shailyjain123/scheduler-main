class CreateAvailabilitySlots < ActiveRecord::Migration[8.1]
  def change
    create_table :availability_slots do |t|
      t.integer :day_of_week
      t.string :start_time
      t.string :end_time
      t.references :schedule, null: false, foreign_key: true

      t.timestamps
    end
  end
end
