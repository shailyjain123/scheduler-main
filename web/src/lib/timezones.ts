const FALLBACK_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Zurich',
  'Europe/Stockholm',
  'Europe/Helsinki',
  'Europe/Athens',
  'Europe/Istanbul',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Karachi',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Asia/Jakarta',
  'Australia/Perth',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Pacific/Honolulu',
] as const;

export type TimezoneOption = {
  value: string;
  label: string;
};

const intlWithSupportedValues = Intl as unknown as Intl.DateTimeFormatConstructor & {
  supportedValuesOf?: (key: 'timeZone') => string[];
};

const toTimezoneLabel = (value: string) => value.replace(/_/g, ' ');

export const getAllTimezones = (): TimezoneOption[] => {
  const rawZones = intlWithSupportedValues.supportedValuesOf
    ? intlWithSupportedValues.supportedValuesOf('timeZone')
    : [...FALLBACK_TIMEZONES];

  const normalized = Array.from(new Set(rawZones)).sort((a, b) => a.localeCompare(b));

  return normalized.map((zone) => ({
    value: zone,
    label: toTimezoneLabel(zone),
  }));
};

export const detectDeviceTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};
