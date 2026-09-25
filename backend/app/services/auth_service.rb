class AuthService
  attr_reader :email, :password

  def initialize(email:, password: nil)
    @email = email.to_s.downcase.strip
    @password = password.to_s if password
  end

  def authenticate
    user = User.by_email(email).first

    unless user&.authenticate(@password)
      return error_response("INVALID_CREDENTIALS", "Email or password is incorrect")
    end

    unless user.email_verified? && user.status == "active"
      return error_response(
        "EMAIL_NOT_VERIFIED",
        "Please verify your email with OTP before logging in",
        { email: user.email }
      )
    end

    token = user.generate_token
    return error_response("SESSION_CREATION_FAILED", "Unable to create login session. Please try again.") if token.blank?

    success_response({ token: token, user: UserSerializer.new(user).as_json })
  end

  def register(full_name:, **extra_params)
    user = User.new(
      email: email,
      password: @password,
      full_name: full_name,
      status: "inactive",
      signup_method: "email",
      **extra_params
    )

    unless user.save
      error_msg = user.errors.full_messages.to_sentence
      return error_response("VALIDATION_ERROR", "Signup failed: #{error_msg}", user.errors.as_json)
    end

    otp_code = user.generate_signup_otp!
    AuthMailer.with(user: user, otp_code: otp_code).signup_otp_email.deliver_now

    success_response(
      {
        verification_required: true,
        email: user.email,
        otp_expires_in_seconds: User::OTP_TTL.to_i
      },
      "Signup initiated. Please verify OTP sent to your email."
    )
  end

  def verify_signup_otp(otp_code:)
    user = User.by_email(email).first
    return error_response("USER_NOT_FOUND", "User not found") unless user

    verification = user.verify_signup_otp!(otp_code)
    return error_response(verification[:code], verification[:message]) unless verification[:success]

    token = user.generate_token
    return error_response("SESSION_CREATION_FAILED", "Unable to create login session. Please try again.") if token.blank?

    success_response({ token: token, user: UserSerializer.new(user).as_json }, "Email verified successfully")
  end

  def resend_signup_otp
    user = User.by_email(email).first
    return error_response("USER_NOT_FOUND", "User not found") unless user

    gate = user.can_resend_otp?
    unless gate[:allowed]
      return error_response(gate[:code], gate[:message])
    end

    user.mark_otp_resent!
    otp_code = user.generate_signup_otp!
    AuthMailer.with(user: user, otp_code: otp_code).signup_otp_email.deliver_now

    success_response(
      {
        email: user.email,
        otp_expires_in_seconds: User::OTP_TTL.to_i,
        remaining_attempts: [ 0, User::OTP_MAX_RESENDS_PER_WINDOW - user.otp_resend_count ].max
      },
      "OTP resent successfully"
    )
  end

  def request_password_reset(frontend_url: nil)
    user = User.by_email(email).first

    # Return generic success to reduce account enumeration risk.
    return success_response({}, "If an account exists for this email, a reset link has been sent.") unless user

    gate = user.can_request_password_reset?
    return error_response(gate[:code], gate[:message]) unless gate[:allowed]

    user.mark_password_reset_requested!
    reset_token = user.generate_password_reset_token!

    AuthMailer.with(
      user: user,
      reset_token: reset_token,
      frontend_url: frontend_url
    ).password_reset_email.deliver_now

    success_response({}, "If an account exists for this email, a reset link has been sent.")
  end

  def reset_password(token:, new_password:, password_confirmation:)
    user = User.by_email(email).first
    return error_response("USER_NOT_FOUND", "User not found") unless user

    result = user.reset_password_with_token!(
      token: token,
      new_password: new_password,
      password_confirmation: password_confirmation
    )
    return error_response(result[:code], result[:message], result[:details]) unless result[:success]

    success_response({}, "Password reset successful. Please sign in with your new password.")
  end

  def self.logout(user)
    user.sessions.update_all(expires_at: Time.current)
    { success: true, message: "Logged out successfully" }
  end

  def self.from_omniauth(auth)
    email = auth.info.email.to_s.downcase.strip
    full_name = auth.info.name
    avatar_url = auth.info.image.to_s.presence

    Rails.logger.debug "[Auth] OmniAuth Authentication Mode for: #{email}"

    # Check for existing identity
    identity = ExternalIdentity.find_by(provider: auth.provider, uid: auth.uid)
    user = identity&.user || User.find_by(email: email)

    if user.nil?
      Rails.logger.debug "[Auth] Creating new user for: #{email}"
      user = User.new(
        email: email,
        full_name: full_name,
        avatar_url: avatar_url,
        avatar_source: auth.provider,
        password: "Oauth#{SecureRandom.hex(8)}A!",
        status: "active",
        email_verified_at: Time.current,
        signup_method: auth.provider,
        onboarding_stage: 1
      )

      unless user.save
        Rails.logger.error "[Auth] User creation failed: #{user.errors.full_messages}"
        return { success: false, error: { code: "AUTH_ERROR", message: user.errors.full_messages.to_sentence } }
      end
    else
      # If user exists but is not active or verified, activate them since they successfully logged in via OAuth
      if !user.email_verified? || user.status != "active"
        Rails.logger.info "[Auth] Activating existing unverified/inactive user: #{email}"
        user.update!(status: "active", email_verified_at: Time.current)
      end
    end

    # Profile Image Protection: ONLY update if NOT manually uploaded
    if avatar_url.present? && !user.custom_avatar?
      user.update(avatar_url: avatar_url, avatar_source: auth.provider)
    end

    # Create or update identity for this user
    unless identity && identity.user_id == user.id
      identity = ExternalIdentity.find_or_initialize_by(user_id: user.id, provider: auth.provider)
      identity.uid = auth.uid
    end

    identity.provider_email = auth.info.email
    identity.access_token = auth.credentials.token
    incoming_refresh_token = auth.credentials.refresh_token.to_s.presence
    identity.refresh_token = incoming_refresh_token || identity.refresh_token
    identity.expires_at = Time.at(auth.credentials.expires_at) if auth.credentials.expires_at

    # REQUIRED: Store granted scopes
    scopes = extract_scopes(auth)
    identity.scopes = scopes

    # REQUIRED: Account type
    identity.account_type = "personal"

    identity.metadata = auth.to_h
    identity.save

    sync_integrations_from_oauth!(user: user, provider: auth.provider, scopes: scopes)

    token = user.generate_token
    if token.blank?
      Rails.logger.error "[Auth] Session creation failed for OAuth user: #{email}"
      return { success: false, error: { code: "SESSION_CREATION_FAILED", message: "Unable to create login session. Please try again." } }
    end

    Rails.logger.debug "[Auth] Token generated for: #{email}"
    { success: true, data: { token: token, user: UserSerializer.new(user).as_json } }
  end

  def self.sync_integrations_from_oauth!(user:, provider:, scopes:)
    case provider.to_s
    when "google_oauth2"
      integrations = (user.integrations || {}).deep_dup
      connected = Array(integrations["connected"]).map(&:to_s)

      # Any successful Google OAuth means calendar provider is connected.
      connected |= [ "google" ]

      if google_calendar_scope_granted?(scopes)
        connected |= [ "google_meet" ]
      else
        # Keep persisted state aligned with granted scopes after re-consent/revocation.
        connected -= [ "google_meet" ]
      end

      integrations["connected"] = connected
      user.update_column(:integrations, integrations)
    end
  end

  def self.google_calendar_scope_granted?(scopes)
    normalized_scopes = Array(scopes).map(&:to_s)
    normalized_scopes.any? do |scope|
      scope.include?("calendar")
    end
  end

  def self.extract_scopes(oauth_data)
    # Different providers use different scope approaches
    scopes_raw = oauth_data.credentials&.scope || oauth_data.raw_info&.scopes || []

    case scopes_raw
    when String
      scopes_raw.split.map(&:strip).compact
    when Array
      scopes_raw.map(&:to_s)
    else
      []
    end
  end

  private

  def success_response(data = {}, message = nil)
    {
      success: true,
      data: data,
      message: message
    }
  end

  def error_response(code, message, details = nil)
    error_data = {
      code: code,
      message: message
    }
    error_data[:details] = details if details.present?

    {
      success: false,
      error: error_data
    }
  end
end
