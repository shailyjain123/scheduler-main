class Plan < ApplicationRecord
  has_many :plan_features, dependent: :destroy
  
  validates :name, presence: true
  validates :credits, numericality: { greater_than_or_equal_to: 0 }
  validates :price, numericality: { greater_than_or_equal_to: 0 }
  validates :billing_cycle, inclusion: { in: %w[monthly quarterly yearly] }

  scope :active, -> { where(active: true) }

  def soft_delete!
    update(active: false)
  end
end
