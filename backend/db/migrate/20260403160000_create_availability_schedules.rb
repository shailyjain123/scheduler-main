class CreateAvailabilitySchedules < ActiveRecord::Migration[8.1]
  def change
    create_table :availability_schedules do |t|
      t.references :user, null: false, foreign_key: true
      t.integer :day_of_week, null: false
      t.time :start_time, null: false
      t.time :end_time, null: false
      t.boolean :is_active, null: false, default: true
      t.string :timezone, null: false, default: 'UTC'

      t.timestamps
    end

    add_index :availability_schedules, [ :user_id, :day_of_week ]
    add_check_constraint :availability_schedules, 'day_of_week >= 0 AND day_of_week <= 6', name: 'availability_schedules_day_of_week_range'
    add_check_constraint :availability_schedules, 'end_time > start_time', name: 'availability_schedules_end_after_start'
  end
end
