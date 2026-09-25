module Api
  module V1
    class AuthController < Api::BaseController
      skip_before_action :authenticate_user!, only: %i[login signup verify_otp resend_otp forgot_password reset_password oauth_authorize omniauth_callback omniauth_failure]

      OAUTH_PROVIDER_ALIASES = {
        "google" => "google_oauth2",
        "microsoft" => "microsoft_graph"
      }.freeze

      SUPPORTED_OAUTH_PROVIDERS = %w[google_oauth2 microsoft_graph slack zoom].freeze
      AUTH_DISABLED_OAUTH_PROVIDERS = %w[slack].freeze

      # POST /api/v1/auth/login
      def login
        login_params = auth_login_params
        ensure_required_params!(login_params, :email, :password)

        service = AuthService.new(**login_params.to_h.symbolize_keys)
        result = service.authenticate

        if result[:success]
          # Set secure, httponly cookie for middleware/server-side auth
          token = result[:data][:token]
          user = User.from_token(token)
          user&.sessions&.find_by(token: token)&.update(device_info: request.user_agent)
          cookies[:token] = {
            value: token,
            httponly: false,
            secure: Rails.env.production?,
            same_site: :lax,
            path: "/",
            expires: 30.days.from_now
          }
          render json: result, status: :ok
        else
          render json: result, status: :unauthorized
        end
      end

      # POST /api/v1/auth/signup
      def signup
        signup_params = auth_signup_params
        ensure_required_params!(signup_params, :email, :password)

        service = AuthService.new(**signup_params.to_h.symbolize_keys.slice(:email, :password))
        result = service.register(full_name: signup_params[:full_name])

        if result[:success] && result[:data][:token].present?
          token = result[:data][:token]
          user = User.from_token(token)
          user&.sessions&.find_by(token: token)&.update(device_info: request.user_agent)
          cookies[:token] = {
            value: token,
            httponly: false,
            secure: Rails.env.production?,
            same_site: :lax,
            path: "/",
            expires: 30.days.from_now
          }
        end

        render json: result, status: result[:success] ? :created : :unprocessable_entity
      end

      # POST /api/v1/auth/verify-otp
      def verify_otp
        service = AuthService.new(email: otp_verify_params[:email])
        result = service.verify_signup_otp(otp_code: otp_verify_params[:otp])

        if result[:success] && result[:data][:token].present?
          token = result[:data][:token]
          user = User.from_token(token)
          user&.sessions&.find_by(token: token)&.update(device_info: request.user_agent)
          cookies[:token] = {
            value: token,
            httponly: false,
            secure: Rails.env.production?,
            same_site: :lax,
            path: "/",
            expires: 30.days.from_now
          }
        end

        render json: result, status: result[:success] ? :ok : auth_error_status(result)
      end

      # POST /api/v1/auth/resend-otp
      def resend_otp
        service = AuthService.new(email: otp_email_params[:email])
        result = service.resend_signup_otp
        render json: result, status: result[:success] ? :ok : auth_error_status(result)
      end

      # POST /api/v1/auth/forgot-password
      def forgot_password
        user = User.by_email(otp_email_params[:email]).first
        if user&.sso_user?
          return render json: {
            success: false,
            error: {
              code: "SSO_ACCOUNT",
              message: "This account uses #{user.signup_method.titleize} login. Please sign in via your provider.",
              provider: user.signup_method
            }
          }, status: :unprocessable_entity
        end

        service = AuthService.new(email: otp_email_params[:email])
        result = service.request_password_reset(frontend_url: reset_frontend_url)
        render json: result, status: result[:success] ? :ok : auth_error_status(result)
      end

      # POST /api/v1/auth/reset-password
      def reset_password
        user = User.by_email(reset_password_params[:email]).first
        if user&.sso_user?
          return render json: {
            success: false,
            error: {
              code: "SSO_ACCOUNT",
              message: "This account uses #{user.signup_method.titleize} login. Please sign in via your provider."
            }
          }, status: :unprocessable_entity
        end

        service = AuthService.new(email: reset_password_params[:email])
        result = service.reset_password(
          token: reset_password_params[:token],
          new_password: reset_password_params[:password],
          password_confirmation: reset_password_params[:password_confirmation]
        )
        render json: result, status: result[:success] ? :ok : auth_error_status(result)
      end

      # POST /api/v1/auth/logout
      def logout
        result = AuthService.logout(current_user)
        cookies.delete(:token, path: "/")
        render json: result, status: :ok
      end

      # POST /api/v1/auth/refresh
      def refresh
        return render_unauthorized unless current_user

        token = current_user.generate_token
        current_user.sessions.find_by(token: token)&.update(device_info: request.user_agent)
        if token.blank?
          return render json: {
            success: false,
            error: {
              code: "SESSION_CREATION_FAILED",
              message: "Unable to refresh session token. Please login again."
            }
          }, status: :unprocessable_entity
        end

        cookies[:token] = {
          value: token,
          httponly: false,
          secure: Rails.env.production?,
          same_site: :lax,
          path: "/",
          expires: 30.days.from_now
        }

        render json: {
          success: true,
          data: { token: token },
          message: "Token refreshed"
        }, status: :ok
      end

      # GET /api/v1/auth/:provider/authorize
      # FE-friendly OAuth start route that redirects to OmniAuth request phase.
      # Preserves origin/token for connection mode during onboarding/settings.
      def oauth_authorize
        provider = normalized_oauth_provider(params[:provider])

        unless SUPPORTED_OAUTH_PROVIDERS.include?(provider)
          return render json: {
            success: false,
            error: {
              code: "UNSUPPORTED_OAUTH_PROVIDER",
              message: "Provider '#{params[:provider]}' is not supported"
            }
          }, status: :bad_request
        end

        if oauth_authentication_mode?(provider)
          return render json: {
            success: false,
            error: {
              code: "PROVIDER_AUTH_DISABLED",
              message: "Provider '#{params[:provider]}' is not available for authentication"
            }
          }, status: :forbidden
        end

        redirect_path = "/api/v1/auth/#{provider}"
        redirect_params = request.query_parameters.slice("origin", "token", "integration", "switch_account")
        redirect_params.merge!(google_oauth_request_params) if provider == "google_oauth2"

        redirect_query = redirect_params.to_query
        redirect_url = redirect_query.present? ? "#{redirect_path}?#{redirect_query}" : redirect_path

        redirect_to redirect_url, allow_other_host: false
      end

      # GET /api/v1/auth/:provider/callback
      # DUAL MODE:
      # 1. AUTHENTICATION MODE: Login or signup (no token, no current_user)
      # 2. CONNECTION MODE: Link integration to logged-in user (token present)
      #
      # ⚠️ CRITICAL: If token is present, we are in CONNECTION MODE.
      # We must authenticate the user and connect the integration ONLY.
      # We NEVER create a new user during connection mode.
      def omniauth_callback
        auth_data = request.env["omniauth.auth"]
        unless auth_data
          frontend_url = configured_frontend_url
          return redirect_to "#{frontend_url}/login#error=auth_failed", allow_other_host: true
        end

        origin = session.delete(:omniauth_origin)
        user_token = session.delete(:omniauth_current_user_token)
        integration_key = session.delete(:omniauth_integration_key)

        # If session token is nil, try to retrieve from cache (OAuth redirect may have lost session)
        if user_token.blank?
          provider = auth_data.provider
          cache_key = "oauth:token:#{request.remote_ip}:#{provider}"
          cached_data = Rails.cache.read(cache_key)

          if cached_data.is_a?(Hash)
            user_token = cached_data[:token]
            Rails.logger.info "[Auth] Retrieved user token from cache (session was lost)"
          end

          # Also try to get origin from cache if not in session
          origin ||= Rails.cache.read("oauth:origin:#{request.remote_ip}:#{provider}")
          integration_key ||= Rails.cache.read("oauth:integration:#{request.remote_ip}:#{provider}")
        end

        frontend_url = configured_frontend_url
        api_base_url = ENV["BACKEND_URL"] || request.base_url
        provider = auth_data.provider

        if AUTH_DISABLED_OAUTH_PROVIDERS.include?(provider) && user_token.blank?
          return redirect_to "#{frontend_url}/login#error=PROVIDER_AUTH_DISABLED", allow_other_host: true
        end

        # CONNECTION MODE: Token present, user is already logged in, connecting integration
        if user_token.present?
          # Get the user from the token
          user = authenticate_user_from_token(user_token)

          unless user
            redirect_path = origin == "onboarding" ? "/onboarding/integrations" : "/dashboard"
            return redirect_to "#{frontend_url}#{redirect_path}#error=unauthorized&message=#{CGI.escape('User session expired')}", allow_other_host: true
          end

          # Connect integration to existing user (never create new user)
          result = Integration::ConnectAccount.call(
            current_user: user,
            provider: provider,
            oauth_data: auth_data,
            integration_key: integration_key
          )

          # Clean up cache
          Rails.cache.delete("oauth:token:#{request.remote_ip}:#{provider}")
          Rails.cache.delete("oauth:origin:#{request.remote_ip}:#{provider}")
          Rails.cache.delete("oauth:integration:#{request.remote_ip}:#{provider}")

          redirect_path = origin == "onboarding" ? "/onboarding/integrations" : "/integrations"

          if result[:success]
            success_key = integration_key.presence || provider
            redirect_to "#{frontend_url}#{redirect_path}#success=#{success_key}", allow_other_host: true
          else
            redirect_to "#{frontend_url}#{redirect_path}#error=#{result[:error][:code]}&message=#{CGI.escape(result[:error][:message])}", allow_other_host: true
          end
        else
          # AUTHENTICATION MODE: No token, user not logged in, login or signup
          result = AuthService.from_omniauth(auth_data)

          if result[:success]
            # Extract data for redirect
            token = result[:data][:token]
            user_data = result[:data][:user]
            stage = user_data[:onboarding_stage] || 1
            target = user_data[:onboarding_completed] ? "/dashboard" : onboarding_path_for_stage(stage)

            redirect_to "#{frontend_url}/callback#token=#{token}&target=#{target}&api_base=#{CGI.escape(api_base_url)}", allow_other_host: true
          else
            redirect_to "#{frontend_url}/login#error=#{result[:error][:code]}", allow_other_host: true
          end
        end
      end

      # GET /api/v1/auth/failure
      # Handles OmniAuth authentication failures (CSRF, provider errors, etc.)
      def omniauth_failure
        error_code = extract_oauth_error_code
        frontend_url = configured_frontend_url
        origin = session.delete(:omniauth_origin) || "login"

        # Redirect to appropriate page based on origin
        target = origin == "onboarding" ? "/onboarding/integrations" : "/login"

        redirect_to "#{frontend_url}#{target}#error=#{error_code}", allow_other_host: true
      end

      # POST /api/v1/auth/change-password
      def change_password
        if current_user.sso_user?
          return render json: {
            success: false,
            error: {
              code: "SSO_ACCOUNT",
              message: "Password management is disabled for SSO accounts."
            }
          }, status: :forbidden
        end

        ensure_required_params!(params, :current_password, :new_password, :password_confirmation)

        unless current_user.authenticate(params[:current_password])
          return render json: { success: false, error: { code: "INVALID_CREDENTIALS", message: "Current password is incorrect" } }, status: :unauthorized
        end

        if params[:new_password].blank?
          return render json: { success: false, error: { code: "VALIDATION_ERROR", message: "New password cannot be blank" } }, status: :unprocessable_entity
        end

        current_user.password = params[:new_password]
        current_user.password_confirmation = params[:password_confirmation]

        if current_user.save
          render json: { success: true, message: "Password updated successfully" }, status: :ok
        else
          render json: { success: false, error: { code: "VALIDATION_ERROR", message: current_user.errors.full_messages.to_sentence, details: current_user.errors.as_json } }, status: :unprocessable_entity
        end
      end

      # GET /api/v1/auth/sessions
      def sessions
        active_sessions = current_user.sessions.valid.order(created_at: :desc)

        mapped_sessions = active_sessions.map do |s|
          {
            id: s.id,
            device_info: parse_user_agent(s.device_info),
            created_at: s.created_at,
            expires_at: s.expires_at,
            is_current: s.token == token # Extracted via Api::BaseController#token
          }
        end

        render json: {
          success: true,
          data: mapped_sessions
        }, status: :ok
      end

      private

      def parse_user_agent(user_agent)
        return "Chrome • macOS" if user_agent.blank?

        ua = user_agent.to_s

        os = if ua.include?("Windows")
               "Windows"
        elsif ua.include?("Macintosh") || ua.include?("Mac OS X")
               "macOS"
        elsif ua.include?("iPhone") || ua.include?("iPad") || ua.include?("iPod")
               "iOS"
        elsif ua.include?("Android")
               "Android"
        elsif ua.include?("Linux")
               "Linux"
        else
               "macOS"
        end

        browser = if ua.include?("Edg/") || ua.include?("Edge")
                    "Edge"
        elsif ua.include?("Chrome") && !ua.include?("Edg") && !ua.include?("OPR")
                    "Chrome"
        elsif ua.include?("Safari") && !ua.include?("Chrome") && !ua.include?("Android")
                    "Safari"
        elsif ua.include?("Firefox")
                    "Firefox"
        elsif ua.include?("Opera") || ua.include?("OPR")
                    "Opera"
        else
                    "Chrome"
        end

        "#{browser} • #{os}"
      end

      public

      # DELETE /api/v1/auth/sessions/:id
      def destroy_session
        session = current_user.sessions.find_by(id: params[:id])
        if session
          session.revoke!
          render json: { success: true, message: "Session revoked" }, status: :ok
        else
          render json: { success: false, error: { code: "NOT_FOUND", message: "Session not found" } }, status: :not_found
        end
      end

      # DELETE /api/v1/auth/sessions
      def destroy_other_sessions
        current_token = request.headers["Authorization"]&.split(" ")&.last || cookies[:token]
        other_sessions = current_user.sessions.valid.where.not(token: current_token)
        other_sessions.update_all(expires_at: Time.current)
        render json: { success: true, message: "All other sessions revoked" }, status: :ok
      end

      private

      def auth_login_params
        # Handle both root params and nested :auth params
        p = params.has_key?(:auth) ? params[:auth] : params
        p.permit(:email, :password)
      end

      def auth_signup_params
        # Handle both root params and nested :auth params
        p = params.has_key?(:auth) ? params[:auth] : params
        p.permit(:email, :password, :full_name)
      end

      def otp_verify_params
        p = params.has_key?(:auth) ? params[:auth] : params
        p.permit(:email, :otp)
      end

      def otp_email_params
        p = params.has_key?(:auth) ? params[:auth] : params
        p.permit(:email)
      end

      def reset_password_params
        p = params.has_key?(:auth) ? params[:auth] : params
        p.permit(:email, :token, :password, :password_confirmation)
      end

      def reset_frontend_url
        params[:frontend_url].presence || configured_frontend_url
      end

      def configured_frontend_url
        ENV.fetch("FRONTEND_URL")
      end

      def auth_error_status(result)
        return :unprocessable_entity if result[:error].blank?

        case result[:error][:code]
        when "USER_NOT_FOUND"
          :not_found
        when "EMAIL_NOT_VERIFIED"
          :forbidden
        when "OTP_INVALID", "OTP_EXPIRED", "OTP_MISSING", "OTP_NOT_FOUND"
          :unprocessable_entity
        when "OTP_LOCKED", "OTP_RESEND_COOLDOWN", "OTP_RESEND_LIMIT_REACHED",
             "PASSWORD_RESET_COOLDOWN", "PASSWORD_RESET_LIMIT_REACHED", "RESET_TOKEN_LOCKED"
          :too_many_requests
        when "RESET_TOKEN_INVALID", "RESET_TOKEN_EXPIRED", "RESET_TOKEN_MISSING"
          :unprocessable_entity
        else
          :unprocessable_entity
        end
      end

      def render_unauthorized
        render json: {
          success: false,
          error: { code: "UNAUTHORIZED", message: "User session invalid" }
        }, status: :unauthorized
      end

      def authenticate_user_from_token(token)
        return nil if token.blank?

        # Use User.from_token which validates JWT and checks session validity
        User.from_token(token)
      end

      def extract_oauth_error_code
        # Check for error stored in session (from OmniAuth error handler)
        oauth_error = session.delete(:omniauth_error)
        error_message = oauth_error&.dig(:message) || params[:message] || request.env["omniauth.error"]&.message || "Unknown error"

        # Map common error patterns to error codes (lowercase for consistency)
        code = case error_message
        when /state/i, /CSRF/i, /mismatch/i
          "invalid_state"
        when /provider/i
          "provider_mismatch"
        when /access_denied/i, /user_cancelled/i
          "auth_failed"
        when /timeout/i, /connection/i
          "timeout"
        else
          "auth_failed"
        end

        code
      end

      def normalized_oauth_provider(raw_provider)
        provider = raw_provider.to_s
        OAUTH_PROVIDER_ALIASES.fetch(provider, provider)
      end

      def onboarding_path_for_stage(stage)
        case stage.to_i
        when 1
          "/onboarding/profile"
        when 2
          "/onboarding/integrations"
        when 3
          "/onboarding/availability"
        when 4
          "/onboarding/meeting-types"
        when 5
          "/onboarding/finalise"
        else
          "/onboarding/profile"
        end
      end

      def google_oauth_request_params
        connect_mode = params[:token].present? || params[:integration].present?

        if connect_mode
          connect_google_oauth_params
        else
          auth_google_oauth_params
        end
      end

      def auth_google_oauth_params
        oauth_params = {
          "scope" => "openid email profile"
        }

        # Allow explicit account switching when the caller requests it.
        if params[:switch_account].to_s == "1"
          oauth_params["prompt"] = "select_account"
        end

        oauth_params
      end

      def connect_google_oauth_params
        oauth_params = {
          "scope" => "openid email profile https://www.googleapis.com/auth/calendar.events",
          "access_type" => "offline",
          "include_granted_scopes" => "true"
        }

        user = authenticate_user_from_token(params[:token].to_s)
        return oauth_params if user.blank?

        oauth_params["login_hint"] = user.email.to_s

        identity = user.external_identities.find_by(provider: "google_oauth2")
        needs_fresh_consent = identity.blank? || identity.refresh_token.blank? || !google_calendar_scope_granted?(identity.scopes)
        # oauth_params["prompt"] = "consent" if needs_fresh_consent

        oauth_params
      end

      def google_calendar_scope_granted?(scopes)
        Array(scopes).map(&:to_s).any? { |scope| scope.include?("calendar") }
      end

      def oauth_authentication_mode?(provider)
        AUTH_DISABLED_OAUTH_PROVIDERS.include?(provider) && params[:token].blank?
      end

      def ensure_required_params!(params_hash, *required_keys)
        required_keys.each do |key|
          raise ActionController::ParameterMissing, key unless params_hash.key?(key)
        end
      end
    end
  end
end
