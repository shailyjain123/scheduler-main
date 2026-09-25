class AddProfileFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :phone_number, :string
    add_column :users, :workspace_name, :string
    add_column :users, :language, :string
    add_column :users, :appearance, :string
  end
end
