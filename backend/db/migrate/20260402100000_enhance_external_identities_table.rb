class EnhanceExternalIdentitiesTable < ActiveRecord::Migration[8.1]
  def change
    # Make provider_email required
    change_column_null :external_identities, :provider_email, false

    # Add scopes (which OAuth scopes were granted)
    add_column :external_identities, :scopes, :jsonb, default: [], null: false

    # Add account_type for future multi-org support
    add_column :external_identities, :account_type, :string, default: 'personal', null: false

    # Add last_used_at for audit trail
    add_column :external_identities, :last_used_at, :datetime

    # Add index on provider_email for lookups/audits
    add_index :external_identities, :provider_email
  end
end
