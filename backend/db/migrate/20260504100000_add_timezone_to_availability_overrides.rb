class AddTimezoneToAvailabilityOverrides < ActiveRecord::Migration[8.1]
  def change
    add_column :availability_overrides, :timezone, :string, default: "UTC", null: false

    # Add index for timezone lookups if needed
    add_index :availability_overrides, :timezone
  end
end
