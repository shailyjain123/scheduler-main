class AddIdempotencyKeyToPublicBookingRequests < ActiveRecord::Migration[8.1]
  def change
    add_column :public_booking_requests, :idempotency_key, :string
    add_index :public_booking_requests, :idempotency_key, unique: true
  end
end
