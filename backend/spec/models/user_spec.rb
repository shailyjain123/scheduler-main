require 'rails_helper'

RSpec.describe User, type: :model do
  describe 'validations' do
    context 'email' do
      it 'validates presence of email' do
        user = build(:user, email: nil)
        expect(user).not_to be_valid
        expect(user.errors[:email]).to include("can't be blank")
      end

      it 'validates uniqueness of email' do
        create(:user, email: 'test@example.com')
        user = build(:user, email: 'test@example.com')
        expect(user).not_to be_valid
        expect(user.errors[:email]).to include('has already been taken')
      end

      it 'validates email format' do
        user = build(:user, email: 'invalid-email')
        expect(user).not_to be_valid
        expect(user.errors[:email]).to include('is invalid')
      end

      it 'accepts valid email formats' do
        valid_emails = [ 'test@example.com', 'user+tag@example.co.uk', 'name_123@test.org' ]
        valid_emails.each do |email|
          user = build(:user, email: email)
          expect(user).to be_valid
        end
      end

      it 'rejects emails containing spaces' do
        user = build(:user, email: 'user @example.com')
        expect(user).not_to be_valid
        expect(user.errors[:email]).to include('cannot contain spaces')
      end
    end

    context 'password' do
      it 'validates presence of password' do
        user = build(:user, password: nil)
        expect(user).not_to be_valid
        expect(user.errors[:password]).to include("can't be blank")
      end

      it 'validates minimum length of 8 characters' do
        user = build(:user, password: 'short')
        expect(user).not_to be_valid
        expect(user.errors[:password]).to include('is too short (minimum is 8 characters)')
      end

      it 'accepts valid passwords' do
        user = build(:user, password: 'ValidPass1!')
        expect(user).to be_valid
      end

      it 'requires at least one uppercase letter' do
        user = build(:user, password: 'validpass1!')
        expect(user).not_to be_valid
      end

      it 'requires at least one lowercase letter' do
        user = build(:user, password: 'VALIDPASS1!')
        expect(user).not_to be_valid
      end

      it 'requires at least one number' do
        user = build(:user, password: 'ValidPass!')
        expect(user).not_to be_valid
      end

      it 'requires at least one special character' do
        user = build(:user, password: 'ValidPass1')
        expect(user).not_to be_valid
      end

      it 'rejects passwords containing spaces' do
        user = build(:user, password: 'Valid Pass1!')
        expect(user).not_to be_valid
      end
    end

    context 'full_name' do
      it 'validates presence of full_name' do
        user = build(:user, full_name: nil)
        expect(user).not_to be_valid
        expect(user.errors[:full_name]).to include("can't be blank")
      end

      it 'accepts full_name' do
        user = build(:user, full_name: 'John Doe')
        expect(user).to be_valid
      end

      it 'rejects names shorter than 3 characters' do
        user = build(:user, full_name: 'Jo')
        expect(user).not_to be_valid
      end

      it 'rejects names longer than 50 characters' do
        user = build(:user, full_name: 'A' * 51)
        expect(user).not_to be_valid
      end

      it 'rejects names with numbers or special characters' do
        user = build(:user, full_name: 'John D03!')
        expect(user).not_to be_valid
      end

      it 'rejects names with extra spaces between words' do
        user = build(:user, full_name: 'John  Doe')
        expect(user).not_to be_valid
      end
    end

    context 'status' do
      it 'validates presence of status' do
        user = build(:user, status: nil)
        expect(user).not_to be_valid
        expect(user.errors[:status]).to include("can't be blank")
      end

      it 'validates status inclusion' do
        user = build(:user, status: 'invalid_status')
        expect(user).not_to be_valid
        expect(user.errors[:status]).to include('is not included in the list')
      end

      it 'accepts valid status values' do
        %w[active inactive banned].each do |status|
          user = build(:user, status: status)
          expect(user).to be_valid
        end
      end
    end
  end

  describe '#authenticate' do
    let(:user) { create(:user, password: 'ValidPass1!') }

    it 'returns user when password is correct' do
      expect(user.authenticate('ValidPass1!')).to eq(user)
    end

    it 'returns false when password is incorrect' do
      expect(user.authenticate('WrongPassword')).to be_falsey
    end
  end

  describe '#generate_token' do
    let(:user) { create(:user) }

    it 'generates a JWT token' do
      token = user.generate_token
      expect(token).to be_a(String)
      expect(token).not_to be_empty
    end

    it 'creates a session for the token' do
      expect { user.generate_token }.to change(user.sessions, :count).by(1)
    end

    it 'token is decodable' do
      token = user.generate_token
      payload = JWT.decode(token, Rails.application.config.secret_key_base).first
      expect(payload['user_id']).to eq(user.id)
      expect(payload['email']).to eq(user.email)
    end

    it 'token expires in 24 hours' do
      token = user.generate_token
      payload = JWT.decode(token, Rails.application.config.secret_key_base).first
      expiration = Time.zone.at(payload['exp'])
      expect(expiration).to be_within(1.minute).of(24.hours.from_now)
    end
  end

  describe '.from_token' do
    let(:user) { create(:user) }
    let(:token) { user.generate_token }

    it 'returns user for valid token' do
      expect(User.from_token(token)).to eq(user)
    end

    it 'returns nil for invalid token' do
      expect(User.from_token('invalid.token.here')).to be_nil
    end

    it 'returns nil for blank token' do
      expect(User.from_token('')).to be_nil
    end

    it 'returns nil for expired token' do
      # Generate the token first to create the session
      test_token = user.generate_token
      # Find the session that was just created and expire it
      expired_session = user.sessions.last
      expired_session.update(expires_at: 1.hour.ago)
      expect(User.from_token(test_token)).to be_nil
    end
  end

  describe 'otp verification' do
    let(:user) { create(:user, :unverified) }

    it 'verifies valid otp and activates account' do
      otp = user.generate_signup_otp!

      result = user.verify_signup_otp!(otp)

      expect(result[:success]).to be true
      expect(user.reload.email_verified?).to be(true)
      expect(user.status).to eq('active')
    end

    it 'returns expired for old otp' do
      otp = user.generate_signup_otp!
      user.update!(otp_expires_at: 1.minute.ago)

      result = user.verify_signup_otp!(otp)

      expect(result[:success]).to be false
      expect(result[:code]).to eq('OTP_EXPIRED')
    end

    it 'locks account after max invalid attempts' do
      user.generate_signup_otp!

      User::OTP_MAX_FAILED_ATTEMPTS.times do
        user.verify_signup_otp!('111111')
      end

      expect(user.reload.otp_locked_until).to be_present
      expect(user.otp_locked_until).to be > Time.current
    end

    it 'enforces resend limit per window' do
      user.update!(otp_resend_window_started_at: Time.current, otp_resend_count: User::OTP_MAX_RESENDS_PER_WINDOW)

      result = user.can_resend_otp?

      expect(result[:allowed]).to be false
      expect(result[:code]).to eq('OTP_RESEND_LIMIT_REACHED')
    end
  end

  describe 'scopes' do
    before do
      create(:user, status: 'active')
      create(:user, status: 'inactive')
      create(:user, status: 'banned')
    end

    describe '.active' do
      it 'returns only active users' do
        expect(User.active.count).to eq(1)
        expect(User.active.first.status).to eq('active')
      end
    end

    describe '.by_email' do
      let(:user) { create(:user, email: 'specific@example.com') }

      it 'returns user by email' do
        expect(User.by_email('specific@example.com')).to include(user)
      end

      it 'returns empty collection for non-existent email' do
        expect(User.by_email('nonexistent@example.com')).to be_empty
      end
    end
  end

  describe 'associations' do
    let(:user) { create(:user) }

    it 'has many sessions' do
      expect(user).to have_many(:sessions)
    end

    it 'destroys sessions when user is deleted' do
      user.generate_token
      expect { user.destroy }.to change(Session, :count).by(-1)
    end
  end
end
