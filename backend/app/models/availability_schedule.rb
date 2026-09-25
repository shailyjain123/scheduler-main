class AvailabilitySchedule < ApplicationRecord
  MINIMUM_SLOT_DURATION_MINUTES = 30
  MAX_SLOT_DURATION_MINUTES = (24 * 60) - 1

  belongs_to :user

  validates :user_id, presence: true
  validates :day_of_week, presence: true, inclusion: { in: 0..6 }
  validates :start_time, presence: true
  validates :end_time, presence: true
  validates :timezone, presence: true
  validates :is_active, inclusion: { in: [ true, false ] }
  validate :end_time_after_start_time
  validate :duration_within_allowed_limit
  validate :no_overlap_for_day

  scope :active, -> { where(is_active: true) }

  private

  def self.minute_of_day_value(value)
    return nil if value.blank?

    raw = value.to_s.strip
    hhmm = if raw.match?(/\A\d{2}:\d{2}/)
      raw[0, 5]
    elsif value.respond_to?(:strftime)
      value.strftime("%H:%M")
    end
    return nil if hhmm.blank?

    hours, minutes = hhmm.split(":").map(&:to_i)
    return nil if hours.negative? || hours > 23 || minutes.negative? || minutes > 59

    (hours * 60) + minutes
  end

  def end_time_after_start_time
    # Overnight ranges (endTime < startTime) are now allowed
    # Duration validation handles the 30+ minute requirement
    # So this check just ensures times aren't equal
    return if start_time.blank? || end_time.blank?

    return unless start_time == end_time

    errors.add(:end_time, "cannot be the same as start_time")
  end

  def duration_within_allowed_limit
    return if start_time.blank? || end_time.blank?

    start_minutes = self.class.minute_of_day_value(read_attribute_before_type_cast(:start_time) || start_time)
    end_minutes = self.class.minute_of_day_value(read_attribute_before_type_cast(:end_time) || end_time)
    return if start_minutes.nil? || end_minutes.nil?

    # Handle overnight ranges (crossing midnight)
    # If end_minutes < start_minutes, it's an overnight range (e.g., 23:00 to 07:00)
    if end_minutes >= start_minutes
      # Same-day range
      duration_minutes = end_minutes - start_minutes
    else
      # Overnight range: 23:00 to 07:00 = (1440 - 1380) + 420 = 480 minutes = 8 hours
      duration_minutes = (24 * 60) - start_minutes + end_minutes
    end

    if duration_minutes < MINIMUM_SLOT_DURATION_MINUTES
      errors.add(:end_time, "must be at least 30 minutes after start_time")
      return
    end

    return if duration_minutes <= MAX_SLOT_DURATION_MINUTES

    errors.add(:end_time, "must be less than 24 hours")
  end

  def no_overlap_for_day
    return if user_id.blank? || day_of_week.blank? || start_time.blank? || end_time.blank?

    existing = self.class
      .where(user_id: user_id, day_of_week: day_of_week)
      .where.not(id: id)
      .to_a

    slots_data = (existing + [ self ]).map do |slot|
      start_minutes = self.class.minute_of_day_value(slot.read_attribute_before_type_cast(:start_time) || slot.start_time)
      end_minutes = self.class.minute_of_day_value(slot.read_attribute_before_type_cast(:end_time) || slot.end_time)
      next if start_minutes.nil? || end_minutes.nil?

      is_overnight = end_minutes < start_minutes

      {
        slot: slot,
        start_minutes: start_minutes,
        end_minutes: end_minutes,
        is_overnight: is_overnight
      }
    end.compact

    # Check for overlaps between all slot pairs
    (0...slots_data.length).each do |i|
      (i + 1...slots_data.length).each do |j|
        slot_a = slots_data[i]
        slot_b = slots_data[j]

        if slots_overlap?(slot_a, slot_b)
          errors.add(:base, "Overlapping availability schedule block for this day")
          return
        end
      end
    end
  end

  private

  def slots_overlap?(slot_a, slot_b)
    # Both same-day ranges
    unless slot_a[:is_overnight] || slot_b[:is_overnight]
      return slot_a[:start_minutes] < slot_b[:end_minutes] &&
             slot_a[:end_minutes] > slot_b[:start_minutes]
    end

    # Both overnight ranges
    if slot_a[:is_overnight] && slot_b[:is_overnight]
      # Normalize to 24h timeline: overnight ranges span from start to (end + 24h)
      a_start = slot_a[:start_minutes]
      a_end = slot_a[:end_minutes] + (24 * 60)
      b_start = slot_b[:start_minutes]
      b_end = slot_b[:end_minutes] + (24 * 60)
      return a_start < b_end && a_end > b_start
    end

    # One overnight, one same-day
    overnight = slot_a[:is_overnight] ? slot_a : slot_b
    same_day = slot_a[:is_overnight] ? slot_b : slot_a

    # Check if same-day overlaps with overnight's "before midnight" part
    return true if same_day[:start_minutes] < overnight[:start_minutes] &&
                   same_day[:end_minutes] > overnight[:start_minutes]

    # Check if same-day overlaps with overnight's "after midnight" part
    return true if same_day[:start_minutes] < overnight[:end_minutes]

    false
  end
end
