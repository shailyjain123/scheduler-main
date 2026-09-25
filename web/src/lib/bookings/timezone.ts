import { formatInTimeZone } from 'date-fns-tz';
import { resolveTimezone } from './timezoneUtils';

export type BookingSlot = {
  date: string;
  start_time: string;
  end_time: string;
  label: string;
  available: boolean;
};

export type ProjectedBookingSlot = BookingSlot & {
  host_start_time: string;
  host_end_time: string;
};

const DATE_LABEL_FORMAT = 'EEE MMM d yyyy';
const TIME_LABEL_FORMAT = 'h:mm a';
const ISO_WITH_OFFSET_FORMAT = "yyyy-MM-dd'T'HH:mm:ssXXX";

export const normalizeTimezone = (value?: string | null): string => resolveTimezone(value);

const parseTimestamp = (value: string): Date => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid booking timestamp: ${value}`);
  }

  return parsed;
};

const formatBookingTime = (value: string, timezone: string): string => {
  return formatInTimeZone(parseTimestamp(value), normalizeTimezone(timezone), TIME_LABEL_FORMAT)
    .replace(/\s+/g, '')
    .toLowerCase();
};

export const formatBookingDateLabel = (value: string, timezone: string): string => {
  return formatInTimeZone(parseTimestamp(value), normalizeTimezone(timezone), DATE_LABEL_FORMAT).replace(/,/g, '');
};

export const projectBookingSlots = (
  slots: BookingSlot[],
  hostTimezone: string,
  selectedTimezone: string,
): ProjectedBookingSlot[] => {
  const normalizedHostTimezone = normalizeTimezone(hostTimezone);
  const normalizedSelectedTimezone = normalizeTimezone(selectedTimezone);

  return slots.map((slot) => {
    const projectedDate = formatBookingDateLabel(slot.start_time, normalizedSelectedTimezone);
    const projectedStartTime = formatInTimeZone(parseTimestamp(slot.start_time), normalizedSelectedTimezone, ISO_WITH_OFFSET_FORMAT);
    const projectedEndTime = formatInTimeZone(parseTimestamp(slot.end_time), normalizedSelectedTimezone, ISO_WITH_OFFSET_FORMAT);

    return {
      ...slot,
      date: projectedDate,
      start_time: projectedStartTime,
      end_time: projectedEndTime,
      label: `${formatBookingTime(slot.start_time, normalizedSelectedTimezone)} - ${formatBookingTime(slot.end_time, normalizedSelectedTimezone)}`,
      host_start_time: formatInTimeZone(parseTimestamp(slot.start_time), normalizedHostTimezone, ISO_WITH_OFFSET_FORMAT),
      host_end_time: formatInTimeZone(parseTimestamp(slot.end_time), normalizedHostTimezone, ISO_WITH_OFFSET_FORMAT),
    };
  });
};

export const projectSelectedTimeToHost = (value: string, hostTimezone: string): string => {
  return formatInTimeZone(parseTimestamp(value), normalizeTimezone(hostTimezone), ISO_WITH_OFFSET_FORMAT);
};