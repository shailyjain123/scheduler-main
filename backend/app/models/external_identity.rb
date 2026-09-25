class ExternalIdentity < ApplicationRecord
  belongs_to :user

  encrypts :access_token, deterministic: false
  encrypts :refresh_token, deterministic: false

  validates :provider, presence: true
  validates :uid, presence: true, uniqueness: { scope: :provider }
  validates :user_id, uniqueness: { scope: :provider }

  # CRITICAL SECURITY: provider_email is required (no fallback)
  validates :provider_email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }

  # scopes must be present (record which OAuth scopes were granted)
  validates :scopes, presence: true

  # account_type for future multi-org support
  validates :account_type, presence: true, inclusion: { in: %w[personal workspace enterprise] }

  # Update last_used_at on access
  before_save :update_last_used_at, if: :access_token_changed?

  private

  def update_last_used_at
    self.last_used_at = Time.current
  end
end
