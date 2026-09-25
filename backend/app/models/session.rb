class Session < ApplicationRecord
  belongs_to :user

  # Validations
  validates :token, presence: true, uniqueness: true
  validates :expires_at, presence: true

  # Scopes
  scope :valid, -> { where("expires_at > ?", Time.current) }
  scope :expired, -> { where("expires_at <= ?", Time.current) }

  # Check if session is still active (not expired)
  def active?
    expires_at > Time.current
  end

  # Revoke session
  def revoke!
    update(expires_at: Time.current)
  end
end
