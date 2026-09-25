class CreateCities < ActiveRecord::Migration[8.1]
  def change
    # Enable trigram extension for fuzzy search (optional enhancement)
    enable_extension "pg_trgm"

    create_table :cities do |t|
      t.string   :name,           null: false
      t.string   :country,        null: false
      t.string   :country_code,   null: false, limit: 2
      t.string   :timezone,       null: false   # IANA format e.g. "Asia/Kolkata"
      t.float    :latitude
      t.float    :longitude
      t.integer  :population,     default: 0
      t.text     :alternate_names               # stored as comma-separated string
      t.timestamps
    end

    add_index :cities, :name
    add_index :cities, :country_code
    add_index :cities, :timezone
    add_index :cities, :population
    # Trigram index for fast LIKE/ILIKE queries on city name
    add_index :cities, :name, using: :gin, opclass: :gin_trgm_ops, name: "index_cities_on_name_trgm"
  end
end
