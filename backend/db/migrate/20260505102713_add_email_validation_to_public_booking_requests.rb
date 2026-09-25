class AddEmailValidationToPublicBookingRequests < ActiveRecord::Migration[8.1]
  def change
    add_column :public_booking_requests, :email_validation_status, :string
    add_column :public_booking_requests, :email_validation_provider, :string
    add_column :public_booking_requests, :email_validated_at, :datetime
  end
end
