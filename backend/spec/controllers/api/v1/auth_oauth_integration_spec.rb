require 'rails_helper'

RSpec.describe Api::V1::AuthController, type: :controller do
  describe 'POST #omniauth_callback - Authentication Mode Only' do
    let(:oauth_hash) do
      OmniAuth::AuthHash.new({
        provider: 'google_oauth2',
        uid: 'google_user_123',
        info: {
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.png'
        },
        credentials: {
          token: 'access_token_123',
          refresh_token: 'refresh_token_456',
          expires_at: (Time.now + 3600).to_i,
          scope: 'openid email profile'  # Space-separated scopes from Google
        }
      })
    end

    before do
      request.env['omniauth.auth'] = oauth_hash
    end

    context 'when user does not exist (signup flow)' do
      it 'creates a new user and redirects to callback with token' do
        get :omniauth_callback, params: { provider: 'google_oauth2' }

        expect(User.find_by(email: 'test@example.com')).to be_present
        expect(response).to redirect_to(/callback#token=/)
      end

      it 'creates an external identity for the new user' do
        get :omniauth_callback, params: { provider: 'google_oauth2' }

        user = User.find_by(email: 'test@example.com')
        expect(user.external_identities.count).to eq(1)
        expect(user.external_identities.first.provider).to eq('google_oauth2')
      end

      it 'stores avatar url from oauth profile' do
        get :omniauth_callback, params: { provider: 'google_oauth2' }

        user = User.find_by(email: 'test@example.com')
        expect(user.avatar_url).to eq('https://example.com/avatar.png')
      end

      it 'marks google calendar as connected after Google SSO' do
        get :omniauth_callback, params: { provider: 'google_oauth2' }

        user = User.find_by(email: 'test@example.com')
        expect(user.integrations['connected']).to include('google')
      end

      it 'marks google meet as connected when calendar scope is granted' do
        oauth_hash.credentials.scope = 'openid email profile https://www.googleapis.com/auth/calendar'

        get :omniauth_callback, params: { provider: 'google_oauth2' }

        user = User.find_by(email: 'test@example.com')
        expect(user.integrations['connected']).to include('google', 'google_meet')
      end
    end

    context 'when user already exists (login flow)' do
      let!(:existing_user) { create(:user, email: 'test@example.com', integrations: { 'connected' => [ 'google', 'google_meet' ] }) }

      it 'signs in the existing user' do
        get :omniauth_callback, params: { provider: 'google_oauth2' }

        expect(response).to redirect_to(/callback#token=/)
      end

      it 'creates external identity for existing user' do
        get :omniauth_callback, params: { provider: 'google_oauth2' }

        user = User.find_by(email: 'test@example.com')
        expect(user.external_identities.count).to eq(1)
      end

      it 'updates avatar url from oauth profile' do
        get :omniauth_callback, params: { provider: 'google_oauth2' }

        expect(existing_user.reload.avatar_url).to eq('https://example.com/avatar.png')
      end

      it 'removes google_meet when calendar scope is missing' do
        oauth_hash.credentials.scope = 'openid email profile'

        get :omniauth_callback, params: { provider: 'google_oauth2' }

        connected = existing_user.reload.integrations['connected']
        expect(connected).to include('google')
        expect(connected).not_to include('google_meet')
      end

      it 'preserves existing refresh token when provider does not return a new one' do
        create(:external_identity,
               user: existing_user,
               provider: 'google_oauth2',
               uid: 'google_user_123',
               refresh_token: 'persisted_refresh_token')

        oauth_hash.credentials.refresh_token = nil

        get :omniauth_callback, params: { provider: 'google_oauth2' }

        identity = existing_user.reload.external_identities.find_by(provider: 'google_oauth2')
        expect(identity.refresh_token).to eq('persisted_refresh_token')
      end
    end

    context 'CRITICAL SECURITY: Auth endpoint must NEVER use current_user' do
      let!(:logged_in_user) { create(:user, email: 'logged_in@example.com') }

      before do
        # Simulate a logged-in user trying to auth with a different email
        allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(logged_in_user)
      end

      it 'creates a NEW user (ignores current_user for auth)' do
        get :omniauth_callback, params: { provider: 'google_oauth2' }

        # Should create NEW user with oauth email, not link to current_user
        oauth_user = User.find_by(email: 'test@example.com')
        expect(oauth_user).to be_present
        expect(oauth_user.id).not_to eq(logged_in_user.id)
      end
    end

    context 'on auth failure' do
      it 'redirects to login error page when auth fails' do
        # Simulate failed OAuth by making AuthService.from_omniauth return error
        allow(AuthService).to receive(:from_omniauth).and_return({
          success: false,
          error: { code: 'AUTH_ERROR', message: 'Auth failed' }
        })

        get :omniauth_callback, params: { provider: 'google_oauth2' }

        expect(response).to redirect_to(/login#error=/)
      end
    end

    context 'when provider is slack in authentication mode' do
      let(:slack_oauth_hash) do
        OmniAuth::AuthHash.new({
          provider: 'slack',
          uid: 'slack_user_123',
          info: {
            email: 'slack-user@example.com',
            name: 'Slack User'
          },
          credentials: {
            token: 'slack_token_123'
          }
        })
      end

      before do
        request.env['omniauth.auth'] = slack_oauth_hash
      end

      it 'redirects to login with PROVIDER_AUTH_DISABLED and does not call AuthService.from_omniauth' do
        expect(AuthService).not_to receive(:from_omniauth)

        get :omniauth_callback, params: { provider: 'slack' }

        expect(response).to redirect_to(/login#error=PROVIDER_AUTH_DISABLED/)
      end
    end
  end

  describe 'GET #omniauth_failure' do
    it 'redirects to login with error' do
      get :omniauth_failure

      expect(response).to redirect_to(/login#error=auth_failed/)
    end
  end
end
