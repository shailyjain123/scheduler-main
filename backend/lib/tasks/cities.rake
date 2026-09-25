# frozen_string_literal: true

# Rake task to import cities from GeoNames cities500.txt dataset.
#
# Usage:
#   rails cities:import              — Download and import ~200K cities
#   rails cities:import[10000]       — Import only cities with population >= 10000
#
# Data source: https://download.geonames.org/export/dump/cities500.zip
# License: Creative Commons Attribution 4.0
#
# GeoNames cities500.txt TSV format (tab-delimited):
#   0  geonameid
#   1  name
#   2  asciiname
#   3  alternatenames (comma-separated)
#   4  latitude
#   5  longitude
#   6  feature class
#   7  feature code
#   8  country code
#   9  cc2
#  10  admin1 code
#  11  admin2 code
#  12  admin3 code
#  13  admin4 code
#  14  population
#  15  elevation
#  16  dem
#  17  timezone
#  18  modification date

namespace :cities do
  desc "Import cities from GeoNames cities500.txt dataset"
  task :import, [ :min_population ] => :environment do |_t, args|
    require "open-uri"
    require "zip"

    min_pop = (args[:min_population] || 500).to_i
    zip_url = "https://download.geonames.org/export/dump/cities500.zip"
    country_info_url = "https://download.geonames.org/export/dump/countryInfo.txt"
    tmp_dir = Rails.root.join("tmp", "geonames")
    FileUtils.mkdir_p(tmp_dir)

    # ─── Step 1: Country Mapping (using countries gem) ──────────
    puts "🌍 Loading country info via ISO3166..."
    # No need to pre-load a map, we'll use ISO3166::Country[code] in the loop


    # ─── Step 2: Download cities500.zip ──────────────────────────────────
    zip_path = tmp_dir.join("cities500.zip")
    txt_path = tmp_dir.join("cities500.txt")

    unless File.exist?(txt_path) && File.size(txt_path) > 1_000_000
      puts "📥 Downloading cities500.zip..."
      URI.open(zip_url) do |remote|
        File.open(zip_path, "wb") { |f| f.write(remote.read) }
      end

      puts "📦 Extracting..."
      Zip::File.open(zip_path.to_s) do |zf|
        zf.each do |entry|
          if entry.name == "cities500.txt"
            File.open(txt_path.to_s, "wb") do |out|
              out.write(entry.get_input_stream.read)
            end
            break
          end
        end
      end
    end

    unless File.exist?(txt_path)
      puts "❌ cities500.txt not found after extraction"
      exit 1
    end

    # ─── Step 3: Parse and import ────────────────────────────────────────
    puts "🔄 Parsing cities500.txt (min population: #{min_pop})..."

    # Clear existing data
    City.delete_all
    puts "   🗑️  Cleared existing cities"

    batch = []
    batch_size = 5000
    total_imported = 0
    total_skipped = 0
    now = Time.current

    File.foreach(txt_path, encoding: "UTF-8") do |line|
      fields = line.strip.split("\t")
      next if fields.length < 18

      population = fields[14].to_i
      next if population < min_pop

      timezone = fields[17].to_s.strip
      next if timezone.empty?

      name = fields[1].to_s.strip
      next if name.empty?

      country_code = fields[8].to_s.strip.upcase
      next if country_code.empty?

      country_name = ISO3166::Country[country_code]&.common_name || country_code

      # Truncate alternate names to avoid bloating the DB
      alt_names = fields[3].to_s.strip
      alt_names = alt_names[0..2000] if alt_names.length > 2000

      batch << {
        name: name,
        country: country_name,
        country_code: country_code,
        timezone: timezone,
        latitude: fields[4].to_f,
        longitude: fields[5].to_f,
        population: population,
        alternate_names: alt_names.presence,
        created_at: now,
        updated_at: now
      }

      if batch.size >= batch_size
        City.insert_all(batch)
        total_imported += batch.size
        print "\r   ✅ Imported #{total_imported} cities..."
        batch.clear
      end
    end

    # Insert remaining batch
    if batch.any?
      City.insert_all(batch)
      total_imported += batch.size
    end

    puts "\n\n✅ Import complete!"
    puts "   📊 Total cities imported: #{total_imported}"
    puts "   📊 Total in database: #{City.count}"
    puts "   📊 Top 10 cities by population:"
    City.order(population: :desc).limit(10).each do |city|
      puts "      #{city.name}, #{city.country} — pop: #{city.population.to_s.reverse.gsub(/(\d{3})(?=\d)/, '\\1,').reverse}"
    end

    # Cleanup
    FileUtils.rm_f(zip_path)
    puts "\n🧹 Cleaned up temp files"
  end
end
