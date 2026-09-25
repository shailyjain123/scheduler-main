class AddSignupMethodToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :signup_method, :string
  end
end
