class CreateContactNotes < ActiveRecord::Migration[8.1]
  def change
    create_table :contact_notes do |t|
      t.references :contact, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.text :content, null: false

      t.timestamps
    end

    add_index :contact_notes, :created_at
  end
end
