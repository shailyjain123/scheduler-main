class CreateEventTypes < ActiveRecord::Migration[8.1]
  def change
    create_table :event_types do |t|
      t.references :user, null: false, foreign_key: true
      t.string :title
      t.integer :duration
      t.string :location
      t.text :description
      t.string :color

      t.timestamps
    end
  end
end
