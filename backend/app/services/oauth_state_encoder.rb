module OAuthStateEncoder
  # Encode user context (token, origin) into the OAuth state parameter
  # The state parameter is required by OmniAuth and will be returned by the OAuth provider
  def self.encode(token:, origin:)
    data = {
      token: token,
      origin: origin,
      timestamp: Time.current.to_i
    }

    # Encode as URL-safe Base64
    Base64.urlsafe_encode64(data.to_json).tr("=", "")
  end

  # Decode the OAuth state parameter back to user context
  def self.decode(state_param)
    return nil if state_param.blank?

    begin
      # Add padding back
      padded = state_param + "=" * (4 - state_param.length % 4)
      json = Base64.urlsafe_decode64(padded)
      data = JSON.parse(json)

      # Reject old states (older than 30 minutes)
      if (Time.current.to_i - data["timestamp"].to_i) > 1800
        return nil
      end

      data.symbolize_keys
    rescue StandardError
      nil
    end
  end
end
