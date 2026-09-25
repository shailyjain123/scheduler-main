/**
 * Comprehensive city-first timezone dataset
 *
 * Merges two data sources:
 *  1. `city-timezones` — 7 300+ cities worldwide with lat/lng, country, province, population
 *  2. `@vvo/tzdb`      — IANA timezone metadata (abbreviation, offset, alternative names)
 *
 * The result is a city-level search model: each city is a separate searchable entry,
 * even when multiple cities share the same IANA timezone (e.g. Delhi and Mumbai both → Asia/Kolkata).
 *
 * Selected value is always a valid IANA timezone ID (e.g. "Asia/Kolkata").
 */

import { getTimeZones, TimeZone as TzDbTimezone } from '@vvo/tzdb';
import { DateTime } from 'luxon';

// ─── City-timezones raw import ───────────────────────────────────────────────
// city-timezones ships a `cityMapping` array with ~7 300 entries
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cityTimezones from 'city-timezones';

const cityMappingRaw: CityMappingEntry[] = cityTimezones.cityMapping || [];

// Fields typed loosely — the city-timezones package has entries where
// iso2, iso3, province etc. can be numbers, booleans, or missing at runtime.
interface CityMappingEntry {
  city: unknown;
  city_ascii: unknown;
  lat: unknown;
  lng: unknown;
  pop: unknown;
  country: unknown;
  iso2: unknown;
  iso3: unknown;
  province: unknown;
  timezone: unknown;
}

/** Safely coerce any value to a trimmed string (handles numbers, booleans, null, undefined). */
const str = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return String(v);
};

// ─── Public types ────────────────────────────────────────────────────────────

export interface CityTimezoneEntry {
  /** Unique key for React lists — `city|country|iana` */
  key: string;
  /** Display city name */
  city: string;
  /** Province / state (may be empty) */
  province: string;
  /** Country name */
  country: string;
  /** ISO-2 country code */
  countryCode: string;
  /** IANA timezone ID (e.g. "Asia/Kolkata") — this is the stored value */
  timezone: string;
  /** Timezone abbreviation (e.g. "IST") */
  abbreviation: string;
  /** UTC offset string (e.g. "+05:30") */
  utcOffset: string;
  /** Offset in minutes for sorting */
  utcOffsetMinutes: number;
  /** Alternative timezone name (e.g. "India Time") */
  timezoneName: string;
  /** Continent/region */
  region: string;
  /** Population (used for ranking — higher = more relevant) */
  population: number;
  /** Pre-built lowercase search blob for fast filtering */
  searchBlob: string;
}

// ─── Abbreviation aliases (common user inputs) ──────────────────────────────

const ABBREVIATION_TO_IANA: Record<string, string[]> = {
  IST: ['Asia/Kolkata'],
  EST: ['America/New_York'],
  EDT: ['America/New_York'],
  CST: ['America/Chicago'],
  CDT: ['America/Chicago'],
  MST: ['America/Denver'],
  MDT: ['America/Denver'],
  PST: ['America/Los_Angeles'],
  PDT: ['America/Los_Angeles'],
  GMT: ['Europe/London'],
  BST: ['Europe/London'],
  CET: ['Europe/Paris', 'Europe/Berlin'],
  CEST: ['Europe/Paris', 'Europe/Berlin'],
  JST: ['Asia/Tokyo'],
  KST: ['Asia/Seoul'],
  SGT: ['Asia/Singapore'],
  HKT: ['Asia/Hong_Kong'],
  AEST: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane'],
  AEDT: ['Australia/Sydney', 'Australia/Melbourne'],
  AWST: ['Australia/Perth'],
  NZST: ['Pacific/Auckland'],
  NZDT: ['Pacific/Auckland'],
  ICT: ['Asia/Bangkok'],
  WIB: ['Asia/Jakarta'],
  GST: ['Asia/Dubai'],
  PKT: ['Asia/Karachi'],
  EAT: ['Africa/Nairobi'],
  WAT: ['Africa/Lagos'],
  CAT: ['Africa/Johannesburg'],
  SAST: ['Africa/Johannesburg'],
  ART: ['America/Argentina/Buenos_Aires'],
  BRT: ['America/Sao_Paulo'],
  AST: ['America/Halifax'],
  NST: ['America/St_Johns'],
  AKST: ['America/Anchorage'],
  HST: ['Pacific/Honolulu'],
};

/** Country synonyms that users commonly type */
const COUNTRY_SYNONYMS: Record<string, string[]> = {
  'us': ['United States of America'],
  'usa': ['United States of America'],
  'united states': ['United States of America'],
  'america': ['United States of America'],
  'uk': ['United Kingdom'],
  'britain': ['United Kingdom'],
  'great britain': ['United Kingdom'],
  'england': ['United Kingdom'],
  'uae': ['United Arab Emirates'],
};

// ─── Build timezone metadata lookup from @vvo/tzdb ──────────────────────────

interface TimezoneInfo {
  abbreviation: string;
  offsetMinutes: number;
  offsetStr: string;
  alternativeName: string;
  continentName: string;
}

let tzInfoMap: Map<string, TimezoneInfo> | null = null;

const buildTzInfoMap = (): Map<string, TimezoneInfo> => {
  if (tzInfoMap) return tzInfoMap;

  const map = new Map<string, TimezoneInfo>();
  const allTz = getTimeZones();

  allTz.forEach((tz: TzDbTimezone) => {
    const offsetMinutes = tz.currentTimeOffsetInMinutes;
    const absHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const absMins = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const offsetStr = `${sign}${String(absHours).padStart(2, '0')}:${String(absMins).padStart(2, '0')}`;

    const info: TimezoneInfo = {
      abbreviation: tz.abbreviation || '',
      offsetMinutes,
      offsetStr,
      alternativeName: tz.alternativeName || '',
      continentName: tz.continentName || tz.continentCode || '',
    };

    map.set(tz.name, info);

    // Also map group aliases (e.g. Asia/Calcutta → Asia/Kolkata info)
    if (tz.group) {
      tz.group.forEach(alias => {
        if (!map.has(alias)) map.set(alias, info);
      });
    }
  });

  tzInfoMap = map;
  return map;
};

// ─── Cached dataset ─────────────────────────────────────────────────────────

let cachedEntries: CityTimezoneEntry[] | null = null;

/**
 * Build the full city-timezone dataset.
 * Cached after first call — ~7 300 entries built in <50ms.
 */
export const buildCityTimezoneData = (): CityTimezoneEntry[] => {
  if (cachedEntries) return cachedEntries;

  const infoMap = buildTzInfoMap();
  const entries: CityTimezoneEntry[] = [];
  const seenKeys = new Set<string>();

  // Process all cities from city-timezones
  cityMappingRaw.forEach((raw) => {
    const tzId = str(raw.timezone);
    if (!tzId) return;

    const info = infoMap.get(tzId);
    // Skip cities whose timezone isn't in the IANA database
    if (!info) return;

    const city = str(raw.city) || str(raw.city_ascii);
    if (!city) return;

    const country = str(raw.country);
    const province = str(raw.province);
    const iso2 = str(raw.iso2);
    const iso3 = str(raw.iso3);
    const population = typeof raw.pop === 'number' ? raw.pop : 0;

    const key = `${city.toLowerCase()}|${country.toLowerCase()}|${tzId}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);

    // Build search blob: city, province, country, timezone parts, abbreviation, offset, aliases
    const searchTokens: string[] = [
      city.toLowerCase(),
      province.toLowerCase(),
      country.toLowerCase(),
      iso2.toLowerCase(),
      iso3.toLowerCase(),
      tzId.toLowerCase(),
      ...tzId.split('/').map(p => p.replace(/_/g, ' ').toLowerCase()),
      info.abbreviation.toLowerCase(),
      info.alternativeName.toLowerCase(),
      `utc${info.offsetStr}`,
      info.offsetStr.replace(':', ''),
    ];

    // Add words from multi-word city names (e.g. "New Delhi" → "new", "delhi")
    city.split(/[\s-]+/).forEach(w => {
      if (w.length > 1) searchTokens.push(w.toLowerCase());
    });

    // Add country synonyms
    Object.entries(COUNTRY_SYNONYMS).forEach(([synonym, countries]) => {
      if (countries.some(c => c.toLowerCase() === country.toLowerCase())) {
        searchTokens.push(synonym);
      }
    });

    // Add abbreviation aliases
    Object.entries(ABBREVIATION_TO_IANA).forEach(([abbr, tzIds]) => {
      if (tzIds.includes(tzId)) {
        searchTokens.push(abbr.toLowerCase());
      }
    });

    const searchBlob = Array.from(new Set(searchTokens)).join(' ');

    entries.push({
      key,
      city,
      province,
      country,
      countryCode: iso2,
      timezone: tzId,
      abbreviation: info.abbreviation,
      utcOffset: info.offsetStr,
      utcOffsetMinutes: info.offsetMinutes,
      timezoneName: info.alternativeName,
      region: info.continentName,
      population,
      searchBlob,
    });
  });

  // Sort by population descending so bigger cities rank first by default
  entries.sort((a, b) => b.population - a.population);

  cachedEntries = entries;
  return entries;
};

// ─── Search engine ──────────────────────────────────────────────────────────

export interface CitySearchResult {
  entry: CityTimezoneEntry;
  score: number;
  matchType: 'exact_city' | 'prefix_city' | 'abbreviation' | 'country' | 'timezone' | 'fuzzy';
}

/**
 * Search cities with intelligent ranking.
 * Returns ALL matching cities — no deduplication by timezone.
 *
 * @param query   User input (city, country, abbreviation, timezone, offset)
 * @param limit   Max results (default 50)
 */
export const searchCities = (
  query: string,
  limit: number = 50,
): CitySearchResult[] => {
  const entries = buildCityTimezoneData();
  const q = query.trim().toLowerCase();

  if (!q) {
    // Return top cities by population
    return entries.slice(0, limit).map(entry => ({
      entry,
      score: entry.population,
      matchType: 'fuzzy' as const,
    }));
  }

  const results: CitySearchResult[] = [];
  const queryWords = q.split(/[\s,]+/).filter(w => w.length > 0);

  // Check if query is an abbreviation
  const isAbbreviation = ABBREVIATION_TO_IANA[q.toUpperCase()] !== undefined;

  entries.forEach(entry => {
    const cityLower = entry.city.toLowerCase();
    const countryLower = entry.country.toLowerCase();
    const provinceLower = entry.province.toLowerCase();

    let score = 0;
    let matchType: CitySearchResult['matchType'] = 'fuzzy';

    // === EXACT CITY MATCH ===
    if (cityLower === q) {
      score = 10000 + entry.population / 1000;
      matchType = 'exact_city';
    }
    // === CITY STARTS WITH QUERY ===
    else if (cityLower.startsWith(q)) {
      score = 8000 + entry.population / 1000;
      matchType = 'prefix_city';
    }
    // === MULTI-WORD CITY: any word starts with query ===
    else if (cityLower.split(/[\s-]+/).some(w => w.startsWith(q))) {
      score = 7000 + entry.population / 1000;
      matchType = 'prefix_city';
    }
    // === ABBREVIATION MATCH ===
    else if (isAbbreviation && entry.abbreviation.toLowerCase() === q) {
      score = 6000 + entry.population / 1000;
      matchType = 'abbreviation';
    }
    // === COUNTRY MATCH ===
    else if (countryLower === q || countryLower.startsWith(q)) {
      score = 5000 + entry.population / 1000;
      matchType = 'country';
    }
    // === COUNTRY SYNONYM MATCH ===
    else if (
      Object.entries(COUNTRY_SYNONYMS).some(([syn, countries]) => {
        return syn.startsWith(q) && countries.some(c => c.toLowerCase() === countryLower);
      })
    ) {
      score = 4900 + entry.population / 1000;
      matchType = 'country';
    }
    // === PROVINCE MATCH ===
    else if (provinceLower.startsWith(q)) {
      score = 4500 + entry.population / 1000;
      matchType = 'country';
    }
    // === TIMEZONE ID MATCH ===
    else if (entry.timezone.toLowerCase().includes(q)) {
      score = 4000 + entry.population / 1000;
      matchType = 'timezone';
    }
    // === SEARCH BLOB CONTAINS ALL QUERY WORDS ===
    else if (queryWords.length > 1 && queryWords.every(w => entry.searchBlob.includes(w))) {
      score = 3500 + entry.population / 1000;
      matchType = 'fuzzy';
    }
    // === SEARCH BLOB CONTAINS QUERY ===
    else if (entry.searchBlob.includes(q)) {
      score = 3000 + entry.population / 1000;
      matchType = 'fuzzy';
    }
    // === FUZZY: partial match in city name ===
    else if (q.length >= 3 && cityLower.includes(q)) {
      score = 2000 + entry.population / 1000;
      matchType = 'fuzzy';
    }
    // Skip — no match
    else {
      return;
    }

    results.push({ entry, score, matchType });
  });

  // Sort by score desc, then by population desc
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.entry.population - a.entry.population;
  });

  return results.slice(0, limit);
};

// ─── Utility helpers ────────────────────────────────────────────────────────

/**
 * Get the current local time in a given timezone
 */
export const getCityCurrentTime = (timezone: string): string => {
  try {
    return DateTime.now().setZone(timezone).toFormat('h:mma').toLowerCase();
  } catch {
    return '—';
  }
};

/**
 * Get relative offset between two timezones in hours
 */
export const getCityRelativeOffset = (targetTz: string, baseTz: string): string => {
  try {
    const now = DateTime.now();
    const targetOffset = now.setZone(targetTz).offset;
    const baseOffset = now.setZone(baseTz).offset;
    const diffMinutes = targetOffset - baseOffset;
    const diffHours = diffMinutes / 60;

    if (diffHours === 0) return '0h';
    const sign = diffHours > 0 ? '+' : '';
    const formatted = Number.isInteger(diffHours) ? diffHours.toString() : diffHours.toFixed(1);
    return `${sign}${formatted}h`;
  } catch {
    return '0h';
  }
};

/**
 * Format a city entry for display
 * Example: "Indore, India (IST)"
 */
export const formatCityLabel = (entry: CityTimezoneEntry): string => {
  const parts = [entry.city];
  if (entry.country) parts.push(entry.country);
  const location = parts.join(', ');
  return entry.abbreviation ? `${location} (${entry.abbreviation})` : location;
};
