# frozen_string_literal: true

module Api
  module V1
    class CitiesController < ApplicationController
      # Public endpoint for city/timezone search
      # GET /api/v1/cities/search?q=...
      def search
        q = params[:q].to_s.strip.downcase
        if q.length < 2
          return render json: {
            success: true,
            data: { timezone_groups: [], cities: [] }
          }
        end

        render json: {
          success: true,
          data: {
            timezone_groups: search_timezone_groups(q),
            cities: search_cities(q)
          }
        }
      end

      private

      def search_timezone_groups(q)
        matches = TIMEZONE_GROUPS.select do |tz|
          tz[:keywords].any? { |kw| kw.include?(q) || q.include?(kw) }
        end

        matches.map do |tz|
          begin
            tz_obj = TZInfo::Timezone.get(tz[:iana])
            now = tz_obj.now
            current_time = now.strftime("%I:%M%P").downcase.gsub(/^0/, "")
            utc_offset = now.strftime("%:z")
          rescue TZInfo::InvalidTimezoneIdentifier, TZInfo::AmbiguousTimezone, TZInfo::PeriodNotFound
            current_time = Time.now.utc.strftime("%I:%M%P").downcase.gsub(/^0/, "")
            utc_offset = "+00:00"
          end

          {
            type: "timezone_group",
            display_name: tz[:display_name],
            abbreviations: tz[:abbreviations],
            label: "#{tz[:display_name]}, #{tz[:abbreviations].join(' / ')}",
            iana: tz[:iana],
            utc_offset: utc_offset,
            current_time: current_time
          }
        end
      end

      def search_cities(q)
        # Use the ranking logic from City model search, but return serialized data
        results = City.search(q, limit: 20)

        results.map do |city|
          begin
            tz_info = city.timezone_info
            tz_obj = TZInfo::Timezone.get(city.timezone)
            now = tz_obj.now
            current_time = now.strftime("%I:%M%P").downcase.gsub(/^0/, "")
          rescue TZInfo::InvalidTimezoneIdentifier, TZInfo::AmbiguousTimezone, TZInfo::PeriodNotFound
            tz_info = { timezone_abbr: "UTC", utc_offset: "+00:00" }
            current_time = Time.now.utc.strftime("%I:%M%P").downcase.gsub(/^0/, "")
          end

          {
            type: "city",
            id: city.id,
            city: city.name,
            country: city.country,
            country_code: city.country_code,
            timezone: city.timezone,
            timezone_abbr: tz_info[:timezone_abbr],
            utc_offset: tz_info[:utc_offset],
            current_time: current_time
          }
        end
      end
    end
  end
end
