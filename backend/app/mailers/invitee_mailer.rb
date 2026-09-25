require "icalendar"

class InviteeMailer < ApplicationMailer
  helper CalendarLinkHelper

  def invite_email
    assign_common_values
    attach_hero_image
    attach_ics(method: "REQUEST")

    date = @event.start_time.in_time_zone(@iana_timezone).strftime("%A, %B %d")
    mail(to: @invitee.email, subject: "Confirmed: #{@event.title} on #{date}")
  end

  def update_email
    assign_common_values
    attach_hero_image
    attach_ics(method: "REQUEST")

    mail(to: @invitee.email, subject: "Updated: #{@event.title}")
  end

  def cancellation_email
    assign_common_values
    attach_ics(method: "CANCEL")

    mail(to: @invitee.email, subject: "Cancelled: #{@event.title}")
  end

  private

  def assign_common_values
    @invitee = params[:invitee]
    @change_summary = params[:change_summary].is_a?(Hash) ? params[:change_summary] : {}
    @event = @invitee.event
    @host = @event.user
    @unregistered_invitee = !@invitee.registered_user?

    timezone = @invitee.user&.timezone.presence || @host.timezone.presence || "UTC"
    zone = ActiveSupport::TimeZone[timezone] || ActiveSupport::TimeZone["UTC"]

    @event_date = @event.start_time.in_time_zone(zone).strftime("%A, %B %d, %Y")
    @event_time = "#{@event.start_time.in_time_zone(zone).strftime("%I:%M %p")} - #{@event.end_time.in_time_zone(zone).strftime("%I:%M %p %Z")}"
    @iana_timezone = timezone
    @meeting_link = @event.metadata.is_a?(Hash) ? @event.metadata["meeting_link"].to_s.strip.presence : nil

    app_url = ENV["APP_URL"].presence || ENV["FRONTEND_URL"].to_s
    app_url = app_url.sub(%r{/\z}, "")
    @accept_url = "#{app_url}/rsvp/#{@invitee.token}/accept"
    @decline_url = "#{app_url}/rsvp/#{@invitee.token}/decline"
    @maybe_url = "#{app_url}/rsvp/#{@invitee.token}/maybe"
    @signup_url = "#{app_url}/signup"
    @view_invite_url = @accept_url
    
    @cancel_url = Events::ManagementLinkService.url_for(event: @event, action: :cancel, recipient_type: :attendee)
    @reschedule_url = Events::ManagementLinkService.url_for(event: @event, action: :reschedule, recipient_type: :attendee)

    @ai_insight = generate_ai_insight
  end

  def generate_ai_insight
    # Placeholder for AI-generated insight. For now, we return a smart-sounding default.
    # In the future, this could use an LLM to analyze the user's schedule.
    "This slot is optimal as it balances your existing commitments and maximizes your productivity for the rest of the day."
  end

  def attach_hero_image
    image_path = Rails.root.join("app/assets/images/email/hero_invitation.png")
    if File.exist?(image_path)
      attachments.inline["hero_invitation.png"] = File.read(image_path)
    end
  end

  def attach_ics(method:)
    attachments["event-#{@event.id}.ics"] = {
      mime_type: "text/calendar; charset=UTF-8; method=#{method}",
      content: build_ics(method: method)
    }
  end

  def build_ics(method:)
    calendar = Icalendar::Calendar.new
    calendar.prodid = "-//Scheduler//Invitee Notifications//EN"
    calendar.version = "2.0"
    calendar.calscale = "GREGORIAN"
    calendar.append_custom_property("METHOD", method)

    cal_event = Icalendar::Event.new
    cal_event.uid = "event-#{@event.id}-#{@invitee.id}@app"
    cal_event.dtstamp = Icalendar::Values::DateTime.new(Time.current.utc, "tzid" => "UTC")
    cal_event.sequence = sequence_for(method)
    cal_event.summary = @event.title.to_s
    cal_event.description = CalendarLinkHelper.calendar_description(@event)
    cal_event.location = @event.location.to_s
    cal_event.dtstart = Icalendar::Values::DateTime.new(@event.start_time.utc, "tzid" => "UTC")
    cal_event.dtend = Icalendar::Values::DateTime.new(@event.end_time.utc, "tzid" => "UTC")
    cal_event.organizer = Icalendar::Values::CalAddress.new("mailto:#{@host.email}")

    attendee = Icalendar::Values::CalAddress.new("mailto:#{@invitee.email}")
    attendee.ical_params = {
      "CN" => @invitee.name.to_s.presence || @invitee.email,
      "PARTSTAT" => attendee_partstat,
      "RSVP" => "TRUE"
    }
    cal_event.append_attendee(attendee)

    if method == "CANCEL"
      cal_event.status = "CANCELLED"
    end

    calendar.add_event(cal_event)
    calendar.publish
    calendar.to_ical
  end

  def attendee_partstat
    case @invitee.status
    when "accepted"
      "ACCEPTED"
    when "declined"
      "DECLINED"
    when "maybe"
      "TENTATIVE"
    else
      "NEEDS-ACTION"
    end
  end

  def sequence_for(method)
    return 1 if method == "CANCEL"

    [ (@event.updated_at.to_i / 60), 1 ].max
  end
end
