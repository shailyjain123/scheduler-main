class CreateEventInvitees < ActiveRecord::Migration[8.1]
  def change
    create_table :event_invitees do |t|
      t.references :event, null: false, foreign_key: true, index: true
      t.references :user, null: true, foreign_key: true
      t.string :email, null: false
      t.string :name
      t.string :status, null: false, default: "pending"
      t.string :token, null: false
      t.datetime :notified_at
      t.datetime :responded_at

      t.timestamps
    end

    add_index :event_invitees, :email
    add_index :event_invitees, :token, unique: true
    add_index :event_invitees, [ :event_id, :email ], unique: true

    add_check_constraint :event_invitees,
      "status IN ('pending', 'accepted', 'declined')",
      name: "event_invitees_status_check"
  end
end
