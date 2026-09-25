class CurrencyRate < ApplicationRecord
  validates :currency, presence: true, uniqueness: true
  validates :rate, presence: true, numericality: { greater_than: 0 }
end
