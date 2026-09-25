# app/services/bookings/availability_service.rb
module Bookings
  class AvailabilityService
    def self.blocked_ranges(user_id)
      # We union events the user owns and events they are invited to
      # We also select the event's specific buffers
      sql = <<-SQL
        SELECT 
          start_time, 
          end_time, 
          COALESCE(buffer_before_minutes, 0) as buffer_before,
          COALESCE(buffer_after_minutes, 0) as buffer_after
        FROM events
        WHERE (user_id = $1 OR EXISTS (
          SELECT 1 FROM event_invitees 
          WHERE event_invitees.event_id = events.id 
          AND event_invitees.user_id = $1
        ))
        AND status = 'scheduled'
      SQL
      
      result = ActiveRecord::Base.connection.exec_query(sql, "Availability Lookup", [user_id])
      
      result.map do |row| 
        { 
          start: row['start_time'], 
          end: row['end_time'],
          buffer_before: row['buffer_before'].to_i,
          buffer_after: row['buffer_after'].to_i
        }
      end
    end
  end
end
