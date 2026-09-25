require 'rails_helper'

RSpec.describe Notification, type: :model do
  describe 'validations' do
    subject(:notification) { build(:notification) }

    it { is_expected.to validate_presence_of(:notification_type) }
    it { is_expected.to validate_presence_of(:title) }
    it { is_expected.to validate_presence_of(:description) }
    it { is_expected.to validate_inclusion_of(:priority).in_array(Notification::PRIORITIES) }
    it { is_expected.to validate_inclusion_of(:category).in_array(Notification::CATEGORIES) }
  end

  describe 'scopes' do
    let(:user) { create(:user) }
    let!(:unread_notification) { create(:notification, user: user, read_at: nil) }
    let!(:read_notification) { create(:notification, user: user, read_at: Time.current) }

    it 'returns unread records' do
      expect(Notification.unread).to include(unread_notification)
      expect(Notification.unread).not_to include(read_notification)
    end

    it 'returns read records' do
      expect(Notification.read).to include(read_notification)
      expect(Notification.read).not_to include(unread_notification)
    end
  end

  describe '#mark_as_read!' do
    let(:notification) { create(:notification, read_at: nil) }

    it 'sets read_at' do
      notification.mark_as_read!
      expect(notification.reload.read_at).to be_present
    end
  end
end
