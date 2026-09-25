class AddTrigramIndexToAlternateNames < ActiveRecord::Migration[8.1]
  def change
    add_index :cities, :alternate_names, using: :gin, opclass: :gin_trgm_ops, name: "index_cities_on_alternate_names_trgm"
  end
end
