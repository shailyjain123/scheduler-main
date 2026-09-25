class AddAbuseContextAndSlotHoldIndexToPublicBookingRequests < ActiveRecord::Migration[8.1]
  def change
    add_column :public_booking_requests, :client_ip, :string
    add_column :public_booking_requests, :client_fingerprint, :string
    add_column :public_booking_requests, :user_agent, :string
    add_column :public_booking_requests, :risk_score, :integer, null: false, default: 0
    add_column :public_booking_requests, :risk_flags, :jsonb, null: false, default: []

    add_index :public_booking_requests, :client_ip
    add_index :public_booking_requests, :client_fingerprint
    add_index :public_booking_requests, [ :user_id, :guest_email, :created_at ], name: "index_public_booking_requests_on_user_email_created_at"
    add_index :public_booking_requests, [ :user_id, :client_ip, :created_at ], name: "index_public_booking_requests_on_user_ip_created_at"
    add_index :public_booking_requests, [ :user_id, :client_fingerprint, :created_at ], name: "index_public_booking_requests_on_user_fingerprint_created_at"
    add_index :public_booking_requests, [ :event_type_id, :start_time ], unique: true, where: "status = 'pending'", name: "index_public_booking_requests_on_active_pending_slot_hold"
  end
end
