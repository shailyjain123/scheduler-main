module Api
  module V1
    module Availability
      class AvailabilitySchedulesController < BaseController
        def index
          schedules = current_user.availability_schedules.order(:day_of_week, :start_time)
          render json: {
            success: true,
            data: schedules.map { |schedule| AvailabilityScheduleSerializer.new(schedule).as_json }
          }, status: :ok
        end

        def create
          schedule = current_user.availability_schedules.new(schedule_params)

          if schedule.save
            render json: {
              success: true,
              data: AvailabilityScheduleSerializer.new(schedule).as_json
            }, status: :created
          else
            render json: {
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: "Failed to create availability schedule",
                details: schedule.errors.to_hash(true)
              }
            }, status: :unprocessable_entity
          end
        end

        def update
          schedule = current_user.availability_schedules.find(params[:id])

          if schedule.update(schedule_params)
            render json: {
              success: true,
              data: AvailabilityScheduleSerializer.new(schedule).as_json
            }, status: :ok
          else
            render json: {
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: "Failed to update availability schedule",
                details: schedule.errors.to_hash(true)
              }
            }, status: :unprocessable_entity
          end
        end

        def destroy
          schedule = current_user.availability_schedules.find(params[:id])
          schedule.destroy
          head :no_content
        end

        def slots
          date = parse_date_param(params[:date])
          timezone = resolve_timezone(params[:timezone])
          duration_minutes = resolve_duration_minutes(params[:duration])

          slots = compute_slots(date:, timezone:, duration_minutes:)

          render json: {
            success: true,
            data: {
              date: date.iso8601,
              timezone: timezone,
              duration_minutes: duration_minutes,
              slots: slots
            }
          }, status: :ok
        rescue ArgumentError => e
          render json: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: e.message
            }
          }, status: :unprocessable_entity
        end

        private

        def schedule_params
          params.require(:schedule).permit(:day_of_week, :start_time, :end_time, :is_active, :timezone)
        end

        def parse_date_param(raw_date)
          raise ArgumentError, "date is required" if raw_date.blank?

          Date.iso8601(raw_date)
        rescue Date::Error
          raise ArgumentError, "date must be a valid ISO date (YYYY-MM-DD)"
        end

        def resolve_timezone(raw_timezone)
          timezone = raw_timezone.presence || current_user.timezone.presence || "UTC"
          ActiveSupport::TimeZone[timezone] || (raise ArgumentError, "timezone is invalid")
          timezone
        end

        def resolve_duration_minutes(raw_duration)
          duration = raw_duration.present? ? raw_duration.to_i : (current_user.default_meeting_duration || 30)
          raise ArgumentError, "duration must be greater than 0" if duration <= 0

          duration
        end

        def compute_slots(date:, timezone:, duration_minutes:)
          zone = ActiveSupport::TimeZone[timezone]
          day_of_week = date.wday

          schedule_blocks = current_user.availability_schedules
            .active
            .where(day_of_week: day_of_week)
            .order(:start_time)

          intervals = schedule_blocks.map do |block|
            # Use the stored block timezone for parsing, then convert to the requested preview zone
            block_zone = ActiveSupport::TimeZone[block.timezone || zone.name]
            interval_for(date, raw_hhmm(block, :start_time), raw_hhmm(block, :end_time), block_zone, zone)
          end

          override_blocks = current_user.availability_overrides
            .where(date: date)
            .order(:start_time)

          if override_blocks.any? { |override| override.is_unavailable && override.start_time.blank? && override.end_time.blank? }
            return []
          end

          override_blocks.each do |override|
            next if override.start_time.blank? || override.end_time.blank?

            # Use the stored override timezone for parsing, then convert to the requested preview zone
            override_zone = ActiveSupport::TimeZone[override.timezone || zone.name]
            override_interval = interval_for(date, raw_hhmm(override, :start_time), raw_hhmm(override, :end_time), override_zone, zone)

            if override.is_unavailable
              intervals = subtract_interval_set(intervals, override_interval)
            else
              intervals << override_interval
              intervals = merge_intervals(intervals)
            end
          end

          intervals = merge_intervals(intervals)

          now = zone.now
          slots = []

          intervals.each do |interval|
            cursor = interval[:start]
            while (cursor + duration_minutes.minutes) <= interval[:end]
              slot_end = cursor + duration_minutes.minutes
              if slot_end > now
                slots << {
                  start_time: cursor.iso8601,
                  end_time: slot_end.iso8601
                }
              end
              cursor += duration_minutes.minutes
            end
          end

          slots
        end

        def interval_for(date, start_hhmm, end_hhmm, origin_zone, target_zone = origin_zone)
          start_time = origin_zone.parse("#{date} #{start_hhmm}").in_time_zone(target_zone)
          end_time = origin_zone.parse("#{date} #{end_hhmm}").in_time_zone(target_zone)
          { start: start_time, end: end_time }
        end

        def raw_hhmm(record, column)
          raw = record.read_attribute_before_type_cast(column).to_s.strip
          return raw[0, 5] if raw.match?(/\A\d{2}:\d{2}/)

          record.public_send(column)&.strftime("%H:%M")
        end

        def subtract_interval_set(intervals, blocked)
          intervals.flat_map { |interval| subtract_interval(interval, blocked) }
        end

        def subtract_interval(interval, blocked)
          interval_start = interval[:start]
          interval_end = interval[:end]
          blocked_start = blocked[:start]
          blocked_end = blocked[:end]

          return [ interval ] if blocked_end <= interval_start || blocked_start >= interval_end

          parts = []
          if blocked_start > interval_start
            parts << { start: interval_start, end: blocked_start }
          end
          if blocked_end < interval_end
            parts << { start: blocked_end, end: interval_end }
          end

          parts
        end

        def merge_intervals(intervals)
          return [] if intervals.empty?

          sorted = intervals.sort_by { |interval| interval[:start] }
          merged = [ sorted.first.dup ]

          sorted.drop(1).each do |interval|
            last = merged.last
            if interval[:start] <= last[:end]
              last[:end] = [ last[:end], interval[:end] ].max
            else
              merged << interval.dup
            end
          end

          merged
        end
      end
    end
  end
end
