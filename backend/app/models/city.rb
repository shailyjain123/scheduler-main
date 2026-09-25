# frozen_string_literal: true

class City < ApplicationRecord
  # ─── Validations ────────────────────────────────────────────────────────────
  validates :name,         presence: true
  validates :country,      presence: true
  validates :country_code, presence: true, length: { is: 2 }
  validates :timezone,     presence: true

  # ─── Timezone abbreviation mapping ─────────────────────────────────────────
  # Common abbreviations → IANA timezone IDs.
  # Some abbreviations are ambiguous (e.g. IST = India/Israel/Ireland).
  TIMEZONE_ABBREVIATIONS = {
    "IST"  => [ "Asia/Kolkata", "Asia/Jerusalem", "Europe/Dublin" ],
    "PST"  => [ "America/Los_Angeles", "America/Vancouver" ],
    "PDT"  => [ "America/Los_Angeles", "America/Vancouver" ],
    "EST"  => [ "America/New_York", "America/Toronto" ],
    "EDT"  => [ "America/New_York", "America/Toronto" ],
    "CST"  => [ "America/Chicago", "Asia/Shanghai", "America/Mexico_City" ],
    "CDT"  => [ "America/Chicago" ],
    "MST"  => [ "America/Denver", "America/Phoenix" ],
    "MDT"  => [ "America/Denver" ],
    "GMT"  => [ "Europe/London" ],
    "BST"  => [ "Europe/London" ],
    "CET"  => [ "Europe/Paris", "Europe/Berlin", "Europe/Rome", "Europe/Madrid" ],
    "CEST" => [ "Europe/Paris", "Europe/Berlin", "Europe/Rome", "Europe/Madrid" ],
    "EET"  => [ "Europe/Athens", "Europe/Bucharest", "Europe/Helsinki" ],
    "EEST" => [ "Europe/Athens", "Europe/Bucharest", "Europe/Helsinki" ],
    "JST"  => [ "Asia/Tokyo" ],
    "KST"  => [ "Asia/Seoul" ],
    "SGT"  => [ "Asia/Singapore" ],
    "HKT"  => [ "Asia/Hong_Kong" ],
    "CST_CHINA" => [ "Asia/Shanghai" ],
    "AEST" => [ "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane" ],
    "AEDT" => [ "Australia/Sydney", "Australia/Melbourne" ],
    "AWST" => [ "Australia/Perth" ],
    "ACST" => [ "Australia/Adelaide" ],
    "NZST" => [ "Pacific/Auckland" ],
    "NZDT" => [ "Pacific/Auckland" ],
    "ICT"  => [ "Asia/Bangkok", "Asia/Ho_Chi_Minh" ],
    "WIB"  => [ "Asia/Jakarta" ],
    "GST"  => [ "Asia/Dubai" ],
    "PKT"  => [ "Asia/Karachi" ],
    "EAT"  => [ "Africa/Nairobi" ],
    "WAT"  => [ "Africa/Lagos" ],
    "CAT"  => [ "Africa/Johannesburg", "Africa/Harare" ],
    "SAST" => [ "Africa/Johannesburg" ],
    "ART"  => [ "America/Argentina/Buenos_Aires" ],
    "BRT"  => [ "America/Sao_Paulo" ],
    "AST"  => [ "America/Halifax", "America/Puerto_Rico" ],
    "NST"  => [ "America/St_Johns" ],
    "AKST" => [ "America/Anchorage" ],
    "AKDT" => [ "America/Anchorage" ],
    "HST"  => [ "Pacific/Honolulu" ],
    "SST"  => [ "Pacific/Pago_Pago" ],
    "MSK"  => [ "Europe/Moscow" ],
    "TRT"  => [ "Europe/Istanbul" ],
    "PHT"  => [ "Asia/Manila" ],
    "MYT"  => [ "Asia/Kuala_Lumpur" ],
    "NPT"  => [ "Asia/Kathmandu" ],
    "MMT"  => [ "Asia/Yangon" ]
  }.freeze

  # ─── Search ─────────────────────────────────────────────────────────────────

  # Main search method used by the API controller.
  # Applies ranked matching and returns deduplicated, population-sorted results.
  def self.search(query, limit: 20)
    q = query.to_s.strip
    return none if q.length < 2

    sanitized = sanitize_sql_like(q)
    results = []

    # 1. Exact city name match (rank 1)
    results += where("LOWER(name) = LOWER(?)", q)
                 .order(population: :desc)
                 .limit(limit)
                 .map { |c| { city: c, rank: 1 } }

    # 2. Prefix city name match (rank 2)
    results += where("LOWER(name) LIKE LOWER(?)", "#{sanitized}%")
                 .where.not("LOWER(name) = LOWER(?)", q)
                 .order(population: :desc)
                 .limit(limit)
                 .map { |c| { city: c, rank: 2 } }

    # 3. Partial city name match (rank 3)
    results += where("LOWER(name) LIKE LOWER(?)", "%#{sanitized}%")
                 .where.not("LOWER(name) LIKE LOWER(?)", "#{sanitized}%")
                 .order(population: :desc)
                 .limit(limit)
                 .map { |c| { city: c, rank: 3 } }

    # 4. Alternate names match (rank 4)
    results += where("LOWER(alternate_names) LIKE LOWER(?)", "%#{sanitized}%")
                 .where.not("LOWER(name) LIKE LOWER(?)", "%#{sanitized}%")
                 .order(population: :desc)
                 .limit(limit)
                 .map { |c| { city: c, rank: 4 } }

    # 5. Country name match (rank 5)
    results += where("LOWER(country) LIKE LOWER(?)", "%#{sanitized}%")
                 .where.not("LOWER(name) LIKE LOWER(?)", "%#{sanitized}%")
                 .where.not("LOWER(alternate_names) LIKE LOWER(?)", "%#{sanitized}%")
                 .order(population: :desc)
                 .limit(limit)
                 .map { |c| { city: c, rank: 5 } }

    # 6. Timezone abbreviation match (rank 6)
    iana_ids = TIMEZONE_ABBREVIATIONS[q.upcase]
    if iana_ids.present?
      already_found_ids = results.map { |r| r[:city].id }
      results += where(timezone: iana_ids)
                   .where.not(id: already_found_ids)
                   .order(population: :desc)
                   .limit(limit)
                   .map { |c| { city: c, rank: 6 } }
    end

    # Deduplicate by city ID, keeping highest rank (lowest number)
    seen = {}
    results.each do |r|
      city_id = r[:city].id
      if !seen[city_id] || r[:rank] < seen[city_id][:rank]
        seen[city_id] = r
      end
    end

    # Sort: by rank ASC, then population DESC
    seen.values
        .sort_by { |r| [ r[:rank], -r[:city].population ] }
        .first(limit)
        .map { |r| r[:city] }
  end

  # ─── Timezone computation ───────────────────────────────────────────────────

  # Compute timezone abbreviation and UTC offset for this city.
  # Uses Ruby's TZInfo (built into Rails).
  def timezone_info
    tz = TZInfo::Timezone.get(timezone)
    now = tz.now
    {
      timezone_abbr: now.strftime("%Z"),
      utc_offset: now.strftime("%:z")
    }
  rescue TZInfo::InvalidTimezoneIdentifier
    { timezone_abbr: "", utc_offset: "+00:00" }
  end
end
