require 'rails_helper'

RSpec.describe Contact, type: :model do
  describe 'validations' do
    it 'is valid with a blank phone number' do
      contact = build(:contact, phone: '')

      expect(contact).to be_valid
    end

    it 'normalizes valid phone numbers to E.164' do
      contact = build(:contact, phone: '+1 (415) 555-2671')

      expect(contact).to be_valid
      expect(contact.phone).to eq('+14155552671')
    end

    it 'is invalid when phone is not a valid number' do
      contact = build(:contact, phone: '+1 111 111 1111')

      expect(contact).not_to be_valid
      expect(contact.errors[:phone]).to include('is an invalid phone number')
    end
  end
end
