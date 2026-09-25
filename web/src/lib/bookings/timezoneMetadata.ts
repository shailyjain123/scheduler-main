/**
 * Professional timezone metadata system using @vvo/tzdb
 * Provides intelligent search, abbreviations, aliases, and current local time
 * Powered by established timezone databases and libraries
 */

import { getTimeZones } from '@vvo/tzdb';
import { DateTime } from 'luxon';

/**
 * Enhanced timezone metadata structure powered by tzdb
 */
export type EnhancedTimezoneMetadata = {
  id: string; // IANA timezone ID (e.g., 'Asia/Kolkata')
  displayName: string; // User-friendly name (e.g., 'Indian Standard Time (IST)')
  abbreviations: string[]; // Standard abbreviations (EST, EDT, etc.)
  utcOffset: string; // Current UTC offset (e.g., '+05:30')
  utcOffsetInMinutes: number; // Offset in minutes for sorting
  cities: string[]; // Major cities using this timezone
  country?: string; // Country or region
  countryCode?: string; // ISO country code
  aliases: string[]; // Alternative names users might search for
  keywords: string[]; // Searchable keywords
  region: string; // Continent name (e.g., 'Asia')
  currentLocalTime: string; // Current time in this timezone (e.g., '14:30')
};

/**
 * Common timezone aliases for search (legacy names, abbreviations, etc.)
 */
const TIMEZONE_ALIASES: Record<string, string[]> = {
  'Asia/Kolkata': ['New Delhi', 'Delhi', 'Calcutta', 'Bombay', 'Mumbai', 'Indian Standard Time', 'IST'],
  'America/New_York': ['Eastern Time', 'East Coast', 'EST', 'EDT'],
  'America/Chicago': ['Central Time', 'CST', 'CDT'],
  'America/Denver': ['Mountain Time', 'MST', 'MDT'],
  'America/Los_Angeles': ['Pacific Time', 'West Coast', 'PST', 'PDT'],
  'America/Toronto': ['Toronto', 'Eastern Time Canada', 'EST', 'EDT'],
  'Europe/London': ['GMT', 'British Time', 'BST'],
  'Europe/Paris': ['CET', 'Central European Time', 'CEST'],
  'Europe/Berlin': ['CET', 'Central European Time', 'CEST'],
  'Europe/Amsterdam': ['CET', 'Central European Time', 'CEST'],
  'Asia/Tokyo': ['Japan Standard Time', 'JST'],
  'Asia/Shanghai': ['Beijing', 'China Standard Time', 'CST'],
  'Asia/Singapore': ['Singapore Standard Time', 'SGT'],
  'Asia/Hong_Kong': ['Hong Kong Standard Time', 'HKT'],
  'Asia/Dubai': ['Dubai', 'UAE', 'GST'],
  'Asia/Bangkok': ['Bangkok', 'ICT'],
  'Australia/Sydney': ['Australian Eastern Time', 'AEST', 'AEDT'],
  'Australia/Melbourne': ['Australian Eastern Time', 'AEST', 'AEDT'],
  'Australia/Perth': ['Australian Western Standard Time', 'AWST'],
  'Australia/Brisbane': ['Australian Eastern Standard Time', 'AEST'],
  'Pacific/Auckland': ['New Zealand Standard Time', 'NZST', 'NZDT'],
  'UTC': ['Coordinated Universal Time', 'Zulu'],
};

/**
 * Preferred display city per timezone to align with common user expectation
 */
const PREFERRED_DISPLAY_CITY: Record<string, string> = {
  'Asia/Kolkata': 'New Delhi',
  'America/New_York': 'New York',
  'America/Los_Angeles': 'Los Angeles',
  'America/Chicago': 'Chicago',
  'Europe/London': 'London',
  'Europe/Paris': 'Paris',
  'Asia/Tokyo': 'Tokyo',
  'Asia/Shanghai': 'Shanghai',
  'Australia/Sydney': 'Sydney',
};

/**
 * Map of country names and aliases to timezone IDs
 */
const COUNTRY_ALIASES: Record<string, string[]> = {
  'India': ['Asia/Kolkata'],
  'UK': ['Europe/London', 'Europe/Dublin'],
  'United Kingdom': ['Europe/London', 'Europe/Dublin'],
  'England': ['Europe/London'],
  'Scotland': ['Europe/London'],
  'Ireland': ['Europe/Dublin'],
  'USA': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'],
  'United States': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'],
  'Canada': ['America/Toronto', 'America/Vancouver', 'America/Calgary', 'America/Edmonton'],
  'France': ['Europe/Paris'],
  'Germany': ['Europe/Berlin'],
  'Japan': ['Asia/Tokyo'],
  'China': ['Asia/Shanghai'],
  'Australia': ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth', 'Australia/Brisbane'],
  'New Zealand': ['Pacific/Auckland'],
  'Singapore': ['Asia/Singapore'],
  'Thailand': ['Asia/Bangkok'],
  'Dubai': ['Asia/Dubai'],
  'UAE': ['Asia/Dubai'],
};

/**
 * Global cache for timezone metadata to avoid rebuilding
 */
let cachedMetadata: EnhancedTimezoneMetadata[] | null = null;

/**
 * Build comprehensive timezone metadata from @vvo/tzdb library
 * Uses pre-computed timezone data with rich metadata (cities, countries, offsets)
 */
export const buildEnhancedTimezoneMetadata = (): EnhancedTimezoneMetadata[] => {
  // Return cached metadata if available
  if (cachedMetadata) {
    return cachedMetadata;
  }

  const metadata: EnhancedTimezoneMetadata[] = [];
  const now = DateTime.now();

  // Get all timezones with rich metadata from tzdb
  const allTimezones = getTimeZones();

  // Process each timezone
  allTimezones.forEach((tzData) => {
    try {
      const tz = tzData.name;
      
      // Get country and region info from tzdb
      const country = tzData.countryName || 'UTC';
      const countryCode = tzData.countryCode;
      const region = tzData.continentName || tzData.continentCode || 'UTC';

      // Current timezone offset (use tzdb's pre-calculated value)
      const offsetMinutes = tzData.currentTimeOffsetInMinutes;
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
      const offsetMins = Math.abs(offsetMinutes) % 60;
      const sign = offsetMinutes >= 0 ? '+' : '-';
      const offsetStr = `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

      // Get abbreviation from tzdb
      const abbr = tzData.abbreviation || '';

      // Cities from tzdb mainCities plus curated aliases
      const cities = tzData.mainCities || [];

      // Build aliases - include alternativeName and custom mappings
      const aliases: string[] = [];
      if (tzData.alternativeName) {
        aliases.push(tzData.alternativeName.toLowerCase());
      }
      // Add custom aliases for well-known cities
      if (TIMEZONE_ALIASES[tz]) {
        aliases.push(...TIMEZONE_ALIASES[tz].map((alias) => alias.toLowerCase()));
      }

      // Merge city names with curated aliases and preferred display city
      const preferredCity = PREFERRED_DISPLAY_CITY[tz];
      const allCityNames = Array.from(
        new Set([
          ...(preferredCity ? [preferredCity] : []),
          ...cities,
          ...(TIMEZONE_ALIASES[tz] || []),
        ])
      );

      // Calculate current local time using Luxon
      const zonedTime = now.setZone(tz);
      const currentTime = zonedTime.toFormat('h:mma').toLowerCase();

      // Build searchable keywords
      const keywords: string[] = [];
      
      // Add IANA ID parts
      const parts = tz.split('/');
      keywords.push(tz.toLowerCase());
      if (parts[0]) keywords.push(parts[0].toLowerCase());
      if (parts[1]) keywords.push(parts[1].toLowerCase().replace(/_/g, ' '));
      
      // Add abbreviation
      if (abbr) keywords.push(abbr.toLowerCase());
      
      // Add country
      if (country) keywords.push(country.toLowerCase());
      
      // Add city terms (main + curated aliases)
      allCityNames.forEach(city => {
        const lowerCity = city.toLowerCase();
        keywords.push(lowerCity);
        lowerCity.split(/\s+/).forEach((word) => {
          if (word) keywords.push(word);
        });
      });
      
      // Add alternative name
      if (tzData.alternativeName) {
        keywords.push(tzData.alternativeName.toLowerCase());
        // Split words in alternative name for better search
        tzData.alternativeName.split(/\s+/).forEach(word => {
          keywords.push(word.toLowerCase());
        });
      }
      
      // Add custom aliases
      aliases.forEach((alias) => {
        keywords.push(alias);
      });

      // Add country aliases mapped to this timezone
      Object.entries(COUNTRY_ALIASES).forEach(([aliasCountry, tzList]) => {
        if (tzList.includes(tz)) {
          const lowerCountryAlias = aliasCountry.toLowerCase();
          keywords.push(lowerCountryAlias);
          lowerCountryAlias.split(/\s+/).forEach((word) => {
            if (word) keywords.push(word);
          });
        }
      });
      
      // Add offset tokens
      keywords.push(`utc${offsetStr}`, offsetStr.replace(':', ''));
      
      // Build display name - prioritize expected city labels (country is rendered separately in UI)
      let displayName: string;
      const primaryCity = preferredCity || cities[0] || (TIMEZONE_ALIASES[tz] || [])[0];
      if (primaryCity) {
        displayName = `${primaryCity}${abbr ? ` — ${abbr}` : ''}`;
      } else if (tzData.alternativeName) {
        displayName = `${tzData.alternativeName}${abbr ? ` — ${abbr}` : ''}`;
      } else {
        displayName = String(abbr || tz);
      }

      metadata.push({
        id: tz,
        displayName,
        abbreviations: abbr ? [abbr] : [],
        utcOffset: offsetStr,
        utcOffsetInMinutes: offsetMinutes,
        cities: allCityNames.map(c => c.toLowerCase()),
        country,
        countryCode,
        aliases: Array.from(new Set(aliases)),
        keywords: Array.from(new Set(keywords)),
        region,
        currentLocalTime: currentTime,
      });
    } catch (error) {
      console.warn(`Failed to process timezone "${tzData.name}":`, error);
    }
  });

  // Sort by UTC offset, then by display name
  metadata.sort((a, b) => {
    if (a.utcOffsetInMinutes !== b.utcOffsetInMinutes) {
      return a.utcOffsetInMinutes - b.utcOffsetInMinutes;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  // Cache the result
  cachedMetadata = metadata;
  return metadata;
};

/**
 * Get current local time in a timezone using Luxon
 * Format: "2:30p" or "14:30" depending on context
 */
export const getCurrentTimeInTimezone = (tzId: string): string => {
  try {
    const dt = DateTime.now().setZone(tzId);
    return dt.toFormat('h:mma').toLowerCase();
  } catch (error) {
    return '—';
  }
};

/**
 * Create a searchable index for fast lookup
 * Maps searchable terms (prefixes and full keywords) to timezone metadata
 */
export const createSearchIndex = (
  metadata: EnhancedTimezoneMetadata[]
): Map<string, EnhancedTimezoneMetadata[]> => {
  const index = new Map<string, EnhancedTimezoneMetadata[]>();

  metadata.forEach(tz => {
    const allTerms = new Set<string>();
    
    // Add individual keywords
    tz.keywords.forEach(kw => {
      allTerms.add(kw);
      // Also add character-by-character prefixes for fuzzy matching
      for (let i = 1; i <= kw.length; i++) {
        allTerms.add(kw.substring(0, i));
      }
    });

    // Map each term to this timezone
    allTerms.forEach(term => {
      if (!index.has(term)) {
        index.set(term, []);
      }
      index.get(term)!.push(tz);
    });
  });

  return index;
};
/**
 * Calculate the relative offset between two timezones in hours
 * Returns a string like "+5.5h", "-3h", or "0h"
 */
export const getRelativeOffset = (targetTzId: string, baseTzId: string): string => {
  try {
    const now = DateTime.now();
    const targetOffset = now.setZone(targetTzId).offset;
    const baseOffset = now.setZone(baseTzId).offset;
    
    const diffMinutes = targetOffset - baseOffset;
    const diffHours = diffMinutes / 60;
    
    if (diffHours === 0) return '0h';
    
    const sign = diffHours > 0 ? '+' : '';
    // Format to 1 decimal place if not an integer
    const formattedHours = Number.isInteger(diffHours) 
      ? diffHours.toString() 
      : diffHours.toFixed(1);
      
    return `${sign}${formattedHours}h`;
  } catch (error) {
    return '0h';
  }
};
