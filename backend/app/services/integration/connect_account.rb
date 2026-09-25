module Integration
  class ConnectAccount
    INTEGRATION_KEYS_BY_PROVIDER = {
      "google_oauth2" => %w[google google_meet],
      "microsoft_graph" => %w[outlook teams],
      "slack" => %w[slack],
      "zoom" => %w[zoom]
    }.freeze

    def self.call(current_user:, provider:, oauth_data:, integration_key: nil)
      new(current_user, provider, oauth_data, integration_key).execute
    end

    def initialize(current_user, provider, oauth_data, integration_key)
      @current_user = current_user
      @provider = provider.to_s
      @oauth_data = oauth_data
      @integration_key = integration_key.to_s
    end

    def execute
      validate_user_session!
      validate_email_match!
      validate_uid_uniqueness!

      link_account
    rescue SecurityError, IntegrationIdentityMismatchError => e
      { success: false, error: { code: "SECURITY_ERROR", message: e.message } }
    rescue => e
      Rails.logger.error "[Integration] Failed to connect #{provider}: #{e.message}"
      { success: false, error: { code: "CONNECT_ERROR", message: "Failed to connect integration" } }
    end

    private

    attr_reader :current_user, :provider, :oauth_data, :integration_key

    def validate_user_session!
      if current_user.blank?
        raise SecurityError, "Must be logged in before connecting integration"
      end
    end

    def validate_email_match!
      provider_email = oauth_data.info.email.to_s.downcase.strip
      current_email  = current_user.email.to_s.downcase.strip

      if provider_email.present? && provider_email != current_email
        raise IntegrationIdentityMismatchError,
              "You are logged in as #{current_email} but attempted to connect #{provider_email}. Please connect the matching account."
      end
    end

    def validate_uid_uniqueness!
      existing_identity = ExternalIdentity.find_by(provider: provider, uid: oauth_data.uid)

      if existing_identity.present? && existing_identity.user_id != current_user.id
        raise SecurityError, "This external account is already linked to another user"
      end
    end

    def link_account
      identity = ExternalIdentity.find_or_initialize_by(
        user_id: current_user.id,
        provider: provider
      )

      identity.uid = oauth_data.uid
      identity.provider_email = oauth_data.info.email
      identity.access_token = oauth_data.credentials.token
      incoming_refresh_token = oauth_data.credentials.refresh_token.to_s.presence
      identity.refresh_token = incoming_refresh_token || identity.refresh_token
      identity.expires_at = Time.at(oauth_data.credentials.expires_at) if oauth_data.credentials.expires_at

      # REQUIRED: Store granted scopes for audit trail and permission management
      identity.scopes = extract_scopes

      # REQUIRED:Mark account type (personal = individual user, workspace/enterprise for orgs)
      identity.account_type = "personal"

      identity.metadata = oauth_data.to_h

      if identity.save
        # Sync to legacy integrations JSON field for compatibility
        update_user_integrations
        { success: true, data: { identity_id: identity.id } }
      else
        { success: false, error: { code: "VALIDATION_ERROR", message: identity.errors.full_messages.to_sentence } }
      end
    end

    def extract_scopes
      # Different providers use different scope approaches
      # Google/Microsoft use space-separated strings
      # Some use arrays
      # Normalize to array

      scopes_raw = oauth_data.credentials&.scope || oauth_data.raw_info&.scopes || []

      case scopes_raw
      when String
        scopes_raw.split(/[\s,]+/).map(&:strip).reject(&:blank?)
      when Array
        scopes_raw.map(&:to_s).flat_map { |scope| scope.split(/[\s,]+/) }.map(&:strip).reject(&:blank?)
      else
        []
      end
    end

    def update_user_integrations
      user_integrations = current_user.integrations || { "connected" => [] }
      connected = Array(user_integrations["connected"])

      key_to_connect = normalized_integration_key || default_integration_key_for_provider
      connected |= [ key_to_connect ] if key_to_connect.present?

      user_integrations["connected"] = connected
      current_user.update_column(:integrations, user_integrations)
    end

    def normalized_integration_key
      return nil if integration_key.blank?

      allowed_keys = INTEGRATION_KEYS_BY_PROVIDER[provider] || []
      return nil unless allowed_keys.include?(integration_key)

      integration_key
    end

    def default_integration_key_for_provider
      INTEGRATION_KEYS_BY_PROVIDER[provider]&.first
    end
  end
end

class IntegrationIdentityMismatchError < StandardError; end
