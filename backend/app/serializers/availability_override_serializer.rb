class AvailabilityOverrideSerializer
  def initialize(override)
    @override = override
  end

  def as_json
    {
      id: @override.id,
      date: @override.date&.iso8601,
      is_unavailable: @override.is_unavailable,
      start_time: raw_hhmm("start_time"),
      end_time: raw_hhmm("end_time"),
      reason: @override.reason,
      timezone: normalized_timezone
    }
  end

  private

  def normalized_timezone
    ActiveSupport::TimeZone[@override.timezone]&.tzinfo&.name || "UTC"
  end

  def raw_hhmm(column)
    raw = @override.read_attribute_before_type_cast(column)
    value = raw.to_s.strip
    return nil if value.blank?
    return value[0, 5] if value.match?(/\A\d{2}:\d{2}/)

    @override.public_send(column)&.strftime("%H:%M")
  end
end
