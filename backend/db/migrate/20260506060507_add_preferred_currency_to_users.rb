class AddPreferredCurrencyToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :preferred_currency, :string, default: "USD"
  end
end
