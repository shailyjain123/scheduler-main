class CreateNotifications < ActiveRecord::Migration[8.1]
  def change
    create_table :notifications do |t|
      t.references :user, null: false, foreign_key: true
      t.string :notification_type
      t.string :title
      t.text :description
      t.datetime :read_at
      t.jsonb :metadata
      t.string :priority
      t.string :action_url

      t.timestamps
    end
  end
end
