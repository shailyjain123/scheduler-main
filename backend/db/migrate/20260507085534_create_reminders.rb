class CreateReminders < ActiveRecord::Migration[8.1]
  def change
    create_table :reminders do |t|
      t.references :event, null: false, foreign_key: true
      t.string :reminder_type, null: false # email, sms, push
      t.string :status, null: false, default: 'pending' # pending, delivered, cancelled, obsolete, failed
      t.datetime :scheduled_at, null: false
      t.string :recipient_type, null: false # guest, host, both
      t.datetime :sent_at
      t.text :error_message
      t.string :offset_identifier, null: false # e.g., "1 hour before"
      t.integer :version, null: false, default: 1

      t.timestamps
    end

    add_index :reminders, [:status, :scheduled_at]
    add_index :reminders, [:event_id, :reminder_type, :offset_identifier, :version], unique: true, name: 'idx_reminders_on_event_type_offset_version'
  end
end
