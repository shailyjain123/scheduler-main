require 'rails_helper'

RSpec.describe AuthService, type: :service do
  describe '#authenticate' do
    context 'with valid credentials' do
      let(:user) { create(:user, email: 'test@example.com', password: 'ValidPass1!') }

      it 'returns success response with token and user' do
        user  # Force evaluation of the let variable to create the user
        service = AuthService.new(email: 'test@example.com', password: 'ValidPass1!')
        result = service.authenticate

        expect(result[:success]).to be true
        expect(result[:data]).to have_key(:token)
        expect(result[:data][:user]).to be_present
        expect(result[:data][:user][:email]).to eq('test@example.com')
      end

      it 'generates a valid JWT token' do
        user  # Force evaluation of the let variable to create the user
        service = AuthService.new(email: 'test@example.com', password: 'ValidPass1!')
        result = service.authenticate
        token = result[:data][:token]

        payload = JWT.decode(token, Rails.application.config.secret_key_base).first
        expect(payload['email']).to eq('test@example.com')
      end

      it 'creates a session record' do
        user  # Force evaluation of the let variable to create the user
        service = AuthService.new(email: 'test@example.com', password: 'ValidPass1!')
        expect { service.authenticate }.to change(user.sessions, :count).by(1)
      end
    end

    context 'with invalid email' do
      it 'returns error response for non-existent email' do
        service = AuthService.new(email: 'nonexistent@example.com', password: 'any_password')
        result = service.authenticate

        expect(result[:success]).to be false
        expect(result[:error][:code]).to eq('INVALID_CREDENTIALS')
        expect(result[:error][:message]).to eq('Email or password is incorrect')
      end
    end

    context 'with invalid password' do
      before { create(:user, email: 'test@example.com', password: 'ValidPass1!') }

      it 'returns error response for wrong password' do
        service = AuthService.new(email: 'test@example.com', password: 'WrongPassword')
        result = service.authenticate

        expect(result[:success]).to be false
        expect(result[:error][:code]).to eq('INVALID_CREDENTIALS')
        expect(result[:error][:message]).to eq('Email or password is incorrect')
      end
    end

    context 'with inactive user' do
      before { create(:user, :unverified, email: 'test@example.com', password: 'ValidPass1!') }

      it 'returns error for inactive users' do
        service = AuthService.new(email: 'test@example.com', password: 'ValidPass1!')
        result = service.authenticate

        expect(result[:success]).to be false
        expect(result[:error][:code]).to eq('EMAIL_NOT_VERIFIED')
      end
    end

    context 'email case-insensitive' do
      before { create(:user, email: 'Test@Example.com', password: 'ValidPass1!') }

      it 'authenticates with different case' do
        service = AuthService.new(email: 'test@example.com', password: 'ValidPass1!')
        result = service.authenticate

        expect(result[:success]).to be true
      end
    end
  end

  describe '#register' do
    before { ActionMailer::Base.deliveries.clear }

    context 'with valid data' do
      it 'creates a new user' do
        service = AuthService.new(email: 'newuser@example.com', password: 'ValidPass1!')
        expect { service.register(full_name: 'John Doe') }.to change(User, :count).by(1)
      end

      it 'returns success response with verification requirement' do
        service = AuthService.new(email: 'newuser@example.com', password: 'ValidPass1!')
        result = service.register(full_name: 'John Doe')

        expect(result[:success]).to be true
        expect(result[:data][:verification_required]).to be true
        expect(result[:data][:email]).to eq('newuser@example.com')
      end

      it 'creates an inactive unverified user' do
        service = AuthService.new(email: 'newuser@example.com', password: 'ValidPass1!')
        service.register(full_name: 'John Doe')

        user = User.find_by(email: 'newuser@example.com')
        expect(user.status).to eq('inactive')
        expect(user.email_verified_at).to be_nil
        expect(user.otp_digest).to be_present
      end

      it 'sends otp email' do
        service = AuthService.new(email: 'newuser@example.com', password: 'ValidPass1!')

        expect { service.register(full_name: 'John Doe') }.to change { ActionMailer::Base.deliveries.count }.by(1)
      end
    end

    context 'with invalid email' do
      it 'returns validation error for invalid email format' do
        service = AuthService.new(email: 'not-an-email', password: 'ValidPass1!')
        result = service.register(full_name: 'John Doe')

        expect(result[:success]).to be false
        expect(result[:error][:code]).to eq('VALIDATION_ERROR')
        expect(result[:error][:details]).to be_present
      end
    end

    context 'with duplicate email' do
      before { create(:user, email: 'existing@example.com', password: 'ValidPass1!') }

      it 'returns validation error for duplicate email' do
        service = AuthService.new(email: 'existing@example.com', password: 'ValidPass1!')
        result = service.register(full_name: 'John Doe')

        expect(result[:success]).to be false
        expect(result[:error][:code]).to eq('VALIDATION_ERROR')
        expect(result[:error][:details]).to be_present
      end
    end

    context 'with short password' do
      it 'returns validation error for password too short' do
        service = AuthService.new(email: 'newuser@example.com', password: 'short')
        result = service.register(full_name: 'John Doe')

        expect(result[:success]).to be false
        expect(result[:error][:code]).to eq('VALIDATION_ERROR')
      end
    end

    context 'with missing full_name' do
      it 'returns validation error when full_name is blank' do
        service = AuthService.new(email: 'newuser@example.com', password: 'ValidPass1!')
        result = service.register(full_name: '')

        expect(result[:success]).to be false
        expect(result[:error][:code]).to eq('VALIDATION_ERROR')
      end
    end

    context 'email case-insensitive' do
      it 'stores email in lowercase' do
        service = AuthService.new(email: 'NewUser@EXAMPLE.COM', password: 'ValidPass1!')
        service.register(full_name: 'John Doe')

        user = User.find_by(email: 'newuser@example.com')
        expect(user.email).to eq('newuser@example.com')
      end
    end
  end

  describe '#verify_signup_otp' do
    let(:user) { create(:user, :unverified, email: 'verify@example.com', password: 'ValidPass1!') }

    it 'activates user and returns token for valid otp' do
      otp = user.generate_signup_otp!
      service = AuthService.new(email: user.email)
      result = service.verify_signup_otp(otp_code: otp)

      expect(result[:success]).to be true
      expect(result[:data][:token]).to be_present
      expect(user.reload.status).to eq('active')
      expect(user.email_verified_at).to be_present
    end

    it 'returns error for invalid otp' do
      user.generate_signup_otp!
      service = AuthService.new(email: user.email)
      result = service.verify_signup_otp(otp_code: '000000')

      expect(result[:success]).to be false
      expect(result[:error][:code]).to eq('OTP_INVALID')
    end

    it 'returns error for expired otp' do
      otp = user.generate_signup_otp!
      user.update!(otp_expires_at: 1.minute.ago)

      service = AuthService.new(email: user.email)
      result = service.verify_signup_otp(otp_code: otp)

      expect(result[:success]).to be false
      expect(result[:error][:code]).to eq('OTP_EXPIRED')
    end
  end

  describe '#resend_signup_otp' do
    before { ActionMailer::Base.deliveries.clear }

    let(:user) { create(:user, :unverified, email: 'resend@example.com') }

    it 'resends otp for unverified user' do
      user.generate_signup_otp!
      user.update!(otp_sent_at: 2.minutes.ago)

      service = AuthService.new(email: user.email)
      expect { @result = service.resend_signup_otp }.to change { ActionMailer::Base.deliveries.count }.by(1)
      result = @result

      expect(result[:success]).to be true
      expect(user.reload.otp_resend_count).to eq(1)
    end

    it 'enforces resend cooldown' do
      user.generate_signup_otp!

      service = AuthService.new(email: user.email)
      result = service.resend_signup_otp

      expect(result[:success]).to be false
      expect(result[:error][:code]).to eq('OTP_RESEND_COOLDOWN')
    end
  end

  describe '.logout' do
    let(:user) { create(:user) }

    it 'revokes all user sessions' do
      user.generate_token
      result = AuthService.logout(user)

      expect(result[:success]).to be true
      expect(user.sessions.valid).to be_empty
    end

    it 'returns success response' do
      result = AuthService.logout(user)

      expect(result[:success]).to be true
      expect(result[:message]).to eq('Logged out successfully')
    end
  end

  describe '#request_password_reset' do
    before { ActionMailer::Base.deliveries.clear }

    it 'sends reset email for existing user' do
      user = create(:user, email: 'reset@example.com')
      service = AuthService.new(email: user.email)

      expect { service.request_password_reset(frontend_url: 'http://localhost:3001') }
        .to change { ActionMailer::Base.deliveries.count }.by(1)

      expect(user.reload.password_reset_token_digest).to be_present
      expect(user.password_reset_expires_at).to be_present
    end

    it 'returns generic success for unknown user' do
      service = AuthService.new(email: 'unknown@example.com')
      result = service.request_password_reset(frontend_url: 'http://localhost:3001')

      expect(result[:success]).to be true
      expect(result[:message]).to include('If an account exists')
    end
  end

  describe '#reset_password' do
    let(:user) { create(:user, email: 'reset2@example.com', password: 'ValidPass1!') }

    it 'resets password with valid token and invalidates sessions' do
      user.generate_token
      token = user.generate_password_reset_token!

      service = AuthService.new(email: user.email)
      result = service.reset_password(
        token: token,
        new_password: 'NewPass1!',
        password_confirmation: 'NewPass1!'
      )

      expect(result[:success]).to be true
      expect(user.reload.authenticate('NewPass1!')).to be_truthy
      expect(user.password_reset_token_digest).to be_nil
      expect(user.sessions.valid).to be_empty
    end

    it 'returns error for expired token' do
      token = user.generate_password_reset_token!
      user.update!(password_reset_expires_at: 1.minute.ago)

      service = AuthService.new(email: user.email)
      result = service.reset_password(
        token: token,
        new_password: 'NewPass1!',
        password_confirmation: 'NewPass1!'
      )

      expect(result[:success]).to be false
      expect(result[:error][:code]).to eq('RESET_TOKEN_EXPIRED')
    end

    it 'returns validation error when confirmation does not match' do
      token = user.generate_password_reset_token!

      service = AuthService.new(email: user.email)
      result = service.reset_password(
        token: token,
        new_password: 'NewPass1!',
        password_confirmation: 'Mismatch1!'
      )

      expect(result[:success]).to be false
      expect(result[:error][:code]).to eq('VALIDATION_ERROR')
      expect(result[:error][:message]).to include("Password confirmation doesn't match Password")
    end
  end
end
