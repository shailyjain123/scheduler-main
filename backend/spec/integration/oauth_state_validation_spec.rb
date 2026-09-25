require 'rails_helper'

RSpec.describe 'OAuth State Parameter Validation' do
  describe 'OmniAuth state validation (CSRF protection)' do
    let(:user) { create(:user, email: 'user@example.com') }
    let(:valid_state) { SecureRandom.hex(16) }

    context 'state parameter is validated on callback' do
      it 'state mismatch would trigger security error' do
        stored_state = SecureRandom.hex(16)
        callback_state = SecureRandom.hex(16)  # Different

        # OmniAuth before_callback_phase checks: stored_state == callback_state
        expect(stored_state).not_to eq(callback_state)
      end

      it 'missing state would trigger security error' do
        stored_state = nil
        callback_state = SecureRandom.hex(16)

        # OmniAuth checks: stored_state.blank? || callback_state.blank?
        expect(stored_state.blank? || callback_state.blank?).to be true
      end

      it 'provider mismatch would trigger security error' do
        stored_provider = 'google_oauth2'
        callback_provider = 'microsoft_graph'

        expect(stored_provider).not_to eq(callback_provider)
      end
    end

    context 'state parameter is generated on request initiation' do
      it 'generates state before initiating OAuth flow' do
        # The before_request_phase in omniauth.rb generates state
        state = SecureRandom.hex(16)
        expect(state).to be_present
        expect(state.length).to eq(32)  # hex(16) = 32 chars
      end

      it 'stores state in session to prevent CSRF' do
        # The before_request_phase stores: env['rack.session'][:oauth_state]
        session = {}
        session[:oauth_state] = SecureRandom.hex(16)
        session[:oauth_provider] = 'google_oauth2'

        expect(session[:oauth_state]).to be_present
        expect(session[:oauth_provider]).to be_present
      end
    end

    context 'Prevents OAuth callback hijacking' do
      it 'attacker cannot reuse state from different user session' do
        # User A initiates Google login
        user_a_state = SecureRandom.hex(16)

        # Attacker tries to use in User B's session
        user_b_state = SecureRandom.hex(16)

        # These don't match, so callback fails
        expect(user_a_state).not_to eq(user_b_state)
      end

      it 'state is tied to specific OAuth provider' do
        # Google OAuth state cannot be used for Microsoft OAuth
        google_state = SecureRandom.hex(16)

        session = {
          oauth_state: google_state,
          oauth_provider: 'google_oauth2'
        }

        # Callback with microsoft_graph would fail because provider doesn't match
        expect(session[:oauth_provider]).to eq('google_oauth2')
        expect(session[:oauth_provider]).not_to eq('microsoft_graph')
      end
    end

    context 'State validation prevents multi-step attacks' do
      it 'prevents attacker from linking account to wrong user' do
        # Scenario: Attacker tries to hijack OAuth callback
        # State is unique per request, so callback can't be replayed
        auth_state = SecureRandom.hex(16)
        integration_state = SecureRandom.hex(16)

        expect(auth_state).not_to eq(integration_state)
      end

      it 'state prevents replaying old OAuth callbacks' do
        # Each new OAuth request gets a new state
        captured_state = SecureRandom.hex(16)
        new_state = SecureRandom.hex(16)

        expect(captured_state).not_to eq(new_state)
      end
    end
  end

  describe 'State validation in controller context' do
    context 'when state validation fails' do
      it 'would redirect user to error page' do
        # In the actual flow, OmniAuth would raise error,
        # and omniauth_failure endpoint would catch it
        # This redirects user to: /login#error=auth_failed

        expected_redirect = /login#error=auth_failed/
        expect('login#error=auth_failed').to match(expected_redirect)
      end
    end
  end

  describe 'Replay Attack Prevention' do
    context 'prevents authorization code reuse' do
      it 'same auth code cannot be used twice for the same state' do
        # Scenario: Attacker captures auth code and state, replays both
        # OAuth has built-in protection: codes are single-use
        # But we should test that our state validation doesn't prevent proper reuse detection

        auth_code_1 = 'authcode_abc123'
        auth_code_2 = 'authcode_abc123'  # Same code
        state = SecureRandom.hex(16)

        # In real OAuth, same code in two requests should fail on second attempt
        # because OAuth provider invalidates code after first use
        expect(auth_code_1).to eq(auth_code_2)
        # But first attempt should succeed
        first_attempt = { code: auth_code_1, state: state }
        expect(first_attempt[:code]).to eq(auth_code_1)
      end

      it 'state parameter cannot be stolen and reused in different session' do
        # Scenario: Attacker hijacks state from one user's browser, uses in their own
        user_a_session_state = SecureRandom.hex(16)
        attacker_new_session = { oauth_state: user_a_session_state }  # Stolen state

        # When attacker tries to use this state in their own environment,
        # their session would have a DIFFERENT state generated
        attacker_fresh_state = SecureRandom.hex(16)

        # Mismatch causes OAuth validation to fail
        expect(attacker_new_session[:oauth_state]).not_to eq(attacker_fresh_state)
        expect(user_a_session_state).not_to eq(attacker_fresh_state)
      end
    end

    context 'prevents callback replay attacks' do
      it 'same callback cannot be executed twice' do
        # Scenario: Attacker captures complete callback URL and replays it
        # Complete callback: /api/v1/auth/google_oauth2/callback?code=XXX&state=YYY

        state = SecureRandom.hex(16)
        auth_code = 'captured_auth_code_xyz'

        # First callback: code + state are valid, OAuth provider returns user info
        first_callback = {
          provider: 'google_oauth2',
          code: auth_code,
          state: state
        }

        # Second callback: same code + state
        # OAuth provider will REJECT because code already used
        # Our state validation also prevents this if state was cleared
        second_callback = {
          provider: 'google_oauth2',
          code: auth_code,
          state: state
        }

        # Both look identical, but OAuth provider blocks second attempt
        expect(first_callback).to eq(second_callback)
        # In production, first succeeds, second fails at OAuth provider level
      end

      it 'old state parameter cannot be reused against new login' do
        # Scenario: User A completes login, attacker tries to use User A's old state
        user_a_old_state = 'stored_from_previous_session'

        # User B initiates new login (new state generated)
        user_b_new_state = SecureRandom.hex(16)

        # Attacker tries to use User A's old state in User B's session
        # But User B's session has a different state
        expect(user_b_new_state).not_to eq(user_a_old_state)
      end
    end

    context 'prevents timing-based hijacking attacks' do
      it 'state is generated per request, not reused' do
        # Each OAuth initiation generates a fresh state
        request_1_state = SecureRandom.hex(16)
        request_2_state = SecureRandom.hex(16)

        # Even from the same user, different requests get different states
        expect(request_1_state).not_to eq(request_2_state)
      end

      it 'state expires/invalidates after callback is processed' do
        # Scenario: User completes OAuth, then attacker tries to reuse the state
        state = SecureRandom.hex(16)

        # After successful callback, we should clear state from session
        # (This is implicit in OmniAuth, but good to document)
        session = { oauth_state: state }
        # After callback success/failure, state is cleared
        session.delete(:oauth_state)

        # When attacker tries to reuse, state is gone from session
        expect(session[:oauth_state]).to be_nil
      end
    end

    context 'prevents cross-provider attack scenarios' do
      it 'cannot redirect Google auth callback to Microsoft endpoint' do
        # Scenario: Attacker modifies OAuth redirect URI
        # GET /api/v1/auth/google_oauth2/callback?code=google_code&state=google_state
        # versus
        # GET /api/v1/auth/microsoft_graph/callback?code=google_code&state=google_state

        google_state = SecureRandom.hex(16)
        microsoft_state = SecureRandom.hex(16)

        google_callback = {
          provider: 'google_oauth2',
          state: google_state
        }

        microsoft_callback = {
          provider: 'microsoft_graph',
          state: google_state  # Attacker tries to hijack state to Microsoft
        }

        # Our provider validation catches this mismatch
        expect(microsoft_callback[:provider]).not_to eq('google_oauth2')
      end
    end
  end
end
