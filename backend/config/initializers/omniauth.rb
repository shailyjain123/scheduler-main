# Configure OmniAuth to match the application's structure and frontend behavior
require_relative "../../app/errors/oauth_error"

OmniAuth.config.path_prefix = "/api/v1/auth"
OmniAuth.config.allowed_request_methods = [ :get, :post ]
OmniAuth.config.silence_get_warning = true

# Build full_host dynamically so OAuth redirect_uri matches tunnel/custom URLs.
OmniAuth.config.full_host = lambda do |env|
  configured = ENV["BACKEND_URL"].to_s.strip
  configured = configured.sub(%r{/$}, "")
  return configured if configured.present?

  request = Rack::Request.new(env)
  forwarded_proto = env["HTTP_X_FORWARDED_PROTO"].to_s.split(",").first.to_s.strip
  proto = forwarded_proto.presence || request.scheme
  "#{proto}://#{request.host_with_port}"
end

# IMPORTANT: Use OmniAuth's built-in state parameter validation for CSRF protection
# This handles state automatically and reliably across OAuth redirects

# Capture context during OAuth request phase (not for state validation)
OmniAuth.config.before_request_phase do |env|
  request = ActionDispatch::Request.new(env)

  # Capture token for Connection Mode (already logged-in user connecting integration)
  # Store in BOTH session AND cache to survive the OAuth redirect
  provider = request.path.split("/").last

  if request.params["token"].present?
    token = request.params["token"]

    # Store in session (works in same-origin requests)
    env["rack.session"][:omniauth_current_user_token] = token
    Rails.logger.debug "[Auth] Captured current user token for Connection Mode (session)"

    # Also store in cache with TTL (survives cross-site redirects when Rack session is lost)
    # NOTE: This IP-based cache key is for SESSION RECOVERY only, NOT for CSRF protection.
    # OmniAuth's built-in `state` parameter handles CSRF validation automatically.
    # The IP key is a best-effort fallback when the OAuth redirect loses the Rack session
    # (e.g., cross-site SameSite cookie restrictions). It is NOT cryptographically secure.
    cache_key = "oauth:token:#{request.remote_ip}:#{provider}"
    Rails.cache.write(cache_key, { token: token, timestamp: Time.current.to_i }, expires_in: 10.minutes)
    Rails.logger.debug "[Auth] Cached token for OAuth callback recovery: provider=#{provider}, key=#{cache_key}"
  end

  # Capture origin for UX context (onboarding vs settings)
  if request.params["origin"].present?
    origin = request.params["origin"]
    env["rack.session"][:omniauth_origin] = origin

    # Also cache origin
    cache_key = "oauth:origin:#{request.remote_ip}:#{provider}"
    Rails.cache.write(cache_key, origin, expires_in: 30.minutes)
    Rails.logger.debug "[Auth] Captured origin into session and cache: #{origin}"
  end

  # Capture integration key so callback can persist exactly one integration id
  if request.params["integration"].present?
    integration_key = request.params["integration"]
    env["rack.session"][:omniauth_integration_key] = integration_key

    cache_key = "oauth:integration:#{request.remote_ip}:#{provider}"
    Rails.cache.write(cache_key, integration_key, expires_in: 30.minutes)
    Rails.logger.debug "[Auth] Captured integration key into session and cache: #{integration_key}"
  end
end

# Error handler for OmniAuth exceptions
OmniAuth.config.on_failure = Proc.new do |env|
  error_type = env["omniauth.error.type"]
  error_message = env["omniauth.error"]&.message

  Rails.logger.error "[Auth] OmniAuth failure: type=#{error_type}, message=#{error_message}"

  # Store error in session for omniauth_failure action
  request = ActionDispatch::Request.new(env)

  # Recovery: try to get origin from cache if session is lost
  # Strategy name is available in env['omniauth.error.strategy'].name
  strategy_name = env["omniauth.error.strategy"]&.name
  if strategy_name
    cache_key = "oauth:origin:#{request.remote_ip}:#{strategy_name}"
    cached_origin = Rails.cache.read(cache_key)
    env["rack.session"][:omniauth_origin] ||= cached_origin if cached_origin
    Rails.logger.debug "[Auth] Failure recovery: strategy=#{strategy_name}, recovered_origin=#{cached_origin}"
  end

  env["rack.session"][:omniauth_error] = {
    type: error_type.to_s,
    message: error_message
  }

  # Create a redirect response to the omniauth_failure path
  status = 302
  headers = { "Location" => "/api/v1/auth/failure" }
  body = []

  [ status, headers, body ]
end

Rails.application.config.middleware.use OmniAuth::Builder do
  provider :google_oauth2,
           ENV["GOOGLE_CLIENT_ID"],
           ENV["GOOGLE_CLIENT_SECRET"],
           scope: "openid email profile https://www.googleapis.com/auth/calendar.events.read https://www.googleapis.com/auth/calendar.readonly",
           access_type: "offline",
           # prompt: "consent",
           include_granted_scopes: "true",
           callback_path: "/api/v1/auth/google_oauth2/callback"
  provider :microsoft_graph,
           ENV["MICROSOFT_CLIENT_ID"],
           ENV["MICROSOFT_CLIENT_SECRET"],
           scope: "openid email profile User.Read Calendar.Read",
           callback_path: "/api/v1/auth/microsoft_graph/callback"
  provider :slack, ENV["SLACK_CLIENT_ID"], ENV["SLACK_CLIENT_SECRET"],
           scope: "openid,email,profile",
           callback_path: "/api/v1/auth/slack/callback"
  provider :zoom, ENV["ZOOM_CLIENT_ID"], ENV["ZOOM_CLIENT_SECRET"],
           callback_path: "/api/v1/auth/zoom/callback"
end
