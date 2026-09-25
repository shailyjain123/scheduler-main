class AddOnboardingFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :onboarding_completed, :boolean
    add_column :users, :onboarding_stage, :integer
    add_column :users, :username, :string
    add_column :users, :timezone, :string
    add_column :users, :avatar_url, :string
    add_column :users, :availability, :jsonb
    add_column :users, :integrations, :jsonb
    add_column :users, :bio, :text
  end
end
