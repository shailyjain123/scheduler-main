require 'rails_helper'

RSpec.describe EventType, type: :model do
  describe 'validations' do
    it 'is valid with a title between 3 and 20 characters' do
      event_type = build(:event_type, title: 'Sprint Review')

      expect(event_type).to be_valid
    end

    it 'is invalid when title is shorter than 3 characters' do
      event_type = build(:event_type, title: 'Hi')

      expect(event_type).not_to be_valid
      expect(event_type.errors[:title]).to include('is too short (minimum is 3 characters)')
    end

    it 'is invalid when title is longer than 20 characters' do
      event_type = build(:event_type, title: 'A' * 21)

      expect(event_type).not_to be_valid
      expect(event_type.errors[:title]).to include('is too long (maximum is 20 characters)')
    end

    it 'strips leading and trailing spaces before validation' do
      event_type = build(:event_type, title: '  Weekly Sync  ')
      event_type.validate

      expect(event_type.title).to eq('Weekly Sync')
      expect(event_type).to be_valid
    end
  end
end
