class AddManagementColumnsToEvents < ActiveRecord::Migration[8.1]
  def change
    change_table :events do |t|
      t.string :booking_uid
      t.string :manage_token_digest
      t.datetime :cancelled_at
      t.text :cancel_reason
      t.bigint :rescheduled_from_event_id
      t.bigint :rescheduled_to_event_id
      t.boolean :managed_by_attendee, default: false
      t.datetime :last_management_access_at
    end

    add_index :events, :booking_uid, unique: true
    add_index :events, :cancelled_at
    add_index :events, :rescheduled_from_event_id
    add_index :events, :rescheduled_to_event_id

    add_foreign_key :events, :events, column: :rescheduled_from_event_id
    add_foreign_key :events, :events, column: :rescheduled_to_event_id
  end
end
