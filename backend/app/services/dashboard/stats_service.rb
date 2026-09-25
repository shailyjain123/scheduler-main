module Dashboard
  class StatsService
    def initialize(user:, from: nil, to: nil)
      @user = user
      @from = from
      @to = to
    end

    def call
      # Fetch events where the user is either the host or a participant
      events_relation = Event.where("events.user_id = :user_id OR EXISTS (SELECT 1 FROM event_invitees WHERE event_invitees.event_id = events.id AND event_invitees.user_id = :user_id)", user_id: @user.id)

      if @from.present?
        from_time = Time.iso8601(@from.to_s) rescue nil
        events_relation = events_relation.where("start_time >= ?", from_time) if from_time
      end

      if @to.present?
        to_time = Time.iso8601(@to.to_s) rescue nil
        events_relation = events_relation.where("start_time <= ?", to_time) if to_time
      end

      events = events_relation.to_a
      invitee_counts = EventInvitee.where(event_id: events.map(&:id)).group(:event_id).count

      # Calculate metrics based on total participants (invitees)
      # This ensures group meetings are counted by the number of people attending
      total_count = invitee_counts.values.sum
      accepted_count = events.sum { |event| event.status == "completed" ? invitee_counts[event.id].to_i : 0 }
      rejected_count = events.sum { |event| [ "cancelled", "no-shows" ].include?(event.status) ? invitee_counts[event.id].to_i : 0 }

      # Calculate conversion rate: percentage of accepted calls out of total calls
      conversion_rate = if total_count > 0
                          (accepted_count.to_f / total_count * 100).round(1)
      else
                          0
      end

      # Calculate no-show rate: percentage of cancelled or missed calls out of total calls
      no_show_rate = if total_count > 0
                       (rejected_count.to_f / total_count * 100).round(1)
      else
                       0
      end

      # Calculate upcoming participants: sum of invitees for scheduled events in the future
      upcoming_count = events.sum do |event|
        event.status == "scheduled" && event.start_time > Time.current ? invitee_counts[event.id].to_i : 0
      end

      {
        totalBookings: total_count,
        conversionRate: conversion_rate,
        noShowRate: no_show_rate,
        revenue: 0,        # Placeholder until payment integration
        upcomingCalls: upcoming_count,
        appointmentsOverview: build_overview(events, invitee_counts),
        appointmentsByStatus: build_status_distribution(events)
      }
    end

    private

    def build_overview(events, invitee_counts)
      # Group by date and calculate status counts per day
      grouped = events.group_by { |e| e.start_time.to_date }

      # We need to ensure we return an ordered array of dates.
      # If from/to are present, we can generate a date range, otherwise just use the dates with events.
      if @from.present?
        start_date = (Time.iso8601(@from.to_s) rescue 7.days.ago).to_date
        dates = grouped.keys.compact.sort
        end_date = dates.any? ? [ dates.last, Date.today ].max : Date.today

        if @to.present?
          end_date = (Time.iso8601(@to.to_s) rescue Date.today).to_date
        end

        date_range = start_date..end_date
      else
        dates = grouped.keys.compact.sort
        date_range = dates.any? ? (dates.first..dates.last) : []
      end

      date_range.map do |date|
        day_events = grouped[date] || []
        {
          date: date.strftime("%Y-%m-%d"),
          scheduled: day_events.sum { |event| event.status == "scheduled" ? invitee_counts[event.id].to_i : 0 },
          completed: day_events.sum { |event| event.status == "completed" ? invitee_counts[event.id].to_i : 0 },
          cancelled: day_events.sum { |event| event.status == "cancelled" ? invitee_counts[event.id].to_i : 0 },
          no_shows: day_events.sum { |event| event.status == "no-shows" ? invitee_counts[event.id].to_i : 0 }
        }
      end
    end

    def build_status_distribution(events)
      status_counts = events.each_with_object(Hash.new(0)) { |event, counts| counts[event.status] += 1 }
      [
        { name: "Scheduled", value: status_counts["scheduled"] || 0 },
        { name: "Completed", value: status_counts["completed"] || 0 },
        { name: "Cancelled", value: status_counts["cancelled"] || 0 },
        { name: "No-shows", value: status_counts["no-shows"] || 0 }
      ]
    end
  end
end
