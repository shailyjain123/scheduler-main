class SetDefaultOnboardingFields < ActiveRecord::Migration[8.1]
  def change
    change_column_default :users, :onboarding_completed, from: nil, to: false
    change_column_default :users, :onboarding_stage, from: nil, to: 1
  end
end
