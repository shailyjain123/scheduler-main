/**
 * Timezone Conversion Utility
 * 
 * Converts wall-clock times between timezones.
 * A wall-clock time like "09:00" means "9:00 AM in a specific timezone".
 * This utility converts it to the equivalent time in a different timezone.
 * 
 * Example:
 *   - Time "09:00" in "Asia/Kolkata" (IST, UTC+5:30)
 *   - Converts to "03:30" in "UTC"
 *   - Same moment in time, different wall-clock times
 */

import { DateTime } from 'luxon';

/**
 * Converts a wall-clock time from one timezone to another.
 * 
 * @param timeString - Time in HH:MM format (e.g., "09:00")
 * @param fromTimezone - Source timezone IANA identifier (e.g., "Asia/Kolkata")
 * @param toTimezone - Target timezone IANA identifier (e.g., "UTC")
 * @param referenceDate - Optional reference date (defaults to today). Use this for DST consistency.
 * @returns Time string in HH:MM format in the target timezone
 */
export function convertWallClockTime(
  timeString: string,
  fromTimezone: string,
  toTimezone: string,
  referenceDate?: Date
): string {
  if (!timeString || !fromTimezone || !toTimezone) {
    return timeString;
  }

  if (fromTimezone === toTimezone) {
    return timeString;
  }

  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return timeString;
    }

    // Use reference date or today (to handle DST correctly)
    const refDate = referenceDate || new Date();
    const iso = refDate.toISOString().split('T')[0];

    // Create a datetime in the source timezone
    const dt = DateTime.fromISO(`${iso}T${timeString}:00`, { zone: fromTimezone });
    
    // Convert to target timezone
    const converted = dt.setZone(toTimezone);

    // Return HH:MM in target timezone
    return converted.toFormat('HH:mm');
  } catch (error) {
    console.error(`[TimeZone] Conversion failed: ${timeString} from ${fromTimezone} to ${toTimezone}`, error);
    return timeString;
  }
}

/**
 * Converts all times in an availability slot from stored timezone to user's timezone.
 * 
 * @param slot - Availability slot with start_time, end_time, and stored timezone
 * @param userTimezone - User's currently selected timezone
 * @returns Slot with converted times
 */
export function convertAvailabilitySlot(
  slot: { start_time: string; end_time: string; timezone?: string; [key: string]: any },
  userTimezone: string
): typeof slot {
  const storedTimezone = slot.timezone || 'UTC';

  if (storedTimezone === userTimezone) {
    return slot;
  }

  return {
    ...slot,
    start_time: convertWallClockTime(slot.start_time, storedTimezone, userTimezone),
    end_time: convertWallClockTime(slot.end_time, storedTimezone, userTimezone),
    // Update the timezone field to reflect the new wall-clock context
    timezone: userTimezone,
    // Mark that this has been converted so we can trace it
    _converted_from_timezone: storedTimezone,
  };
}

/**
 * Converts all times in an array of availability slots.
 */
export function convertAvailabilitySlots(
  slots: Array<{ start_time: string; end_time: string; timezone?: string; [key: string]: any }>,
  userTimezone: string
): Array<typeof slots[0]> {
  return slots.map((slot) => convertAvailabilitySlot(slot, userTimezone));
}

/**
 * Converts schedule data (for GET /schedules endpoint).
 * Schedules have a timezone field that indicates where the times were entered.
 */
export function convertSchedule(
  schedule: any,
  userTimezone: string
): any {
  const storedTimezone = schedule.timezone || 'UTC';

  if (storedTimezone === userTimezone) {
    return schedule;
  }

  return {
    ...schedule,
    start_time: convertWallClockTime(schedule.start_time, storedTimezone, userTimezone),
    end_time: convertWallClockTime(schedule.end_time, storedTimezone, userTimezone),
    // Update the timezone field
    timezone: userTimezone,
    _original_timezone: storedTimezone,
  };
}

/**
 * Converts an array of schedules.
 */
export function convertSchedules(schedules: any[], userTimezone: string): any[] {
  return schedules.map((schedule) => convertSchedule(schedule, userTimezone));
}

/**
 * Converts date override times.
 */
export function convertDateOverride(
  override: any,
  userTimezone: string
): any {
  const storedTimezone = override.timezone || 'UTC';

  if (storedTimezone === userTimezone || !override.start_time || !override.end_time) {
    return override;
  }

  // For date overrides, we need to use the specific date (not today)
  const overrideDate = override.date ? new Date(override.date) : new Date();

  return {
    ...override,
    start_time: convertWallClockTime(override.start_time, storedTimezone, userTimezone, overrideDate),
    end_time: convertWallClockTime(override.end_time, storedTimezone, userTimezone, overrideDate),
    // Update the timezone field
    timezone: userTimezone,
    _original_timezone: storedTimezone,
  };
}

/**
 * Converts all date overrides.
 */
export function convertDateOverrides(overrides: any[], userTimezone: string): any[] {
  return overrides.map((override) => convertDateOverride(override, userTimezone));
}
