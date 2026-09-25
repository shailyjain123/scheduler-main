class ContactNote < ApplicationRecord
  belongs_to :contact
  belongs_to :user

  validates :content, presence: true
end
