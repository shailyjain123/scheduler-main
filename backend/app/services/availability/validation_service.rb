module Availability
  class ValidationService
    def initialize(user:, event_type: nil, start_time:, end_time:, current_event_id: nil)
      @user = user
      @event_type = event_type
      @start_time = start_time.utc
      @end_time = end_time.utc
      @current_event_id = current_event_id
      @errors = []
      @debug_info = {}
    end

    def self.call(**args)
      new(**args).call
    end

    def call
      @debug_info[:requested_range] = { start: @start_time, end: @end_time }
      @debug_info[:host_timezone] = host_timezone.tzinfo.name

      Rails.logger.debug "[Availability::ValidationService] START user_id=#{@user.id} event_type_id=#{@event_type&.id} " \
                         "start=#{@start_time.iso8601} end=#{@end_time.iso8601} tz=#{host_timezone.name}"

      # 1. Check basic constraints (daily limit, booking range, notice)
      check_constraints
      if @errors.any?
        Rails.logger.debug "[Availability::ValidationService] FAILED constraints errors=#{@errors.join(', ')}"
        return result 
      end

      # 2. Check if within user availability slots
      check_within_availability
      if @errors.any?
        Rails.logger.debug "[Availability::ValidationService] FAILED availability errors=#{@errors.join(', ')} " \
                           "intervals=#{@debug_info[:available_intervals]}"
        return result
      end

      # 3. Check for double booking and buffers
      check_conflicts
      if @errors.any?
        Rails.logger.debug "[Availability::ValidationService] FAILED conflicts errors=#{@errors.join(', ')}"
      else
        Rails.logger.debug "[Availability::ValidationService] SUCCESS"
      end

      result
    end

    private

    def result
      {
        success: @errors.empty?,
        errors: @errors,
        debug_info: @debug_info
      }
    end

    def check_constraints
      setting = @user.user_setting
      return unless setting

      # Minimum Notice
      notice_value = setting.minimum_notice_value || 0
      notice_unit = setting.minimum_notice_unit || "Hours"
      min_notice_duration = case notice_unit
                            when "Minutes" then notice_value.minutes
                            when "Hours" then notice_value.hours
                            when "Days" then notice_value.days
                            else 0
                            end
      
      if @start_time < Time.current + min_notice_duration
        @errors << "Start time is too soon. Minimum notice required is #{notice_value} #{notice_unit.downcase}"
      end

      # Booking Range
      if setting.booking_range_type == "days"
        max_days = setting.booking_range_count || 60
        max_date = host_timezone.now.to_date + max_days.days
        local_start_date = @start_time.in_time_zone(host_timezone).to_date
        
        if local_start_date > max_date
          @errors << "Start time is too far in the future. Bookings are only allowed up to #{max_date}"
        end
      end

      # Daily Limit
      if setting.max_bookings_per_day.present?
        local_date = @start_time.in_time_zone(host_timezone).to_date
        day_start = host_timezone.local(local_date.year, local_date.month, local_date.day).beginning_of_day
        day_end = host_timezone.local(local_date.year, local_date.month, local_date.day).end_of_day
        
        existing_count = @user.events
          .where(status: "scheduled")
          .where.not(id: @current_event_id)
          .where(start_time: day_start..day_end)
          .count
        
        if existing_count >= setting.max_bookings_per_day
          @errors << "Maximum booking limit of #{setting.max_bookings_per_day} events per day has been reached for #{local_date}"
        end
      end
    end

    def check_within_availability
      local_start = @start_time.in_time_zone(host_timezone)
      local_end = @end_time.in_time_zone(host_timezone)

      if local_end.to_date != local_start.to_date
        @errors << "Event must start and end on the same day in your availability timezone"
        return
      end

      intervals = availability_intervals_for(local_start.to_date)
      @debug_info[:available_intervals] = intervals.map { |i| { start: i[:start], end: i[:end] } }

      is_covered = intervals.any? do |interval|
        @start_time >= interval[:start].utc && @end_time <= interval[:end].utc
      end

      unless is_covered
        @errors << "Event time is outside your availability slots"
      end
    end

    def check_conflicts
      setting = @user.user_setting
      new_pre = setting&.buffer_before.to_i
      new_post = setting&.buffer_after.to_i

      # Find all scheduled events that might overlap or whose buffers might overlap
      # Using a wide window for initial fetch
      potential_conflicts = @user.events
        .where(status: "scheduled")
        .where.not(id: @current_event_id)
        .where("start_time < ? AND end_time > ?", @end_time + 12.hours, @start_time - 12.hours)

      conflicts = potential_conflicts.select do |event|
        existing_pre = event.buffer_before_minutes.to_i
        existing_post = event.buffer_after_minutes.to_i

        # Additive Buffer Overlap Formula:
        # A conflict exists if:
        # (NewEvent.start < ExistingEvent.end + ExistingPost + NewPre)
        # AND
        # (NewEvent.end > ExistingEvent.start - ExistingPre - NewPost)
        
        blocked_start = event.start_time - existing_pre.minutes - new_post.minutes
        blocked_end = event.end_time + existing_post.minutes + new_pre.minutes

        @start_time < blocked_end && @end_time > blocked_start
      end

      if conflicts.any?
        # Special case for group events
        if @event_type&.kind_group?
          all_same_slot = conflicts.all? do |e|
            e.event_type_id == @event_type.id &&
            e.start_time == @start_time &&
            e.end_time == @end_time
          end

          if all_same_slot
            current_participants = conflicts.sum { |e| e.event_invitees.count }
            max_p = @event_type.max_participants || 1
            if current_participants >= max_p
              @errors << "This group event has reached its maximum capacity of #{max_p} participants"
            end
            return
          end
        end

        @errors << "This time slot conflicts with an existing event or its required buffer time"
      end
    end

    def availability_intervals_for(date)
      # Check EventType specific availability first
      if @event_type&.availability.is_a?(Hash) && @event_type.availability.present?
        return event_type_availability_intervals_for(date)
      end

      # Fallback to User global schedule
      intervals = user_schedule_intervals_for(date)

      # Apply Overrides
      apply_overrides(date, intervals)
    end

    def event_type_availability_intervals_for(date)
      availability = @event_type.availability
      zone = host_timezone

      if availability["slots"].is_a?(Array)
        return availability["slots"].filter_map do |slot|
          next unless slot["day_of_week"].to_i == date.wday && slot["is_active"] != false
          parse_slot(date, slot["start_time"], slot["end_time"], availability["timezone"] || zone.name)
        end
      end

      day_name = Date::DAYNAMES[date.wday]
      day_slots = availability[day_name] || availability[day_name.to_s] || []
      day_slots.filter_map do |slot|
        parse_slot(date, slot["start"] || slot[:start], slot["end"] || slot[:end], availability["timezone"] || zone.name)
      end
    end

    def user_schedule_intervals_for(date)
      schedules = @user.availability_schedules.where(day_of_week: date.wday, is_active: true)
      schedules.filter_map do |s|
        parse_slot(date, s.start_time.strftime("%H:%M"), s.end_time.strftime("%H:%M"), s.timezone || host_timezone.name)
      end
    end

    def apply_overrides(date, intervals)
      overrides = @user.availability_overrides.where(date: date).order(:start_time)
      return intervals if overrides.empty?

      if overrides.any? { |o| o.is_unavailable && o.start_time.blank? && o.end_time.blank? }
        return []
      end

      res = intervals.map { |i| { start: i[:start], end: i[:end] } }

      overrides.each do |o|
        next if o.start_time.blank? || o.end_time.blank?
        o_interval = parse_slot(date, o.start_time.strftime("%H:%M"), o.end_time.strftime("%H:%M"), o.timezone || host_timezone.name)
        next unless o_interval

        if o.is_unavailable
          res = subtract_interval_set(res, o_interval)
        else
          res << o_interval
          res = merge_intervals(res)
        end
      end
      res
    end

    def parse_slot(date, start_str, end_str, tz_name)
      zone = Time.find_zone(tz_name) || host_timezone
      s = zone.parse("#{date} #{start_str}")
      e = zone.parse("#{date} #{end_str}")
      return nil if s.blank? || e.blank? || e <= s
      { start: s, end: e }
    end

    def host_timezone
      @host_timezone ||= (Time.find_zone(@user.timezone.presence || "UTC") || ActiveSupport::TimeZone["UTC"])
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
  end
end
