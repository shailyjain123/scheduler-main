require 'rails_helper'

RSpec.describe Integration::ConnectAccount do
  let(:user) { create(:user, email: 'user@example.com') }
  let(:provider) { 'google_oauth2' }
  let(:oauth_data) do
    OmniAuth::AuthHash.new({
      provider: provider,
      uid: '12345',
      info: { email: 'user@example.com', name: 'User Name' },
      credentials: { token: 'abc', refresh_token: 'def', expires_at: Time.now.to_i + 3600, scope: 'openid email profile calendar' }
    })
  end

  describe '.call' do
    context 'in Connection Mode (user logged in)' do
      it 'successfully links the account when emails match' do
        result = described_class.call(
          current_user: user,
          provider: provider,
          oauth_data: oauth_data,
          integration_key: 'google'
        )

        expect(result[:success]).to be true
        expect(user.external_identities.count).to eq(1)

        identity = user.external_identities.first
        expect(identity.provider).to eq(provider)
        expect(identity.uid).to eq('12345')
        expect(identity.provider_email).to eq('user@example.com')
        expect(user.reload.integrations['connected']).to include('google')
        expect(user.integrations['connected']).not_to include('google_meet')
      end

      it 'adds a second integration for the same provider without removing the first one' do
        first_result = described_class.call(
          current_user: user,
          provider: provider,
          oauth_data: oauth_data,
          integration_key: 'google'
        )

        expect(first_result[:success]).to be true

        second_result = described_class.call(
          current_user: user,
          provider: provider,
          oauth_data: oauth_data,
          integration_key: 'google_meet'
        )

        expect(second_result[:success]).to be true
        expect(user.reload.integrations['connected']).to include('google', 'google_meet')
      end

      it 'fails and raises error when emails do not match' do
        bad_oauth_data = oauth_data.dup
        bad_oauth_data.info.email = 'other@example.com'

        result = described_class.call(current_user: user, provider: provider, oauth_data: bad_oauth_data)

        expect(result[:success]).to be false
        expect(result[:error][:code]).to eq('SECURITY_ERROR')
        expect(result[:error][:message]).to include('You are logged in as user@example.com but attempted to connect other@example.com')
        expect(ExternalIdentity.count).to eq(0)
      end

      it 'fails when UID is already linked to another user' do
        other_user = create(:user, email: 'other@example.com')
        create(:external_identity, user: other_user, provider: provider, uid: '12345')

        result = described_class.call(current_user: user, provider: provider, oauth_data: oauth_data)

        expect(result[:success]).to be false
        expect(result[:error][:code]).to eq('SECURITY_ERROR')
        expect(result[:error][:message]).to eq('This external account is already linked to another user')
      end

      it 'updates an existing link if it belongs to the same user' do
        existing = create(:external_identity, user: user, provider: provider, uid: '12345', access_token: 'old')

        result = described_class.call(current_user: user, provider: provider, oauth_data: oauth_data)

        expect(result[:success]).to be true
        expect(existing.reload.access_token).to eq('abc')
      end

      it 'keeps existing refresh_token when provider omits it on reconnect' do
        existing = create(:external_identity,
                          user: user,
                          provider: provider,
                          uid: '12345',
                          refresh_token: 'persisted_refresh_token')

        oauth_data.credentials.refresh_token = nil

        result = described_class.call(current_user: user, provider: provider, oauth_data: oauth_data)

        expect(result[:success]).to be true
        expect(existing.reload.refresh_token).to eq('persisted_refresh_token')
      end
    end

    context 'security checks' do
      it 'fails if current_user is missing' do
        result = described_class.call(current_user: nil, provider: provider, oauth_data: oauth_data)
        expect(result[:success]).to be false
        expect(result[:error][:message]).to eq('Must be logged in before connecting integration')
      end
    end
  end
end
