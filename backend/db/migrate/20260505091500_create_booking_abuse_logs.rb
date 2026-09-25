class CreateBookingAbuseLogs < ActiveRecord::Migration[8.1]
  def change
    create_table :booking_abuse_logs do |t|
      t.references :user, null: false, foreign_key: true
      t.references :event_type, null: false, foreign_key: true
      t.references :public_booking_request, foreign_key: true

      t.string :guest_email
      t.string :guest_name
      t.string :client_ip, null: false
      t.string :fingerprint
      t.string :rule_violated, null: false
      t.string :severity, null: false, default: "warning"
      t.boolean :blocked, null: false, default: false
      t.jsonb :metadata, null: false, default: {}
      t.datetime :resolved_at

      t.timestamps
    end

    add_index :booking_abuse_logs, :guest_email
    add_index :booking_abuse_logs, :client_ip
    add_index :booking_abuse_logs, :fingerprint
    add_index :booking_abuse_logs, :rule_violated
    add_index :booking_abuse_logs, :severity
    add_index :booking_abuse_logs, :blocked
    add_index :booking_abuse_logs, :created_at
  end
end
