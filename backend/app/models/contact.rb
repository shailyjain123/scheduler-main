class Contact < ApplicationRecord
  belongs_to :user
  has_many :contact_notes, -> { order(created_at: :desc) }, dependent: :destroy

  before_validation :normalize_phone

  validates :first_name, :last_name, presence: true
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :email, uniqueness: { scope: :user_id, message: "already exists in your contacts" }
  validates :phone, phone: { allow_blank: true, message: "is an invalid phone number" }

  def full_name
    "#{first_name} #{last_name}"
  end

  private

  def normalize_phone
    cleaned = phone.to_s.strip
    if cleaned.blank?
      self.phone = nil
      return
    end

    digits_only = cleaned.gsub(/\D/, "")
    normalized_input = cleaned.start_with?("+") ? "+#{digits_only}" : digits_only

    parsed = Phonelib.parse(normalized_input)
    self.phone = parsed.e164.presence || normalized_input
  end
end
