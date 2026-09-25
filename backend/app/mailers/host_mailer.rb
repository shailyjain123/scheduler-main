class HostMailer < ApplicationMailer
  def rsvp_received
    @invitee = params[:invitee]
    @event = @invitee.event
    @host = @event.user
    @status = @invitee.status

    invitees = @event.event_invitees
    @accepted_count = invitees.accepted.count
    @declined_count = invitees.declined.count
    @maybe_count = invitees.maybe.count
    @pending_count = invitees.pending.count

    app_url = ENV["APP_URL"].presence || ENV["FRONTEND_URL"].to_s
    @event_url = "#{app_url}/dashboard/events/#{@event.id}"

    display_name = @invitee.name.to_s.presence || @invitee.email
    mail(to: @host.email, subject: "#{display_name} has #{@status} #{@event.title}")
  end
end
