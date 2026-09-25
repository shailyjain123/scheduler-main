class AvailabilityOverride < ApplicationRecord
  belongs_to :user

  validates :user_id, presence: true
  validates :date, presence: true
  validates :is_unavailable, inclusion: { in: [ true, false ] }
  validates :timezone, presence: true
  validate :date_not_in_past_on_create
  validate :times_required_when_available_override
  validate :end_time_after_start_time_when_present
  validate :no_overlapping_blocks_for_date
  validate :no_scheduled_meeting_conflicts_for_unavailable_block

  private

  def date_not_in_past_on_create
    return unless new_record?
    return if date.blank?
    return if date >= Date.current

    errors.add(:date, "must not be in the past")
  end

  def times_required_when_available_override
    return if is_unavailable
    return if start_time.present? && end_time.present?

    errors.add(:base, "start_time and end_time are required when is_unavailable is false")
  end

  def end_time_after_start_time_when_present
    return if start_time.blank? || end_time.blank?
    # Allow overnight ranges - duration validation handles the logic
    return unless start_time == end_time

    errors.add(:end_time, "cannot be the same as start_time")
  end

  def no_overlapping_blocks_for_date
    return if user_id.blank? || date.blank?
    return if start_time.blank? || end_time.blank?

    start_minutes = time_to_minutes(start_time)
    end_minutes = time_to_minutes(end_time)

    existing_overrides = self.class
      .where(user_id: user_id, date: date)
      .where.not(id: id)

    existing_overrides.each do |existing|
      existing_start = time_to_minutes(existing.start_time)
      existing_end = time_to_minutes(existing.end_time)

      if do_time_ranges_overlap?(start_minutes, end_minutes, existing_start, existing_end)
        errors.add(:base, "Overlapping override block for this date")
        return
      end
    end
  end

  def time_to_minutes(time_obj)
    return nil if time_obj.blank?
    time_obj.hour * 60 + time_obj.min
  end

  def do_time_ranges_overlap?(start_a, end_a, start_b, end_b)
    is_overnight_a = end_a < start_a
    is_overnight_b = end_b < start_b

    if !is_overnight_a && !is_overnight_b
      # Both same-day
      return start_a < end_b && end_a > start_b
    end

    if is_overnight_a && is_overnight_b
      # Both overnight
      a_end_normalized = end_a + (24 * 60)
      b_end_normalized = end_b + (24 * 60)
      return start_a < b_end_normalized && a_end_normalized > start_b
    end

    # One overnight, one same-day
    overnight_start = is_overnight_a ? start_a : start_b
    overnight_end = is_overnight_a ? end_a : end_b
    same_day_start = is_overnight_a ? start_b : start_a
    same_day_end = is_overnight_a ? end_b : end_a

    # Check if same-day overlaps with overnight's "before midnight" part
    return true if same_day_start < overnight_start && same_day_end > overnight_start

    # Check if same-day overlaps with overnight's "after midnight" part
    return true if same_day_start < overnight_end

    false
  end

  def no_scheduled_meeting_conflicts_for_unavailable_block
    return unless is_unavailable
    return if user.blank? || date.blank?

    range = blocked_time_range
    return if range.nil?

    conflict_scope = user.events
      .where(status: "scheduled")
      .where("start_time < ? AND end_time > ?", range[:end_at], range[:start_at])

    return unless conflict_scope.exists?

    errors.add(:base, "Cannot block time range with scheduled meetings")
  end

  def blocked_time_range
    zone = ActiveSupport::TimeZone[user.timezone.presence || "UTC"] || ActiveSupport::TimeZone["UTC"]

    if start_time.present? && end_time.present?
      start_hhmm = raw_hhmm(:start_time)
      end_hhmm = raw_hhmm(:end_time)
      return nil if start_hhmm.blank? || end_hhmm.blank?

      {
        start_at: zone.parse("#{date} #{start_hhmm}"),
        end_at: zone.parse("#{date} #{end_hhmm}")
      }
    else
      day = zone.parse(date.to_s)
      {
        start_at: day.beginning_of_day,
        end_at: day.end_of_day
      }
    end
  end

  def raw_hhmm(column)
    raw = read_attribute_before_type_cast(column).to_s.strip
    return raw[0, 5] if raw.match?(/\A\d{2}:\d{2}/)

    public_send(column)&.strftime("%H:%M")
  end
end
