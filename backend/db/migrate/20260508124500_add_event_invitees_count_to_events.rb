class AddEventInviteesCountToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :event_invitees_count, :integer, default: 0, null: false

    # Initialize counter cache for existing events
    up_only do
      Event.reset_column_information
      Event.find_each do |event|
        Event.reset_counters(event.id, :event_invitees)
      end
    end
  end
end
