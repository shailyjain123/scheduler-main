class AvailabilityScheduleSerializer
  DAY_NAMES = %w[Sunday Monday Tuesday Wednesday Thursday Friday Saturday].freeze

  def initialize(schedule)
    @schedule = schedule
  end

  def as_json
    {
      id: @schedule.id,
      day_of_week: @schedule.day_of_week,
      day_name: DAY_NAMES[@schedule.day_of_week],
      start_time: raw_hhmm("start_time"),
      end_time: raw_hhmm("end_time"),
      is_active: @schedule.is_active,
      timezone: normalized_timezone
    }
  end

  private

  def normalized_timezone
    ActiveSupport::TimeZone[@schedule.timezone]&.tzinfo&.name || "UTC"
  end

  def raw_hhmm(column)
    raw = @schedule.read_attribute_before_type_cast(column)
    value = raw.to_s.strip
    return value[0, 5] if value.match?(/\A\d{2}:\d{2}/)

    @schedule.public_send(column)&.strftime("%H:%M")
  end
end
