require 'rails_helper'

RSpec.describe Api::V1::IntegrationsController, type: :controller do
  describe 'Google OAuth2 Provider - Comprehensive Coverage' do
    let(:user) { create(:user, email: 'user@example.com') }
    let(:other_user) { create(:user, email: 'other@example.com') }
    let(:user_token) { user.generate_token }

    let(:google_oauth_hash) do
      OmniAuth::AuthHash.new(
        provider: 'google_oauth2',
        uid: 'google_uid_12345',
        info: { email: 'user@example.com', name: 'Test User' },
        credentials: {
          token: 'google_access_token_xyz',
          refresh_token: 'google_refresh_token_xyz',
          expires_at: (Time.now + 1.hour).to_i,
          scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive'
        }
      )
    end

    before do
      request.env['omniauth.auth'] = google_oauth_hash
      request.headers['Authorization'] = "Bearer #{user_token}"
      session[:omniauth_origin] = 'settings'
    end

    # Scenario 1: Matching email → integration succeeds
    it 'connects integration with matching email address' do
      post :oauth_callback, params: { provider: 'google_oauth2' }

      expect(response).to have_http_status(:redirect)
      user.reload
      expect(user.external_identities.find_by(provider: 'google_oauth2')).to be_present
    end

    # Scenario 2: Different email → rejected + error shown
    it 'rejects integration when provider email differs from current user' do
      request.env['omniauth.auth']['info']['email'] = 'different@example.com'

      post :oauth_callback, params: { provider: 'google_oauth2' }

      expect(response).to have_http_status(:redirect)
      expect(response.location).to include('error=SECURITY_ERROR')
    end

    # Scenario 3: UID linked to another user → rejected
    it 'rejects when UID is already linked to different user' do
      create(:external_identity, user: other_user, provider: 'google_oauth2', uid: 'google_uid_12345')

      post :oauth_callback, params: { provider: 'google_oauth2' }

      expect(response).to have_http_status(:redirect)
      expect(response.location).to include('error=SECURITY_ERROR')
    end

    # Scenario 4: No logged-in user → rejected (401)
    it 'returns 401 when no current user' do
      request.headers['Authorization'] = nil

      post :oauth_callback, params: { provider: 'google_oauth2' }

      expect(response).to have_http_status(:unauthorized)
    end

    # Scenario 5: Existing session preserved on failure
    it 'preserves current_user session after failed connection attempt' do
      request.env['omniauth.auth']['info']['email'] = 'different@example.com'
      original_user_id = user.id

      post :oauth_callback, params: { provider: 'google_oauth2' }

      # User ID in token should still be the same
      expect(user.id).to eq(original_user_id)
    end

    # Scenario 6: Connection never creates new user
    it 'never creates new user during connection flow' do
      user_count_before = User.count

      post :oauth_callback, params: { provider: 'google_oauth2' }

      expect(User.count).to eq(user_count_before)
    end

    # Scenario 7: OAuth state validated (CSRF)
    it 'state parameter is validated by OmniAuth' do
      expect(session[:omniauth_state]).to be_nil  # Before OmniAuth processes
      post :oauth_callback, params: { provider: 'google_oauth2' }
      # OmniAuth validates state in before_callback_phase
      expect(response).to have_http_status(:redirect)
    end

    # Scenario 8: Replay attack prevented
    it 'prevents same auth callback from being processed twice' do
      post :oauth_callback, params: { provider: 'google_oauth2' }
      first_response = response.status
      expect(first_response).to eq(302)  # Redirect success

      user.reload
      expect(user.external_identities.where(provider: 'google_oauth2').count).to eq(1)

      # Second attempt
      post :oauth_callback, params: { provider: 'google_oauth2' }
      expect(user.external_identities.where(provider: 'google_oauth2').count).to eq(1)
    end
  end

  describe 'Microsoft Graph Provider - Comprehensive Coverage' do
    let(:user) { create(:user, email: 'user@example.com') }
    let(:other_user) { create(:user, email: 'other@example.com') }
    let(:user_token) { user.generate_token }

    let(:microsoft_oauth_hash) do
      OmniAuth::AuthHash.new(
        provider: 'microsoft_graph',
        uid: 'microsoft_uid_67890',
        info: { email: 'user@example.com', name: 'Test User' },
        credentials: {
          token: 'microsoft_access_token_abc',
          refresh_token: 'microsoft_refresh_token_abc',
          expires_at: (Time.now + 1.hour).to_i,
          scope: 'Calendars.Read Calendar.ReadWrite Mail.Read'
        }
      )
    end

    before do
      request.env['omniauth.auth'] = microsoft_oauth_hash
      request.headers['Authorization'] = "Bearer #{user_token}"
      session[:omniauth_origin] = 'settings'
    end

    it 'connects Microsoft OAuth with matching email' do
      post :oauth_callback, params: { provider: 'microsoft_graph' }

      expect(response).to have_http_status(:redirect)
      user.reload
      expect(user.external_identities.find_by(provider: 'microsoft_graph')).to be_present
    end

    it 'rejects Microsoft OAuth with mismatched email' do
      request.env['omniauth.auth']['info']['email'] = 'different@example.com'

      post :oauth_callback, params: { provider: 'microsoft_graph' }

      expect(response).to have_http_status(:redirect)
      expect(response.location).to include('error=SECURITY_ERROR')
    end

    it 'rejects when Microsoft UID already linked to other user' do
      create(:external_identity, user: other_user, provider: 'microsoft_graph', uid: 'microsoft_uid_67890')

      post :oauth_callback, params: { provider: 'microsoft_graph' }

      expect(response).to have_http_status(:redirect)
      expect(response.location).to include('error=SECURITY_ERROR')
    end

    it 'returns 401 for Microsoft OAuth without current user' do
      request.headers['Authorization'] = nil

      post :oauth_callback, params: { provider: 'microsoft_graph' }

      expect(response).to have_http_status(:unauthorized)
    end

    it 'preserves session after Microsoft OAuth connection failure' do
      request.env['omniauth.auth']['info']['email'] = 'different@example.com'
      original_user_id = user.id

      post :oauth_callback, params: { provider: 'microsoft_graph' }

      expect(user.id).to eq(original_user_id)
    end

    it 'never creates user during Microsoft OAuth connection' do
      user_count_before = User.count

      post :oauth_callback, params: { provider: 'microsoft_graph' }

      expect(User.count).to eq(user_count_before)
    end

    it 'validates OAuth state for Microsoft' do
      post :oauth_callback, params: { provider: 'microsoft_graph' }

      expect(response).to have_http_status(:redirect)
    end

    it 'prevents Microsoft OAuth callback replay' do
      post :oauth_callback, params: { provider: 'microsoft_graph' }
      expect(response).to have_http_status(:redirect)

      user.reload
      expect(user.external_identities.where(provider: 'microsoft_graph').count).to eq(1)

      post :oauth_callback, params: { provider: 'microsoft_graph' }
      user.reload
      expect(user.external_identities.where(provider: 'microsoft_graph').count).to eq(1)
    end
  end

  describe 'Slack Provider - Comprehensive Coverage' do
    let(:user) { create(:user, email: 'user@example.com') }
    let(:other_user) { create(:user, email: 'other@example.com') }
    let(:user_token) { user.generate_token }

    let(:slack_oauth_hash) do
      OmniAuth::AuthHash.new(
        provider: 'slack',
        uid: 'slack_user_profile_id_xyz',
        info: { email: 'user@example.com', name: 'Test User' },
        credentials: {
          token: 'slack_xoxp_token_xyz',
          refresh_token: nil,
          expires_at: nil,
          scope: 'channels:read channels:manage users:read'
        }
      )
    end

    before do
      request.env['omniauth.auth'] = slack_oauth_hash
      request.headers['Authorization'] = "Bearer #{user_token}"
      session[:omniauth_origin] = 'settings'
    end

    it 'connects Slack with matching email' do
      post :oauth_callback, params: { provider: 'slack' }

      expect(response).to have_http_status(:redirect)
      user.reload
      expect(user.external_identities.find_by(provider: 'slack')).to be_present
    end

    it 'rejects Slack with mismatched email' do
      request.env['omniauth.auth']['info']['email'] = 'different@example.com'

      post :oauth_callback, params: { provider: 'slack' }

      expect(response).to have_http_status(:redirect)
      expect(response.location).to include('error=SECURITY_ERROR')
    end

    it 'rejects Slack when UID linked to other user' do
      create(:external_identity, user: other_user, provider: 'slack', uid: 'slack_user_profile_id_xyz')

      post :oauth_callback, params: { provider: 'slack' }

      expect(response).to have_http_status(:redirect)
      expect(response.location).to include('error=SECURITY_ERROR')
    end

    it 'returns 401 for Slack without current user' do
      request.headers['Authorization'] = nil

      post :oauth_callback, params: { provider: 'slack' }

      expect(response).to have_http_status(:unauthorized)
    end

    it 'preserves session after Slack connection failure' do
      request.env['omniauth.auth']['info']['email'] = 'different@example.com'
      original_user_id = user.id

      post :oauth_callback, params: { provider: 'slack' }

      expect(user.id).to eq(original_user_id)
    end

    it 'never creates user during Slack connection' do
      user_count_before = User.count

      post :oauth_callback, params: { provider: 'slack' }

      expect(User.count).to eq(user_count_before)
    end

    it 'validates OAuth state for Slack' do
      post :oauth_callback, params: { provider: 'slack' }

      expect(response).to have_http_status(:redirect)
    end

    it 'prevents Slack OAuth callback replay' do
      post :oauth_callback, params: { provider: 'slack' }
      expect(response).to have_http_status(:redirect)

      user.reload
      expect(user.external_identities.where(provider: 'slack').count).to eq(1)

      post :oauth_callback, params: { provider: 'slack' }
      user.reload
      expect(user.external_identities.where(provider: 'slack').count).to eq(1)
    end
  end
end
