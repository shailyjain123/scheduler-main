class AddBookingIndexes < ActiveRecord::Migration[8.1]
  def change
    add_index :events, [:user_id, :status, :start_time, :end_time], name: "idx_events_lookup"
    add_index :public_booking_requests, [:user_id, :status, :verification_expires_at], name: "idx_pending_lookup"
  end
end
