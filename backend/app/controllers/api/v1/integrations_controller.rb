module Api
  module V1
    class IntegrationsController < Api::BaseController
      require "json"
      require "net/http"
      require "uri"

      # GET /api/v1/integrations
      def index
        identities = current_user.external_identities

        # Integration keys mapped to frontend tools
        # We need to map 'google_oauth2' identity to 'google' and 'google_meet'
        # and 'microsoft_graph' to 'outlook' and 'teams'

        statuses = {}

        identities.each do |identity|
          # Refresh tokens if expired
          refresh_result = Integration::RefreshToken.call(identity)

          is_valid = refresh_result[:success]

          keys = integration_keys_for(identity.provider)
          keys.each do |key|
            statuses[key] = {
              connected: true,
              valid: is_valid,
              email: identity.provider_email,
              last_used_at: identity.last_used_at
            }
          end
        end

        # Fill in disconnected ones
        all_keys = [ "google", "google_meet", "outlook", "teams", "slack", "zoom" ]
        all_keys.each do |key|
          statuses[key] ||= { connected: false }
        end

        render json: {
          success: true,
          data: {
            integrations: statuses
          }
        }
      end

      # GET /api/v1/integrations/location_defaults
      def location_defaults
        result = Integrations::DefaultLocationResolver.call(current_user)
        render json: {
          success: true,
          data: result
        }
      end

      # POST /api/v1/integrations/:provider/oauth/callback
      # CONNECTION MODE ONLY: Link OAuth provider to currently logged-in user
      #
      # Supports both:
      # - Web OAuth: OmniAuth handles code exchange (callback from OAuth provider)
      # - Mobile OAuth: PKCE flow (code + code_verifier sent from mobile app)
      #
      # ⚠️ CRITICAL SECURITY: current_user MUST be present. No exceptions. No fallback.
      # This is where integrations are linked to existing users.
      def oauth_callback
        # FAIL if no current_user (require authentication)
        unless current_user
          render json: {
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "You must be logged in to connect an integration"
            }
          }, status: :unauthorized
          return
        end

        # Determine flow based on parameters
        if params[:code].present? && params[:code_verifier].present?
          # Mobile PKCE OAuth flow: Handle code exchange
          handle_mobile_pkce_callback(params[:provider])
        else
          # Web OAuth flow: OmniAuth has already exchanged code
          handle_web_oauth_callback(params[:provider])
        end
      end

      private

      def handle_web_oauth_callback(provider)
        auth_data = request.env["omniauth.auth"]
        origin = session.delete(:omniauth_origin)

        frontend_url = configured_frontend_url

        # Connection Mode: Link integration to currently logged-in user ONLY
        result = Integration::ConnectAccount.call(
          current_user: current_user,
          provider: provider,
          oauth_data: auth_data,
          integration_key: params[:integration]
        )

        # Determine redirect target based on origin
        redirect_path = origin == "onboarding" ? "/onboarding/integrations" : "/integrations"

        if result[:success]
          Notifications::CreateService.call(
            user: current_user,
            event_name: "integration.connected",
            category: "integrations",
            notification_type: "insight",
            title: "Integration connected",
            description: "An integration has been connected successfully.",
            action_url: "/integrations",
            metadata: {
              provider: provider,
              source: "web"
            }
          )

          redirect_to "#{frontend_url}#{redirect_path}#success=#{provider}", allow_other_host: true
        else
          redirect_to "#{frontend_url}#{redirect_path}#error=#{result[:error][:code]}&message=#{CGI.escape(result[:error][:message])}", allow_other_host: true
        end
      end

      def handle_mobile_pkce_callback(provider)
        code = params[:code]
        code_verifier = params[:code_verifier]
        state = params[:state]

        # Validate state (CSRF protection)
        stored_state = session[:oauth_state]
        unless state.present? && stored_state == state
          return render json: {
            success: false,
            error: {
              code: "INVALID_STATE",
              message: "OAuth state validation failed"
            }
          }, status: :unauthorized
        end

        # Exchange authorization code for tokens using PKCE
        auth_data = exchange_pkce_code(provider, code, code_verifier)

        unless auth_data
          return render json: {
            success: false,
            error: {
              code: "TOKEN_EXCHANGE_FAILED",
              message: "Failed to exchange authorization code"
            }
          }, status: :bad_request
        end

        # Link integration
        result = Integration::ConnectAccount.call(
          current_user: current_user,
          provider: provider,
          oauth_data: auth_data,
          integration_key: params[:integration]
        )

        # Return JSON response for mobile app
        origin = params[:origin] || "settings"

        if result[:success]
          Notifications::CreateService.call(
            user: current_user,
            event_name: "integration.connected",
            category: "integrations",
            notification_type: "insight",
            title: "Integration connected",
            description: "An integration has been connected successfully.",
            action_url: "/integrations",
            metadata: {
              provider: provider,
              source: "mobile"
            }
          )

          render json: {
            success: true,
            data: result[:data],
            origin: origin,
            message: "Integration connected successfully"
          }, status: :ok
        else
          render json: {
            success: false,
            error: result[:error],
            origin: origin
          }, status: :bad_request
        end
      end

      def exchange_pkce_code(provider, code, code_verifier)
        begin
          case normalize_provider(provider)
          when "google_oauth2"
            exchange_google_token(code, code_verifier)
          when "microsoft_graph"
            exchange_microsoft_token(code, code_verifier)
          when "slack"
            exchange_slack_token(code, code_verifier)
          else
            nil
          end
        rescue => e
          Rails.logger.error "[Integration] PKCE code exchange failed: #{e.message}"
          nil
        end
      end

      def exchange_google_token(code, code_verifier)
        token_body = exchange_token(
          token_url: "https://oauth2.googleapis.com/token",
          code: code,
          code_verifier: code_verifier,
          client_id: ENV["GOOGLE_CLIENT_ID"],
          client_secret: ENV["GOOGLE_CLIENT_SECRET"],
          redirect_uri: oauth_redirect_uri("google")
        )
        return nil if token_body.blank?

        profile = get_json("https://openidconnect.googleapis.com/v1/userinfo", token_body["access_token"])
        return nil if profile.blank?

        build_auth_hash(
          provider: "google_oauth2",
          uid: profile["sub"] || profile["email"],
          email: profile["email"],
          name: profile["name"],
          token_body: token_body,
          raw_info: profile
        )
      end

      def exchange_microsoft_token(code, code_verifier)
        token_body = exchange_token(
          token_url: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
          code: code,
          code_verifier: code_verifier,
          client_id: ENV["MICROSOFT_CLIENT_ID"],
          client_secret: ENV["MICROSOFT_CLIENT_SECRET"],
          redirect_uri: oauth_redirect_uri("microsoft")
        )
        return nil if token_body.blank?

        profile = get_json("https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName", token_body["access_token"])
        return nil if profile.blank?

        email = profile["mail"].presence || profile["userPrincipalName"]
        build_auth_hash(
          provider: "microsoft_graph",
          uid: profile["id"] || email,
          email: email,
          name: profile["displayName"] || email,
          token_body: token_body,
          raw_info: profile
        )
      end

      def exchange_slack_token(code, code_verifier)
        token_body = exchange_token(
          token_url: "https://slack.com/api/openid.connect.token",
          code: code,
          code_verifier: code_verifier,
          client_id: ENV["SLACK_CLIENT_ID"],
          client_secret: ENV["SLACK_CLIENT_SECRET"],
          redirect_uri: oauth_redirect_uri("slack")
        )
        return nil if token_body.blank?

        profile = get_json("https://slack.com/api/openid.connect.userInfo", token_body["access_token"])
        return nil if profile.blank?

        build_auth_hash(
          provider: "slack",
          uid: profile["sub"] || profile["email"],
          email: profile["email"],
          name: profile["name"] || profile["email"],
          token_body: token_body,
          raw_info: profile
        )
      end

      def normalize_provider(provider)
        case provider.to_s
        when "google", "google_oauth2"
          "google_oauth2"
        when "microsoft", "microsoft_graph"
          "microsoft_graph"
        when "slack"
          "slack"
        else
          provider.to_s
        end
      end

      def oauth_redirect_uri(provider)
        explicit_uri = params[:redirect_uri].to_s.strip
        return explicit_uri if explicit_uri.present?

        case provider
        when "google"
          ENV["GOOGLE_MOBILE_REDIRECT_URI"].presence || ENV["GOOGLE_REDIRECT_URI"].presence || default_redirect_uri
        when "microsoft"
          ENV["MICROSOFT_MOBILE_REDIRECT_URI"].presence || ENV["MICROSOFT_REDIRECT_URI"].presence || default_redirect_uri
        when "slack"
          ENV["SLACK_MOBILE_REDIRECT_URI"].presence || ENV["SLACK_REDIRECT_URI"].presence || default_redirect_uri
        else
          default_redirect_uri
        end
      end

      def default_redirect_uri
        frontend_url = configured_frontend_url
        "#{frontend_url}/callback"
      end

      def configured_frontend_url
        ENV.fetch("FRONTEND_URL")
      end

      def exchange_token(token_url:, code:, code_verifier:, client_id:, client_secret:, redirect_uri:)
        return nil if client_id.blank? || redirect_uri.blank?

        body = {
          grant_type: "authorization_code",
          code: code,
          code_verifier: code_verifier,
          client_id: client_id,
          redirect_uri: redirect_uri
        }
        body[:client_secret] = client_secret if client_secret.present?

        uri = URI.parse(token_url)
        request = Net::HTTP::Post.new(uri)
        request["Content-Type"] = "application/x-www-form-urlencoded"
        request.set_form_data(body)

        response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
          http.request(request)
        end

        parsed = JSON.parse(response.body)

        unless response.is_a?(Net::HTTPSuccess)
          Rails.logger.error "[Integration] PKCE token exchange failed: provider=#{params[:provider]}, status=#{response.code}, body=#{parsed}"
          return nil
        end

        # Slack token endpoint wraps token payload under `ok` semantics.
        if parsed["ok"] == false
          Rails.logger.error "[Integration] Slack token exchange failed: #{parsed}"
          return nil
        end

        parsed
      rescue JSON::ParserError => e
        Rails.logger.error "[Integration] PKCE token parse failed: #{e.message}"
        nil
      end

      def get_json(url, access_token)
        uri = URI.parse(url)
        request = Net::HTTP::Get.new(uri)
        request["Authorization"] = "Bearer #{access_token}"

        response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
          http.request(request)
        end
        parsed = JSON.parse(response.body)

        unless response.is_a?(Net::HTTPSuccess)
          Rails.logger.error "[Integration] PKCE profile request failed: status=#{response.code}, body=#{parsed}"
          return nil
        end

        if parsed["ok"] == false
          Rails.logger.error "[Integration] Slack profile request failed: #{parsed}"
          return nil
        end

        parsed
      rescue JSON::ParserError => e
        Rails.logger.error "[Integration] PKCE profile parse failed: #{e.message}"
        nil
      end

      def build_auth_hash(provider:, uid:, email:, name:, token_body:, raw_info:)
        return nil if uid.blank? || email.blank?

        expires_at = token_body["expires_at"]
        if expires_at.blank? && token_body["expires_in"].present?
          expires_at = Time.current.to_i + token_body["expires_in"].to_i
        end

        OmniAuth::AuthHash.new(
          provider: provider,
          uid: uid,
          info: {
            email: email,
            name: name
          },
          credentials: {
            token: token_body["access_token"],
            refresh_token: token_body["refresh_token"],
            expires_at: expires_at,
            scope: token_body["scope"]
          },
          raw_info: raw_info
        )
      end

      # POST /api/v1/integrations/:provider/connect
      # Initiates OAuth flow for integration connection
      def connect
        provider = params[:provider]
        # Route to the connection-mode endpoint with current token
        token = current_user&.generate_token
        origin = params[:origin] || "settings"

        redirect_to "/api/v1/auth/#{provider}?origin=#{origin}&token=#{token}", allow_other_host: true
      end

      # DELETE /api/v1/integrations/:provider
      def destroy
        provider_param = params[:provider].to_s

        # 1. Map frontend key to backend provider
        provider = case provider_param
        when "google", "google_meet" then "google_oauth2"
        when "outlook", "teams" then "microsoft_graph"
        else provider_param
        end

        # 2. Update user's integrations JSON for legacy compatibility
        integrations = current_user.integrations || { "connected" => [] }
        keys_to_remove = integration_keys_for(provider_param)
        connected = Array(integrations["connected"])
        integrations["connected"] = connected - keys_to_remove

        # 3. Delete the external identity record if no other tools use this provider
        # (e.g., if we disconnect 'google_meet', we check if 'google' is still connected)
        remaining_tools = integrations["connected"]
        provider_tools = integration_keys_for(provider)

        still_needed = (remaining_tools & provider_tools).any?

        unless still_needed
          current_user.external_identities.find_by(provider: provider)&.destroy
        end

        if current_user.update(integrations: integrations)
          Notifications::CreateService.call(
            user: current_user,
            event_name: "integration.disconnected",
            category: "integrations",
            notification_type: "insight",
            title: "Integration disconnected",
            description: "An integration has been disconnected.",
            action_url: "/integrations",
            metadata: {
              provider: provider_param
            }
          )

          render json: { success: true, message: "#{provider_param} disconnected" }
        else
          render json: { success: false, message: "Failed to disconnect" }, status: 422
        end
      end

      def integration_keys_for(provider)
        case provider
        when "google", "google_meet", "outlook", "teams", "slack", "zoom"
          [ provider ]
        when "google_oauth2"
          [ "google", "google_meet" ]
        when "microsoft_graph", "microsoft"
          [ "outlook", "teams" ]
        when "slack"
          [ "slack" ]
        when "zoom"
          [ "zoom" ]
        else
          [ provider ]
        end
      end

      public :destroy
    end
  end
end
