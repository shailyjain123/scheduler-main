class CreateExternalIdentities < ActiveRecord::Migration[8.1]
  def change
    create_table :external_identities do |t|
      t.references :user, null: false, foreign_key: true
      t.string :provider
      t.string :uid
      t.string :provider_email
      t.text :access_token
      t.text :refresh_token
      t.datetime :expires_at
      t.jsonb :metadata

      t.timestamps
    end

    add_index :external_identities, [ :provider, :uid ], unique: true
    add_index :external_identities, [ :user_id, :provider ], unique: true
  end
end
