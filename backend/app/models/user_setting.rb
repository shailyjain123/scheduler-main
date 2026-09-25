class UserSetting < ApplicationRecord
  belongs_to :user

  validates :buffer_before, numericality: { greater_than_or_equal_to: 0 }
  validates :buffer_after, numericality: { greater_than_or_equal_to: 0 }
  validates :minimum_notice_value, numericality: { greater_than_or_equal_to: 0 }
  validates :minimum_notice_unit, inclusion: { in: %w[Minutes Hours Days] }
  validates :booking_range_type, inclusion: { in: %w[indefinitely days] }
  validates :booking_range_count, numericality: { greater_than_or_equal_to: 1 }, if: -> { booking_range_type == "days" }
  validates :max_bookings_per_day, numericality: { greater_than_or_equal_to: 1 }, allow_nil: true
end
