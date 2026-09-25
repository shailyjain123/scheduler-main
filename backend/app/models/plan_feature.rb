class PlanFeature < ApplicationRecord
  belongs_to :plan
  
  validates :feature_name, presence: true
end
