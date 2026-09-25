class CreateContacts < ActiveRecord::Migration[8.1]
  def change
    create_table :contacts do |t|
      t.string :first_name
      t.string :last_name
      t.string :email
      t.string :phone
      t.string :status
      t.string :type_category
      t.text :notes
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end
