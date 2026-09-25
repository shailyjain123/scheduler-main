class CreateAvailabilityOverrides < ActiveRecord::Migration[8.1]
  def change
    create_table :availability_overrides do |t|
      t.references :user, null: false, foreign_key: true
      t.date :date, null: false
      t.time :start_time
      t.time :end_time
      t.boolean :is_unavailable, null: false, default: false
      t.string :reason

      t.timestamps
    end

    add_index :availability_overrides, [ :user_id, :date ]
    add_check_constraint :availability_overrides,
      'start_time IS NULL OR end_time IS NULL OR end_time > start_time',
      name: 'availability_overrides_end_after_start'
  end
end
