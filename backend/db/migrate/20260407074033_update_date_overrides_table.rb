class UpdateDateOverridesTable < ActiveRecord::Migration[8.1]
  def change
    reversible do |dir|
      dir.up do
        execute "UPDATE date_overrides SET is_available = NOT is_available"
      end
      dir.down do
        execute "UPDATE date_overrides SET is_available = NOT is_available"
      end
    end

    rename_column :date_overrides, :is_available, :is_unavailable
    change_column_default :date_overrides, :is_unavailable, from: nil, to: false
    rename_column :date_overrides, :comment, :reason
    add_column :date_overrides, :start_time, :time
    add_column :date_overrides, :end_time, :time
  end
end
