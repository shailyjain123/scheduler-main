require 'rails_helper'

RSpec.describe Api::V1::IntegrationsController, type: :controller do
  describe 'POST #oauth_callback - Connection Mode Only' do
    let(:user) { create(:user, email: 'user@example.com') }
    let(:user_token) { user.generate_token }
    let(:oauth_hash) do
      OmniAuth::AuthHash.new({
        provider: 'google_oauth2',
        uid: 'google_user_123',
        info: {
          email: 'user@example.com',  # Same email as logged-in user
          name: 'User Name'
        },
        credentials: {
          token: 'access_token_123',
          refresh_token: 'refresh_token_456',
          expires_at: (Time.now + 3600).to_i,
          scope: 'openid email profile calendar'
        }
      })
    end

    before do
      request.env['omniauth.auth'] = oauth_hash
      # Properly authenticate by setting Authorization header (as Api::BaseController expects)
      request.headers['Authorization'] = "Bearer #{user_token}"
    end

    context 'CRITICAL SECURITY: Integration endpoint requires current_user' do
      it 'rejects callback without current_user' do
        # Remove Authorization header to simulate unauthenticated request
        request.headers['Authorization'] = nil

        post :oauth_callback, params: { provider: 'google_oauth2' }

        expect(response).to have_http_status(:unauthorized)
        body = JSON.parse(response.body)
        expect(body['error']['code']).to eq('UNAUTHORIZED')
      end
    end

    context 'when emails match (normal flow)' do
      it 'successfully links the integration' do
        post :oauth_callback, params: { provider: 'google_oauth2' }

        user.reload
        expect(user.external_identities.count).to eq(1)
        identity = user.external_identities.first
        expect(identity.provider).to eq('google_oauth2')
        expect(identity.uid).to eq('google_user_123')
      end

      it 'redirects with success' do
        post :oauth_callback, params: { provider: 'google_oauth2' }

        expect(response).to redirect_to(/success=google_oauth2/)
      end
    end

    context 'CRITICAL SECURITY: Email mismatch prevents linking' do
      before do
        oauth_hash.info.email = 'different@example.com'
      end

      it 'rejects integration with different email' do
        post :oauth_callback, params: { provider: 'google_oauth2' }

        # Should not create identity
        expect(user.external_identities.count).to eq(0)
      end

      it 'shows error message about email mismatch' do
        post :oauth_callback, params: { provider: 'google_oauth2' }

        expect(response).to redirect_to(/error=/)
      end
    end

    context 'CRITICAL SECURITY: UID linked to another user is rejected' do
      let(:other_user) { create(:user, email: 'other@example.com') }

      before do
        create(:external_identity,
               user: other_user,
               provider: 'google_oauth2',
               uid: 'google_user_123')
      end

      it 'rejects the link attempt' do
        post :oauth_callback, params: { provider: 'google_oauth2' }

        # user should still have no identities
        expect(user.external_identities.count).to eq(0)
      end

      it 'shows security error' do
        post :oauth_callback, params: { provider: 'google_oauth2' }

        expect(response).to redirect_to(/error=SECURITY_ERROR/)
      end
    end

    context 'CRITICAL SECURITY: Does NOT create new user' do
      before do
        # Even though oauth has different email, it should never create new user
        oauth_hash.info.email = 'newuser@example.com'
      end

      it 'does not create a new user' do
        initial_count = User.count

        post :oauth_callback, params: { provider: 'google_oauth2' }

        expect(User.count).to eq(initial_count)
      end
    end

    context 'CRITICAL SECURITY: Does NOT change session' do
      it 'maintains current_user throughout callback' do
        post :oauth_callback, params: { provider: 'google_oauth2' }

        # current_user should remain the same
        expect(controller.current_user.id).to eq(user.id)
      end
    end

    context 'origin parameter handling' do
      it 'uses origin=onboarding to redirect to onboarding integrations' do
        session[:omniauth_origin] = 'onboarding'

        post :oauth_callback, params: { provider: 'google_oauth2' }

        expect(response).to redirect_to(/\/onboarding\/integrations#success=/)
      end

      it 'defaults to onboarding integrations path when origin not provided' do
        post :oauth_callback, params: { provider: 'google_oauth2' }

        expect(response).to redirect_to(/\/onboarding\/integrations#success=/)
      end
    end
  end

  describe 'Separation of Auth and Connect Flows' do
    let(:user) { create(:user, email: 'user@example.com') }
    let(:user_token) { user.generate_token }

    before do
      request.headers['Authorization'] = "Bearer #{user_token}"
    end

    context 'integrations#oauth_callback requires current_user' do
      it 'is guarded by authenticate_user! before_action' do
        # Remove auth header to simulate unauthenticated request
        request.headers['Authorization'] = nil

        post :oauth_callback, params: { provider: 'google_oauth2' }

        # Should fail with 401, not create user or fall back to auth
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'auth#omniauth_callback ignores current_user' do
      # Tested in auth_oauth_integration_spec.rb
      # Key point: Auth endpoint should NEVER check current_user
    end
  end

  describe 'DELETE #destroy' do
    let(:user) { create(:user, email: 'user@example.com') }
    let(:user_token) { user.generate_token }

    before do
      request.headers['Authorization'] = "Bearer #{user_token}"
      user.update!(integrations: { 'connected' => [ 'google', 'google_meet', 'outlook', 'teams', 'slack' ] })
    end

    it 'removes only google when disconnecting google' do
      delete :destroy, params: { provider: 'google' }

      expect(response).to have_http_status(:ok)
      user.reload
      expect(user.integrations['connected']).not_to include('google')
      expect(user.integrations['connected']).to include('google_meet', 'outlook', 'teams', 'slack')
    end

    it 'removes only teams when disconnecting teams alias' do
      delete :destroy, params: { provider: 'teams' }

      expect(response).to have_http_status(:ok)
      user.reload
      expect(user.integrations['connected']).not_to include('teams')
      expect(user.integrations['connected']).to include('google', 'google_meet', 'outlook', 'slack')
    end
  end
end
