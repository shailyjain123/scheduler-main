# app/jobs/expire_public_booking_requests_job.rb
class ExpirePublicBookingRequestsJob < ApplicationJob
  queue_as :default

  def perform
    # Use update_all for efficiency. 
    # The AvailabilityService already handles the "logical" expiry at query time,
    # so this job is purely for data hygiene.
    expired_count = PublicBookingRequest.pending
                                         .where("verification_expires_at < ?", Time.current)
                                         .update_all(status: 'expired', updated_at: Time.current)
                                         
    Rails.logger.info("[ExpirePublicBookingRequestsJob] Expired #{expired_count} requests.") if expired_count > 0
  end
end
