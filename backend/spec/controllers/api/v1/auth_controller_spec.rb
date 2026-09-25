require 'rails_helper'

RSpec.describe Api::V1::AuthController, type: :request do
  describe 'POST /api/v1/auth/login' do
    context 'with valid credentials' do
      let!(:user) { create(:user, email: 'test@example.com', password: 'ValidPass1!') }

      it 'returns 200 status with success response' do
        post '/api/v1/auth/login', params: {
          email: 'test@example.com',
          password: 'ValidPass1!'
        }

        expect(response).to have_http_status(200)
        expect(response.parsed_body['success']).to be true
      end

      it 'returns token in response' do
        post '/api/v1/auth/login', params: {
          email: 'test@example.com',
          password: 'ValidPass1!'
        }

        expect(response.parsed_body['data']).to have_key('token')
        expect(response.parsed_body['data']['token']).to be_present
      end

      it 'returns user data in response' do
        post '/api/v1/auth/login', params: {
          email: 'test@example.com',
          password: 'ValidPass1!'
        }

        data = response.parsed_body['data']['user']
        expect(data['email']).to eq('test@example.com')
        expect(data['id']).to eq(user.id)
      end
    end

    context 'with invalid credentials' do
      before { create(:user, email: 'test@example.com', password: 'ValidPass1!') }

      it 'returns 401 status for wrong password' do
        post '/api/v1/auth/login', params: {
          email: 'test@example.com',
          password: 'WrongPassword'
        }

        expect(response).to have_http_status(401)
        expect(response.parsed_body['success']).to be false
      end

      it 'returns error response for non-existent email' do
        post '/api/v1/auth/login', params: {
          email: 'nonexistent@example.com',
          password: 'AnyPass1!'
        }

        expect(response).to have_http_status(401)
        expect(response.parsed_body['error']['code']).to eq('INVALID_CREDENTIALS')
      end

      it 'returns error message' do
        post '/api/v1/auth/login', params: {
          email: 'nonexistent@example.com',
          password: 'AnyPass1!'
        }

        expect(response.parsed_body['error']['message']).to eq('Email or password is incorrect')
      end

      it 'blocks login for unverified users' do
        create(:user, :unverified, email: 'pending@example.com', password: 'ValidPass1!')

        post '/api/v1/auth/login', params: {
          email: 'pending@example.com',
          password: 'ValidPass1!'
        }

        expect(response).to have_http_status(401)
        expect(response.parsed_body['error']['code']).to eq('EMAIL_NOT_VERIFIED')
      end
    end

    context 'with missing parameters' do
      it 'returns 400 for missing email' do
        post '/api/v1/auth/login', params: {
          password: 'ValidPass1!'
        }

        expect(response).to have_http_status(400)
      end

      it 'returns 400 for missing password' do
        post '/api/v1/auth/login', params: {
          email: 'test@example.com'
        }

        expect(response).to have_http_status(400)
      end
    end
  end

  describe 'POST /api/v1/auth/signup' do
    context 'with valid data' do
      it 'returns 201 status with success response' do
        post '/api/v1/auth/signup', params: {
          email: 'newuser@example.com',
          password: 'ValidPass1!',
          full_name: 'John Doe'
        }

        expect(response).to have_http_status(201)
        expect(response.parsed_body['success']).to be true
      end

      it 'creates a new user' do
        expect {
          post '/api/v1/auth/signup', params: {
            email: 'newuser@example.com',
            password: 'ValidPass1!',
            full_name: 'John Doe'
          }
        }.to change(User, :count).by(1)
      end

      it 'returns verification-required payload' do
        post '/api/v1/auth/signup', params: {
          email: 'newuser@example.com',
          password: 'ValidPass1!',
          full_name: 'John Doe'
        }

        data = response.parsed_body['data']
        expect(data['verification_required']).to eq(true)
        expect(data['email']).to eq('newuser@example.com')
        expect(data['otp_expires_in_seconds']).to be_present
      end

      it 'creates user as inactive until otp verification' do
        post '/api/v1/auth/signup', params: {
          email: 'newuser@example.com',
          password: 'ValidPass1!',
          full_name: 'John Doe'
        }

        user = User.find_by(email: 'newuser@example.com')
        expect(user.status).to eq('inactive')
        expect(user.email_verified_at).to be_nil
        expect(user.otp_digest).to be_present
      end
    end

    context 'with validation errors' do
      context 'invalid email' do
        it 'returns 422 status' do
          post '/api/v1/auth/signup', params: {
            email: 'not-an-email',
            password: 'ValidPass1!',
            full_name: 'John Doe'
          }

          expect(response).to have_http_status(422)
          expect(response.parsed_body['success']).to be false
        end

        it 'returns validation error details' do
          post '/api/v1/auth/signup', params: {
            email: 'not-an-email',
            password: 'ValidPass1!',
            full_name: 'John Doe'
          }

          expect(response.parsed_body['error']['code']).to eq('VALIDATION_ERROR')
          expect(response.parsed_body['error']['details']).to be_present
        end
      end

      context 'duplicate email' do
        before { create(:user, email: 'existing@example.com', password: 'ValidPass1!') }

        it 'returns 422 status and validation error' do
          post '/api/v1/auth/signup', params: {
            email: 'existing@example.com',
            password: 'ValidPass1!',
            full_name: 'John Doe'
          }

          expect(response).to have_http_status(422)
          expect(response.parsed_body['error']['code']).to eq('VALIDATION_ERROR')
        end
      end

      context 'short password' do
        it 'returns 422 status for password too short' do
          post '/api/v1/auth/signup', params: {
            email: 'newuser@example.com',
            password: 'short',
            full_name: 'John Doe'
          }

          expect(response).to have_http_status(422)
          expect(response.parsed_body['error']['code']).to eq('VALIDATION_ERROR')
        end
      end

      context 'missing full_name' do
        it 'returns 422 status when full_name is blank' do
          post '/api/v1/auth/signup', params: {
            email: 'newuser@example.com',
            password: 'ValidPass1!',
            full_name: ''
          }

          expect(response).to have_http_status(422)
          expect(response.parsed_body['error']['code']).to eq('VALIDATION_ERROR')
        end
      end
    end

    context 'with missing parameters' do
      it 'returns 400 for missing email' do
        post '/api/v1/auth/signup', params: {
          password: 'ValidPass1!',
          full_name: 'John Doe'
        }

        expect(response).to have_http_status(400)
      end

      it 'returns 400 for missing password' do
        post '/api/v1/auth/signup', params: {
          email: 'newuser@example.com',
          full_name: 'John Doe'
        }

        expect(response).to have_http_status(400)
      end
    end
  end

  describe 'POST /api/v1/auth/verify-otp' do
    let!(:user) do
      create(:user, :unverified, email: 'verify@example.com', password: 'ValidPass1!').tap do |u|
        @otp = u.generate_signup_otp!
      end
    end

    it 'verifies otp and returns auth token' do
      post '/api/v1/auth/verify-otp', params: { email: user.email, otp: @otp }

      expect(response).to have_http_status(200)
      expect(response.parsed_body['success']).to be(true)
      expect(response.parsed_body.dig('data', 'token')).to be_present
      expect(user.reload.email_verified_at).to be_present
      expect(user.status).to eq('active')
    end

    it 'returns error for invalid otp' do
      post '/api/v1/auth/verify-otp', params: { email: user.email, otp: '000000' }

      expect(response).to have_http_status(422)
      expect(response.parsed_body.dig('error', 'code')).to eq('OTP_INVALID')
    end

    it 'returns error for expired otp' do
      user.update!(otp_expires_at: 1.minute.ago)

      post '/api/v1/auth/verify-otp', params: { email: user.email, otp: @otp }

      expect(response).to have_http_status(422)
      expect(response.parsed_body.dig('error', 'code')).to eq('OTP_EXPIRED')
    end
  end

  describe 'POST /api/v1/auth/resend-otp' do
    let!(:user) { create(:user, :unverified, email: 'resend@example.com') }

    before do
      user.generate_signup_otp!
      user.update!(otp_sent_at: 2.minutes.ago)
    end

    it 'resends otp successfully when allowed' do
      post '/api/v1/auth/resend-otp', params: { email: user.email }

      expect(response).to have_http_status(200)
      expect(response.parsed_body['success']).to be(true)
    end

    it 'enforces resend cooldown' do
      user.update!(otp_sent_at: Time.current)

      post '/api/v1/auth/resend-otp', params: { email: user.email }

      expect(response).to have_http_status(429)
      expect(response.parsed_body.dig('error', 'code')).to eq('OTP_RESEND_COOLDOWN')
    end
  end

  describe 'POST /api/v1/auth/forgot-password' do
    let!(:user) { create(:user, email: 'forgot@example.com') }

    it 'returns success for existing email and triggers reset flow' do
      post '/api/v1/auth/forgot-password', params: { email: user.email }

      expect(response).to have_http_status(200)
      expect(response.parsed_body['success']).to be(true)
      expect(user.reload.password_reset_token_digest).to be_present
    end

    it 'returns generic success for unknown email' do
      post '/api/v1/auth/forgot-password', params: { email: 'unknown@example.com' }

      expect(response).to have_http_status(200)
      expect(response.parsed_body['success']).to be(true)
    end
  end

  describe 'POST /api/v1/auth/reset-password' do
    let!(:user) { create(:user, email: 'reset@example.com', password: 'ValidPass1!') }
    let!(:token) { user.generate_password_reset_token! }

    it 'resets password with valid token' do
      post '/api/v1/auth/reset-password', params: {
        email: user.email,
        token: token,
        password: 'NewPass1!',
        password_confirmation: 'NewPass1!'
      }

      expect(response).to have_http_status(200)
      expect(response.parsed_body['success']).to be(true)
      expect(user.reload.authenticate('NewPass1!')).to be_truthy
    end

    it 'returns error for invalid token' do
      post '/api/v1/auth/reset-password', params: {
        email: user.email,
        token: 'invalid-token',
        password: 'NewPass1!',
        password_confirmation: 'NewPass1!'
      }

      expect(response).to have_http_status(422)
      expect(response.parsed_body.dig('error', 'code')).to eq('RESET_TOKEN_INVALID')
    end

    it 'returns validation error when password confirmation does not match' do
      post '/api/v1/auth/reset-password', params: {
        email: user.email,
        token: token,
        password: 'NewPass1!',
        password_confirmation: 'DifferentPass1!'
      }

      expect(response).to have_http_status(422)
      expect(response.parsed_body.dig('error', 'code')).to eq('VALIDATION_ERROR')
      expect(response.parsed_body.dig('error', 'message')).to include("Password confirmation doesn't match Password")
    end
  end

  describe 'POST /api/v1/auth/logout' do
    let(:user) { create(:user, email: 'test@example.com', password: 'ValidPass1!') }
    let(:token) { user.generate_token }

    it 'returns 200 status with success response' do
      post '/api/v1/auth/logout', headers: { 'Authorization' => "Bearer #{token}" }

      expect(response).to have_http_status(200)
      expect(response.parsed_body['success']).to be true
    end

    it 'revokes user sessions' do
      post '/api/v1/auth/logout', headers: { 'Authorization' => "Bearer #{token}" }

      expect(user.sessions.where('expires_at > ?', Time.current)).to be_empty
    end

    it 'returns 401 when not authenticated' do
      post '/api/v1/auth/logout'

      expect(response).to have_http_status(401)
    end
  end

  describe 'POST /api/v1/auth/refresh' do
    let(:user) { create(:user) }
    let(:token) { user.generate_token }

    it 'returns 200 status with new token' do
      post '/api/v1/auth/refresh', headers: { 'Authorization' => "Bearer #{token}" }

      expect(response).to have_http_status(200)
      expect(response.parsed_body['success']).to be true
      expect(response.parsed_body['data']).to have_key('token')
    end

    it 'generates a new token' do
      post '/api/v1/auth/refresh', headers: { 'Authorization' => "Bearer #{token}" }

      new_token = response.parsed_body['data']['token']
      expect(new_token).not_to eq(token)
    end

    it 'returns 401 when not authenticated' do
      post '/api/v1/auth/refresh'

      expect(response).to have_http_status(401)
    end
  end

  describe 'GET /api/v1/auth/:provider/authorize' do
    it 'maps google alias to google_oauth2 provider path' do
      get '/api/v1/auth/google/authorize'

      expect(response).to have_http_status(302)
      expect(response.location).to include('/api/v1/auth/google_oauth2')
    end

    it 'uses minimal Google auth scope in login mode (no calendar consent)' do
      get '/api/v1/auth/google/authorize'

      expect(response).to have_http_status(302)
      expect(response.location).to include('/api/v1/auth/google_oauth2')
      expect(response.location).to include('scope=openid+email+profile')
      expect(response.location).not_to include('calendar.events')
      expect(response.location).not_to include('prompt=consent')
    end

    it 'maps microsoft alias to microsoft_graph provider path' do
      get '/api/v1/auth/microsoft/authorize'

      expect(response).to have_http_status(302)
      expect(response).to redirect_to('/api/v1/auth/microsoft_graph')
    end

    it 'preserves origin and token query params for connection mode' do
      get '/api/v1/auth/google/authorize', params: { origin: 'onboarding', token: 'jwt_token_123' }

      expect(response).to have_http_status(302)
      expect(response.location).to include('/api/v1/auth/google_oauth2')
      expect(response.location).to include('origin=onboarding')
      expect(response.location).to include('token=jwt_token_123')
    end

    it 'requests offline calendar access with consent when refresh token is missing in connect mode' do
      user = create(:user, email: 'google-user@example.com')
      token = user.generate_token

      get '/api/v1/auth/google/authorize', params: { origin: 'onboarding', token: token, integration: 'google_meet' }

      expect(response).to have_http_status(302)
      expect(response.location).to include('scope=openid+email+profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events')
      expect(response.location).to include('access_type=offline')
      expect(response.location).to include('include_granted_scopes=true')
      expect(response.location).to include('login_hint=google-user%40example.com')
      expect(response.location).to include('prompt=consent')
    end

    it 'does not force consent when refresh token and calendar scope already exist' do
      user = create(:user, email: 'google-user2@example.com')
      token = user.generate_token
      create(:external_identity,
             user: user,
             provider: 'google_oauth2',
             uid: 'uid-google-user2',
             refresh_token: 'persisted_refresh_token',
             scopes: [ 'openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.events' ])

      get '/api/v1/auth/google/authorize', params: { origin: 'onboarding', token: token, integration: 'google_meet' }

      expect(response).to have_http_status(302)
      expect(response.location).to include('login_hint=google-user2%40example.com')
      expect(response.location).not_to include('prompt=consent')
    end

    it 'supports explicit account switching for google auth mode' do
      get '/api/v1/auth/google/authorize', params: { switch_account: '1' }

      expect(response).to have_http_status(302)
      expect(response.location).to include('prompt=select_account')
    end

    it 'supports direct provider name for backwards compatibility' do
      get '/api/v1/auth/google_oauth2/authorize'

      expect(response).to have_http_status(302)
      expect(response.location).to include('/api/v1/auth/google_oauth2')
    end

    it 'does not force Google consent prompt on every login' do
      get '/api/v1/auth/google/authorize'

      expect(response).to have_http_status(302)
      expect(response.location).not_to include('prompt=consent')
    end

    it 'returns bad_request for unsupported providers' do
      get '/api/v1/auth/unknown/authorize'

      expect(response).to have_http_status(400)
      expect(response.parsed_body['success']).to be(false)
      expect(response.parsed_body.dig('error', 'code')).to eq('UNSUPPORTED_OAUTH_PROVIDER')
    end

    it 'returns forbidden when slack is requested for authentication' do
      get '/api/v1/auth/slack/authorize'

      expect(response).to have_http_status(403)
      expect(response.parsed_body['success']).to be(false)
      expect(response.parsed_body.dig('error', 'code')).to eq('PROVIDER_AUTH_DISABLED')
    end

    it 'allows slack authorize in integration connect mode when token is provided' do
      user = create(:user)
      token = user.generate_token

      get '/api/v1/auth/slack/authorize', params: { token: token, integration: 'slack', origin: 'settings' }

      expect(response).to have_http_status(302)
      expect(response.location).to include('/api/v1/auth/slack')
      expect(response.location).to include('integration=slack')
      expect(response.location).to include('origin=settings')
    end
  end
end
