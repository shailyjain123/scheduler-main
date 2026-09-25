class CreateCurrencyRates < ActiveRecord::Migration[8.1]
  def change
    create_table :currency_rates do |t|
      t.string :currency, null: false
      t.decimal :rate, precision: 10, scale: 4, null: false
      t.timestamps
    end
    add_index :currency_rates, :currency, unique: true
  end
end
