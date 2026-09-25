import { formatInTimeZone } from 'date-fns-tz';

export type TimezoneOption = {
  id: string; // IANA identifier
  label: string; // Human readable label
  abbreviation?: string; // e.g., IST, PST
  offset?: string; // e.g., UTC+05:30
  // lowercase search blob used for fast matching (abbreviation, id, label, city, aliases, offsets)
  search?: string;
};

const COMMON_ABBREV_MAP: Record<string, string> = {
  UTC: 'UTC',
  GMT: 'Etc/GMT',
  IST: 'Asia/Kolkata',
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
  MST: 'America/Denver',
  MDT: 'America/Denver',
  CST: 'America/Chicago',
  CDT: 'America/Chicago',
  EST: 'America/New_York',
  EDT: 'America/New_York',
  CET: 'Europe/Paris',
  CEST: 'Europe/Paris',
  BST: 'Europe/London',
};

const now = new Date();

function getTimeZoneNameParts(timeZone: string, style: 'short' | 'long') {
  try {
    if (typeof Intl !== 'undefined' && (Intl as any).DateTimeFormat) {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: style }).formatToParts(now);
      const tzn = parts.find((p) => p.type === 'timeZoneName');
      return tzn ? tzn.value : undefined;
    }
  } catch (e) {
    // fallback
  }
  return undefined;
}

function getOffsetFor(tz: string) {
  try {
    return formatInTimeZone(now, tz, 'XXX');
  } catch (e) {
    return '+00:00';
  }
}

export const buildTimezoneOptions = (): TimezoneOption[] => {
  const ianaList: string[] = typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
    ? (Intl as any).supportedValuesOf('timeZone')
    : ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata'];

  // Build map of id -> best option (deduplicated by IANA ID only)
  const optionsByID: Record<string, TimezoneOption> = {};

  ianaList.forEach((id) => {
    const offset = getOffsetFor(id);
    const abbr = getTimeZoneNameParts(id, 'short');
    const longName = getTimeZoneNameParts(id, 'long') || id;

    // Clean label format: (GMT+01:00) City Name — Long Name
    // Avoid duplication: no (id) at end, use em dash for separation
    const label = abbr && longName && abbr !== longName
      ? `(${offset}) ${longName} — ${abbr}`
      : `(${offset}) ${longName}`;

    optionsByID[id] = { id, label, abbreviation: abbr, offset };
  });

  // Add common abbreviation aliases pointing to the canonical IANA timezone
  // but don't create duplicate entries - just ensure searchability
  Object.keys(COMMON_ABBREV_MAP).forEach((abbr) => {
    const target = COMMON_ABBREV_MAP[abbr];
    if (optionsByID[target]) {
      // Enhance the label to include the abbreviation for searchability
      const existing = optionsByID[target];
      if (!existing.abbreviation || existing.abbreviation !== abbr) {
        // If it doesn't have this abbreviation, append to label for search purposes
        // but keep it clean (don't show duplicate in dropdown)
      }
      // Update abbreviation if this one is shorter/better known
      if (!existing.abbreviation || abbr.length < existing.abbreviation.length) {
        existing.abbreviation = abbr;
      }
    }
  });

  // Build searchable tokens for each option to improve matching (abbrev, id, label, city, continent, offsets, aliases)
  const ALIAS_KEYWORDS: Record<string, string[]> = {
    india: ['Asia/Kolkata'],
    uk: ['Europe/London'],
    england: ['Europe/London'],
    britain: ['Europe/London'],
    france: ['Europe/Paris'],
    paris: ['Europe/Paris'],
    america: ['America/New_York', 'America/Los_Angeles'],
    us: ['America/New_York', 'America/Los_Angeles'],
  };

  Object.keys(optionsByID).forEach((id) => {
    const opt = optionsByID[id];
    const tokens: string[] = [];

    // canonical id
    tokens.push(opt.id.toLowerCase());

    // id split parts (continent, city)
    const parts = opt.id.split('/').map((p) => p.replace(/_/g, ' ').toLowerCase());
    tokens.push(...parts);

    // label and abbreviation
    if (opt.label) tokens.push(opt.label.toLowerCase());
    if (opt.abbreviation) tokens.push(opt.abbreviation.toLowerCase());

    // long name often includes city/country (already in label) — add words
    const words = (opt.label || '').replace(/[()—,-]/g, ' ').split(/\s+/).map((w) => w.toLowerCase()).filter(Boolean);
    tokens.push(...words);

    // offset tokens: (GMT+05:30) -> gmt+05:30, gmt+0530, +05:30, 05:30
    if (opt.offset) {
      const off = opt.offset.toLowerCase();
      tokens.push(`gmt${off}`);
      tokens.push(`utc${off}`);
      tokens.push(off.replace(':', ''));
      tokens.push(off);
      tokens.push(off.replace('+', '').replace('-', ''));
    }

    // Add common abbreviation alias tokens (so searching "utc" or "gmt" matches)
    Object.keys(COMMON_ABBREV_MAP).forEach((a) => {
      if (COMMON_ABBREV_MAP[a] === opt.id) tokens.push(a.toLowerCase());
    });

    // Add manual alias keywords mapping (country/city synonyms)
    Object.keys(ALIAS_KEYWORDS).forEach((kw) => {
      if (ALIAS_KEYWORDS[kw].includes(opt.id)) tokens.push(kw.toLowerCase());
    });

    // compact and dedupe tokens
    const seenTok = new Set<string>();
    const cleaned: string[] = [];
    tokens.forEach((t) => {
      const s = (t || '').toLowerCase().trim();
      if (!s) return;
      if (!seenTok.has(s)) {
        cleaned.push(s);
        seenTok.add(s);
      }
    });

    opt.search = cleaned.join(' ');
    optionsByID[id] = opt;
  });

  // Sort by offset, then by ID for consistent ordering
  return Object.values(optionsByID).sort((a, b) => {
    const aOffset = (a.offset || '+00:00').replace(/[^\d-]/g, '');
    const bOffset = (b.offset || '+00:00').replace(/[^\d-]/g, '');
    const offsetCmp = parseInt(aOffset) - parseInt(bOffset);
    if (offsetCmp !== 0) return offsetCmp;
    return (a.id || '').localeCompare(b.id || '');
  });
};

export const resolveTimezone = (value?: string | null): string => {
  if (!value) return 'UTC';
  const v = value.trim();
  if (v.includes('/')) return v; // already IANA
  const upper = v.toUpperCase();
  if (COMMON_ABBREV_MAP[upper]) return COMMON_ABBREV_MAP[upper];

  // Try to match abbreviation via built options
  const opts = buildTimezoneOptions();
  const match = opts.find((o) => (o.abbreviation || '').toUpperCase() === upper || o.id.toUpperCase() === v.toUpperCase());
  if (match) return match.id;

  // Fallback to UTC
  return 'UTC';
};
