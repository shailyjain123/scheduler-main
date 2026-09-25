import { formatInTimeZone, toDate } from 'date-fns-tz';
import { useAuthStore } from '@/store/authStore';

/**
 * Formats a date string or object according to the user's preferred timezone.
 * Defaults to the browser's timezone if no user preference is set.
 */
export const formatInTimezone = (
  date: Date | string | number,
  formatStr: string | Intl.DateTimeFormatOptions,
  userTimezone?: string
) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const tz = userTimezone || useAuthStore.getState().user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (typeof formatStr === 'string') {
    return formatInTimeZone(d, tz, formatStr);
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    ...formatStr
  }).format(d);
};

/**
 * Converts a date to a specific timezone.
 */
export const toZonedDate = (date: Date | string | number, userTimezone?: string) => {
  const tz = userTimezone || useAuthStore.getState().user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return toDate(date, { timeZone: tz });
};

/**
 * Predefined formatting presets for consistency across the app.
 */
export const datePresets = {
  // Example: "Oct 24, 3:45 PM"
  shortDateTime: {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  } as Intl.DateTimeFormatOptions,

  // Example: "3:45 PM"
  timeOnly: {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  } as Intl.DateTimeFormatOptions,

  // Example: "October 24, 2026"
  fullDate: {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  } as Intl.DateTimeFormatOptions,

  // Example: "Monday"
  weekday: {
    weekday: 'long'
  } as Intl.DateTimeFormatOptions,

  // Example: "Mon, Oct 24"
  dayMonth: {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  } as Intl.DateTimeFormatOptions,
};
