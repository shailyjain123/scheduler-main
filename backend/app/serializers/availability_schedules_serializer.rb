class AvailabilitySchedulesSerializer
  DAY_NAME_BY_INDEX = {
    1 => "Monday",
    2 => "Tuesday",
    3 => "Wednesday",
    4 => "Thursday",
    5 => "Friday",
    6 => "Saturday",
    0 => "Sunday"
  }.freeze

  ORDERED_DAY_NAMES = %w[Monday Tuesday Wednesday Thursday Friday Saturday Sunday].freeze

  def initialize(schedules)
    @schedules = schedules
  end

  def as_weekly_json
    base = ORDERED_DAY_NAMES.index_with { [] }

    @schedules.order(:day_of_week, :start_time).each do |schedule|
      day_name = DAY_NAME_BY_INDEX[schedule.day_of_week]
      next if day_name.blank?

      base[day_name] << {
        "start" => schedule.start_time.strftime("%H:%M"),
        "end" => schedule.end_time.strftime("%H:%M")
      }
    end

    base
  end
end
