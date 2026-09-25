module Currencies
  class ConversionService
    # Static conversion rates (Base: USD)
    # USD -> Target
    STATIC_RATES = {
      "USD" => 1.0,
      "EUR" => 0.92,
      "INR" => 83.0,
      "GBP" => 0.79
    }.freeze

    CURRENCY_SYMBOLS = {
      "USD" => "$",
      "EUR" => "€",
      "INR" => "₹",
      "GBP" => "£"
    }.freeze

    class << self
      def convert(amount_usd, target_currency)
        rate = STATIC_RATES[target_currency] || 1.0
        (amount_usd * rate).round(2)
      end

      def format(amount, currency)
        symbol = CURRENCY_SYMBOLS[currency] || "$"
        # For INR, usually we show no decimals if it's a round number or large
        if currency == "INR"
          "#{symbol}#{amount.to_i}"
        else
          "#{symbol}#{format('%.2f', amount).gsub('.00', '')}"
        end
      end

      def convert_and_format(amount_usd, target_currency)
        converted = convert(amount_usd, target_currency)
        format(converted, target_currency)
      end
    end
  end
end
