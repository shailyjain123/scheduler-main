module Integration
  class RefreshToken
    def self.call(identity)
      new(identity).execute
    end

    def initialize(identity)
      @identity = identity
    end

    def execute
      return { success: true, message: "Token still valid" } unless expired?
      return { success: false, error: "No refresh token available" } if identity.refresh_token.blank?

      refresh_access_token
    rescue => e
      Rails.logger.error "[Integration] Token refresh failed for identity #{identity.id}: #{e.message}"
      { success: false, error: e.message }
    end

    private

    attr_reader :identity

    def expired?
      # If we have an explicit expiry, use it (with 5 min buffer)
      return identity.expires_at < Time.current + 5.minutes if identity.expires_at.present?

      # If no expiry, assume it's valid for 1 hour after it was last updated
      # This avoids showing "Expired" for newly connected accounts that might be missing expires_at
      identity.updated_at < 1.hour.ago
    end

    def refresh_access_token
      response = case identity.provider
      when "google_oauth2"
                   refresh_google_token
      when "microsoft_graph"
                   refresh_microsoft_token
      when "slack"
                   refresh_slack_token
      else
                   nil
      end

      if response[:success]
        identity.update!(
          access_token: response[:access_token],
          refresh_token: response[:refresh_token] || identity.refresh_token,
          expires_at: Time.current + response[:expires_in].to_i.seconds
        )
        { success: true }
      else
        { success: false, error: response[:error] }
      end
    end

    def refresh_google_token
      post_refresh(
        "https://oauth2.googleapis.com/token",
        {
          client_id: ENV["GOOGLE_CLIENT_ID"],
          client_secret: ENV["GOOGLE_CLIENT_SECRET"],
          refresh_token: identity.refresh_token,
          grant_type: "refresh_token"
        }
      )
    end

    def refresh_microsoft_token
      post_refresh(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          client_id: ENV["MICROSOFT_CLIENT_ID"],
          client_secret: ENV["MICROSOFT_CLIENT_SECRET"],
          refresh_token: identity.refresh_token,
          grant_type: "refresh_token"
        }
      )
    end

    def refresh_slack_token
      # Slack doesn't always use refresh tokens in the same way, but if it does:
      post_refresh(
        "https://slack.com/api/oauth.v2.access",
        {
          client_id: ENV["SLACK_CLIENT_ID"],
          client_secret: ENV["SLACK_CLIENT_SECRET"],
          refresh_token: identity.refresh_token,
          grant_type: "refresh_token"
        }
      )
    end

    def post_refresh(url, params)
      uri = URI.parse(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true

      request = Net::HTTP::Post.new(uri.path)
      request.set_form_data(params)

      response = http.request(request)
      data = JSON.parse(response.body)

      if response.is_a?(Net::HTTPSuccess)
        {
          success: true,
          access_token: data["access_token"],
          refresh_token: data["refresh_token"],
          expires_in: data["expires_in"]
        }
      else
        { success: false, error: data["error_description"] || data["error"] || "Unknown error" }
      end
    end
  end
end
