class CreatePublicBookingRequests < ActiveRecord::Migration[8.1]
  def change
    create_table :public_booking_requests do |t|
      t.references :event_type, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.references :booking_event, foreign_key: { to_table: :events }

      t.string :guest_name, null: false
      t.string :guest_email, null: false
      t.text :notes
      t.datetime :start_time, null: false
      t.datetime :end_time, null: false
      t.string :timezone, null: false, default: "UTC"

      t.string :status, null: false, default: "pending"
      t.string :verification_code_digest, null: false
      t.datetime :verification_sent_at, null: false
      t.datetime :verification_expires_at, null: false
      t.datetime :verified_at

      t.integer :verification_attempts, null: false, default: 0

      t.timestamps
    end

    add_index :public_booking_requests, :status
    add_index :public_booking_requests, :guest_email
    add_index :public_booking_requests, :verification_expires_at
  end
end
