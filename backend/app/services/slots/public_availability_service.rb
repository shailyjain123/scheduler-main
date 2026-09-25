module Slots
  class PublicAvailabilityService
    Result = Struct.new(:available_slots, :booked_times, :timezone, :event_duration, keyword_init: true)

    def initialize(event_type:, timezone: nil, start_date: nil, end_date: nil)
      @event_type = event_type
      @host = event_type.user
      @host_timezone = @host.timezone.presence || "UTC"
      @timezone = timezone.presence || @host_timezone
      @start_date = (start_date || Date.current).to_date
      @end_date = (end_date || default_end_date).to_date
    end

    def call
      return empty_result if @event_type.is_active == false

      booked_times = build_booked_times
      available_slots = build_available_slots(booked_times)

      Result.new(
        available_slots: available_slots,
        booked_times: booked_times,
        timezone: @timezone,
        event_duration: @event_type.duration
      )
    end

    private

    def empty_result
      Result.new(
        available_slots: [],
        booked_times: [],
        timezone: @timezone,
        event_duration: @event_type.duration
      )
    end

    def default_end_date
      setting = @host.user_setting
      return @start_date + 21.days unless setting

      # Use the host's local date to determine the range limit
      host_date = time_zone(@host_timezone).now.to_date

      if setting.booking_range_type == "indefinitely"
        host_date + 365.days
      else
        host_date + (setting.booking_range_count || 60).days
      end
    end

    def build_booked_times
      # Use the host's timezone to compute the UTC range for the host day(s).
      host_zone = time_zone(@host_timezone)

      range_start = host_zone.local(@start_date.year, @start_date.month, @start_date.day).beginning_of_day.utc
      range_end = host_zone.local(@end_date.year, @end_date.month, @end_date.day).end_of_day.utc

      Event.where(status: "scheduled")
        .where("(events.user_id = :user_id OR EXISTS (SELECT 1 FROM event_invitees WHERE event_invitees.event_id = events.id AND event_invitees.user_id = :user_id))", user_id: @host.id)
        .includes(:event_invitees)
        .where("start_time < ? AND end_time > ?", range_end + 12.hours, range_start - 12.hours)
        .order(:start_time)
        .map do |event|
          {
            start_time: event.start_time.in_time_zone(host_zone),
            end_time: event.end_time.in_time_zone(host_zone),
            buffer_before: event.buffer_before_minutes.to_i,
            buffer_after: event.buffer_after_minutes.to_i,
            event_id: event.id,
            event_type_id: event.event_type_id,
            title: event.title,
            attendee_count: event.event_invitees.size
          }
        end
    end

    def build_available_slots(booked_times)
      slots = []
      current_date = @start_date

      # Respect booking range from settings
      actual_end_date = [ @end_date, default_end_date ].min

      # Pre-count bookings per day if max_bookings_per_day is set
      setting = @host.user_setting
      max_bookings = setting.max_bookings_per_day
      bookings_count_by_date = {}
      if max_bookings.present?
        booked_times.each do |bt|
          d = bt[:start_time].to_date
          bookings_count_by_date[d] = (bookings_count_by_date[d] || 0) + 1
        end
      end

      host_zone = time_zone(@host_timezone)

      while current_date <= actual_end_date
        # Check if max bookings reached for this date
        if max_bookings.present? && (bookings_count_by_date[current_date] || 0) >= max_bookings
          current_date += 1.day
          next
        end

        # Get base intervals for this date (from event type or host schedule)
        intervals = intervals_for_date(current_date, host_zone)

        # Apply Availability Overrides
        intervals = apply_overrides(current_date, intervals, host_zone)

        intervals.each do |interval|
          generate_slots_for_interval(interval, booked_times, slots)
        end

        current_date += 1.day
      end

      slots.sort_by { |slot| slot[:start_time] }
    end

    def intervals_for_date(date, zone)
      availability = @event_type.availability

      if availability.is_a?(Hash) && (availability.key?("slots") || availability.key?(:slots))
        # Event-specific availability (slots format)
        slots_data = availability["slots"] || availability[:slots]
        return [] unless slots_data.is_a?(Array)

        slots_data.filter_map do |slot|
          next unless slot.is_a?(Hash)
          # Map day_of_week correctly (frontend should now send 0=Sun, 1=Mon...)
          next unless slot["day_of_week"].to_i == date.wday && slot["is_active"] != false

          start_v = slot["start_time"].presence || slot[:start_time].presence
          end_v = slot["end_time"].presence || slot[:end_time].presence
          next if start_v.blank? || end_v.blank?

          # Use the timezone specified in the availability JSON if present, otherwise fallback to host zone
          slot_zone = time_zone(availability["timezone"] || availability[:timezone] || zone.name)

          start_t = slot_zone.parse("#{date} #{start_v}").in_time_zone(zone)
          end_t = slot_zone.parse("#{date} #{end_v}").in_time_zone(zone)
          next if start_t.blank? || end_t.blank? || end_t <= start_t

          { start_time: start_t, end_time: end_t }
        end
      elsif availability.is_a?(Hash) && availability.present? && availability.keys.any? { |k| Date::DAYNAMES.include?(k.to_s.capitalize) }
        # Event-specific availability (old format: "Monday" => [...])
        day_name = Date::DAYNAMES[date.wday]
        day_slots = availability[day_name] || availability[day_name.to_s] || []
        return [] unless day_slots.is_a?(Array)

        day_slots.filter_map do |slot|
          next unless slot.is_a?(Hash)
          start_v = slot["start"].presence || slot[:start].presence
          end_v = slot["end"].presence || slot[:end].presence
          next if start_v.blank? || end_v.blank?

          # Use the timezone specified in the availability JSON if present, otherwise fallback to host zone
          slot_zone = time_zone(availability["timezone"] || availability[:timezone] || zone.name)

          start_t = slot_zone.parse("#{date} #{start_v}").in_time_zone(zone)
          end_t = slot_zone.parse("#{date} #{end_v}").in_time_zone(zone)
          next if start_t.blank? || end_t.blank? || end_t <= start_t

          { start_time: start_t, end_time: end_t }
        end
      else
        fallback_host_schedule_slots_for_date(date, zone)
      end
    end

    def fallback_host_schedule_slots_for_date(date, zone)
      # AvailabilitySchedule uses 0 = Sunday, 1 = Monday, ..., 6 = Saturday (Ruby standard)
      schedules = @host.availability_schedules.where(day_of_week: date.wday, is_active: true)

      schedules.filter_map do |schedule|
        start_v = schedule.start_time.strftime("%H:%M")
        end_v = schedule.end_time.strftime("%H:%M")
        
        # Use the stored schedule timezone instead of the requested zone to parse wall-clock times
        schedule_zone = time_zone(schedule.timezone || zone.name)

        start_t = schedule_zone.parse("#{date} #{start_v}").in_time_zone(zone)
        end_t = schedule_zone.parse("#{date} #{end_v}").in_time_zone(zone)
        next if start_t.blank? || end_t.blank? || end_t <= start_t

        { start_time: start_t, end_time: end_t }
      end
    end

    def apply_overrides(date, intervals, zone)
      overrides = @host.availability_overrides.where(date: date).order(:start_time)
      return intervals if overrides.empty?

      # If any override is "Unavailable" for the whole day (no start/end times)
      if overrides.any? { |o| o.is_unavailable && o.start_time.blank? && o.end_time.blank? }
        return []
      end

      # Convert intervals to start/end keys for consistency with override logic
      res = intervals.map { |i| { start: i[:start_time], end: i[:end_time] } }

      overrides.each do |o|
        if o.start_time.blank? || o.end_time.blank?
          # Handled whole-day unavailable above. 
          # For whole-day available, we'd need a different approach, but UI usually sets times.
          next
        end

        # Use the stored override timezone instead of the requested zone to parse wall-clock times
        override_zone = time_zone(o.timezone || zone.name)

        o_start = override_zone.parse("#{date} #{o.start_time.strftime('%H:%M')}").in_time_zone(zone)
        o_end = override_zone.parse("#{date} #{o.end_time.strftime('%H:%M')}").in_time_zone(zone)
        next if o_start.blank? || o_end.blank? || o_end <= o_start

        o_interval = { start: o_start, end: o_end }

        if o.is_unavailable
          res = subtract_interval_set(res, o_interval)
        else
          res << o_interval
          res = merge_intervals(res)
        end
      end

      # Map back to internal format
      res.map { |i| { start_time: i[:start], end_time: i[:end] } }
    end

    def subtract_interval_set(intervals, blocked)
      intervals.flat_map { |i| subtract_interval(i, blocked) }
    end

    def subtract_interval(interval, blocked)
      i_start = interval[:start]
      i_end = interval[:end]
      b_start = blocked[:start]
      b_end = blocked[:end]

      return [ interval ] if b_end <= i_start || b_start >= i_end

      parts = []
      parts << { start: i_start, end: b_start } if b_start > i_start
      parts << { start: b_end, end: i_end } if b_end < i_end
      parts
    end

    def merge_intervals(intervals)
      return [] if intervals.empty?
      sorted = intervals.sort_by { |i| i[:start] }
      merged = [ sorted.first.dup ]

      sorted.drop(1).each do |i|
        last = merged.last
        if i[:start] <= last[:end]
          last[:end] = [ last[:end], i[:end] ].max
        else
          merged << i.dup
        end
      end
      merged
    end

    def generate_slots_for_interval(interval, booked_times, slots)
      duration_minutes = @event_type.duration.to_i
      return if duration_minutes <= 0

      # Use duration as increment for now, could be made configurable
      increment = duration_minutes

      current_time = interval[:start_time]
      while current_time + duration_minutes.minutes <= interval[:end_time]
        slot_end = current_time + duration_minutes.minutes

        unless overlaps_booked_time?(current_time, slot_end, booked_times) || too_soon?(current_time)
          guest_start = current_time.in_time_zone(time_zone(@timezone))
          guest_end = slot_end.in_time_zone(time_zone(@timezone))

          slots << {
            date: guest_start.to_date.to_s,
            start_time: guest_start.iso8601,
            end_time: guest_end.iso8601,
            label: "#{guest_start.strftime('%I:%M %p')} - #{guest_end.strftime('%I:%M %p')}",
            available: true
          }
        end

        current_time += increment.minutes
      end
    end

    def too_soon?(time)
      setting = @host.user_setting
      notice_value = setting.minimum_notice_value || 0
      notice_unit = setting.minimum_notice_unit || "Hours"

      minimum_notice_duration = case notice_unit
      when "Minutes" then notice_value.minutes
      when "Hours" then notice_value.hours
      when "Days" then notice_value.days
      else 0
      end

      time < Time.current + minimum_notice_duration
    end

    def overlaps_booked_time?(start_time, end_time, booked_times)
      setting = @host.user_setting
      new_buffer_before = setting.buffer_before.to_i
      new_buffer_after = setting.buffer_after.to_i

      relevant_bookings = booked_times.select do |booked|
        # Precise Buffered Overlap Formula: (S < BE + BA + NB) AND (E > BS - BB - NA)
        blocked_start = booked[:start_time] - booked[:buffer_before].minutes - new_buffer_after.minutes
        blocked_end = booked[:end_time] + booked[:buffer_after].minutes + new_buffer_before.minutes
        start_time < blocked_end && end_time > blocked_start
      end

      return false if relevant_bookings.empty?

      if @event_type.kind_group?
        # For group events, we allow overlap ONLY if all overlapping events
        # are for the same event type and at the exact same time.
        all_same_slot = relevant_bookings.all? do |booked|
          booked[:event_type_id] == @event_type.id &&
          booked[:start_time] == start_time &&
          booked[:end_time] == end_time
        end

        if all_same_slot
          total_attendees = relevant_bookings.sum { |b| b[:attendee_count] }
          return total_attendees >= (@event_type.max_participants || 1)
        end
      end

      true
    end

    def time_zone(name)
      Time.find_zone(name) || ActiveSupport::TimeZone["UTC"]
    end

  end
end
