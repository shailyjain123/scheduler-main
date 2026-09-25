class RsvpController < ActionController::Base
  include CalendarLinkHelper

  layout false

  def accept
    process_rsvp("accepted")
  end

  def decline
    process_rsvp("declined")
  end

  def maybe
    process_rsvp("maybe")
  end

  private

  def process_rsvp(status)
    invitee = EventInvitee.includes(:user, event: :user).find_by(token: params[:token].to_s)
    return render_plain_page("Invite not found", :not_found) if invitee.blank?

    event = invitee.event

    if event.status == "cancelled"
      return render_plain_page("This event has been cancelled", :ok)
    end

    if event.end_time < Time.current
      return render_plain_page("This event has already passed", :ok)
    end

    invitee.update!(status: status, responded_at: Time.current)
    RsvpNotificationJob.perform_later(invitee_id: invitee.id)

    if invitee.registered_user? && calendar_connected?(invitee.user)
      InviteeCalendarStatusJob.perform_later(invitee_id: invitee.id)
    end

    if status == "accepted"
      message = "You have accepted #{event.title} on #{event.start_time.utc.strftime('%d %b %Y')} at #{event.start_time.utc.strftime('%I:%M %p UTC')}"
      render_confirmation_page(message, event)
    elsif status == "maybe"
      render_plain_page("You responded maybe for #{event.title}", :ok)
    else
      render_plain_page("You have declined #{event.title}", :ok)
    end
  end

  def calendar_connected?(user)
    connected = Array((user.integrations || {})["connected"]).map(&:to_s)
    connected.include?("google") || connected.include?("outlook")
  end

  def render_confirmation_page(message, event)
    google_url = CalendarLinkHelper.google(event)
    outlook_url = CalendarLinkHelper.outlook(event)

    render html: <<~HTML.html_safe, status: :ok
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>RSVP confirmed</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 680px; margin: 40px auto; line-height: 1.5;">
          <h2>RSVP updated</h2>
          <p>#{ERB::Util.html_escape(message)}</p>
          <p><a href="#{ERB::Util.html_escape(google_url)}">Add to Google Calendar</a></p>
          <p><a href="#{ERB::Util.html_escape(outlook_url)}">Add to Outlook Calendar</a></p>
        </body>
      </html>
    HTML
  end

  def render_plain_page(message, status)
    render html: <<~HTML.html_safe, status: status
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>RSVP</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 680px; margin: 40px auto; line-height: 1.5;">
          <h2>RSVP</h2>
          <p>#{ERB::Util.html_escape(message)}</p>
        </body>
      </html>
    HTML
  end
end
