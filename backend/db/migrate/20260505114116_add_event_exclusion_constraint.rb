class AddEventExclusionConstraint < ActiveRecord::Migration[8.1]
  def up
    execute <<-SQL
      ALTER TABLE events ADD CONSTRAINT no_overlapping_user_events
      EXCLUDE USING gist (
        user_id WITH =,
        tsrange(
          start_time - (buffer_before_minutes * interval '1 minute'),
          end_time   + (buffer_after_minutes * interval '1 minute'),
          '[)'
        ) WITH &&
      )
      WHERE (status = 'scheduled');
    SQL
  end

  def down
    execute "ALTER TABLE events DROP CONSTRAINT no_overlapping_user_events;"
  end
end
