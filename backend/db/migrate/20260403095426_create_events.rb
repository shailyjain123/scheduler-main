class CreateEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :events do |t|
      t.references :user, null: false, foreign_key: true
      t.references :event_type, null: false, foreign_key: true
      t.string :title
      t.text :description
      t.string :location
      t.datetime :start_time
      t.datetime :end_time
      t.string :status
      t.jsonb :metadata

      t.timestamps
    end
  end
end
