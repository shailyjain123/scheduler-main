require "cgi"

class PublicBookingMailer < ApplicationMailer
  def booking_verification_email
    @booking_request = params[:booking_request]
    @event_type = @booking_request.event_type
    @verification_code = params[:verification_code]
    @expiry_minutes = (PublicBookingRequest::VERIFICATION_TTL / 60).to_i
    @frontend_url = ENV.fetch("FRONTEND_URL")
    @verify_url = "#{@frontend_url}/book/#{@event_type.id}?booking_request_id=#{@booking_request.id}"
    @guest_name = @booking_request.guest_name

    mail(to: @booking_request.guest_email, subject: "Verify your booking request")
  end
end
