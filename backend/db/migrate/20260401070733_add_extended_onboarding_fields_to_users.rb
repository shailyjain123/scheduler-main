class AddExtendedOnboardingFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :work_type, :string
    add_column :users, :default_meeting_duration, :integer
    add_column :users, :default_buffer_time, :integer
  end
end
