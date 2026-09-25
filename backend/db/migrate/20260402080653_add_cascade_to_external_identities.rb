class AddCascadeToExternalIdentities < ActiveRecord::Migration[8.1]
  def change
    remove_foreign_key :external_identities, :users
    add_foreign_key :external_identities, :users, on_delete: :cascade
  end
end
