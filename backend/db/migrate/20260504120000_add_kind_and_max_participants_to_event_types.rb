class AddKindAndMaxParticipantsToEventTypes < ActiveRecord::Migration[8.1]
  def change
    add_column :event_types, :kind, :integer, default: 0, null: false
    add_column :event_types, :max_participants, :integer, default: 1, null: false
  end
end
