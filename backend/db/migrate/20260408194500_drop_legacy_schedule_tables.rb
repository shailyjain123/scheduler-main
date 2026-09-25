class DropLegacyScheduleTables < ActiveRecord::Migration[8.1]
  def change
    drop_table :availability_slots
    drop_table :date_overrides
    drop_table :schedules
  end
end
