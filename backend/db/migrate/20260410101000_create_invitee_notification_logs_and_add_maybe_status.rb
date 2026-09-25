class CreateInviteeNotificationLogsAndAddMaybeStatus < ActiveRecord::Migration[8.1]
  def change
    create_table :invitee_notification_logs do |t|
      t.references :event, null: false, foreign_key: true
      t.references :event_invitee, null: true, foreign_key: true
      t.string :action, null: false
      t.string :delivery_status, null: false
      t.string :recipient_email, null: false
      t.string :mailer_message_id
      t.text :error_message
      t.jsonb :change_summary, null: false, default: {}
      t.datetime :sent_at

      t.timestamps
    end

    add_index :invitee_notification_logs, [ :event_id, :created_at ]
    add_index :invitee_notification_logs, [ :event_invitee_id, :created_at ]

    remove_check_constraint :event_invitees, name: "event_invitees_status_check"
    add_check_constraint :event_invitees,
                         "status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'maybe'::character varying]::text[])",
                         name: "event_invitees_status_check"
  end
end
