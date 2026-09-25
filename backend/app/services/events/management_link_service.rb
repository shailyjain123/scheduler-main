module Events
  class ManagementLinkService
    def self.url_for(event:, action:, recipient_type:)
      new(event: event, action: action, recipient_type: recipient_type).url
    end

    def initialize(event:, action:, recipient_type:)
      @event = event
      @action = action # :cancel or :reschedule
      @recipient_type = recipient_type # :host or :attendee
      @app_url = (ENV["APP_URL"].presence || ENV["FRONTEND_URL"].to_s).sub(%r{/\z}, "")
    end

    def url
      if host_management?
        host_dashboard_url
      else
        public_management_url
      end
    end

    private

    def host_management?
      @recipient_type == :host && @event.event_source == "host_created"
    end

    def host_dashboard_url
      # HOST CREATED EVENT -> Dashboard link
      # Examples:
      # /meetings?event=123&action=reschedule
      # /calendar?event=123&action=cancel
      
      # We'll default to /meetings for deep linking
      path = "/dashboard/meetings"
      "#{@app_url}#{path}?event=#{@event.id}&action=#{@action}"
    end

    def public_management_url
      # GUEST BOOKED EVENT or ATTENDEE recipient -> Public management link
      # /booking/manage/:token/reschedule
      # /booking/manage/:token/cancel
      
      token = @event.management_token || @event.booking_uid
      "#{@app_url}/booking/manage/#{token}/#{@action}"
    end
  end
end
