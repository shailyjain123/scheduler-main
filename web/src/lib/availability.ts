export type WeeklySlot = { start: string; end: string };
export type WeeklyAvailability = Record<string, WeeklySlot[]>;

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const DEFAULT_WEEKLY_AVAILABILITY: WeeklyAvailability = {
  Monday: [{ start: '09:00', end: '17:00' }],
  Tuesday: [{ start: '09:00', end: '17:00' }],
  Wednesday: [{ start: '09:00', end: '17:00' }],
  Thursday: [{ start: '09:00', end: '17:00' }],
  Friday: [{ start: '09:00', end: '17:00' }],
  Saturday: [],
  Sunday: [],
};

const isValidSlot = (slot: unknown): slot is WeeklySlot => {
  if (!slot || typeof slot !== 'object') return false;
  const candidate = slot as Record<string, unknown>;
  return typeof candidate.start === 'string' && typeof candidate.end === 'string';
};

export const getDefaultWeeklyAvailability = (): WeeklyAvailability => {
  const normalized: WeeklyAvailability = {};
  DAYS_OF_WEEK.forEach((day) => {
    normalized[day] = [...DEFAULT_WEEKLY_AVAILABILITY[day]];
  });
  return normalized;
};

export const normalizeWeeklyAvailability = (value: unknown): WeeklyAvailability => {
  const normalized = getDefaultWeeklyAvailability();
  if (!value || typeof value !== 'object') return normalized;

  const input = value as Record<string, unknown>;
  DAYS_OF_WEEK.forEach((day) => {
    const daySlots = input[day];
    if (Array.isArray(daySlots)) {
      normalized[day] = daySlots.filter(isValidSlot).map((slot) => ({
        start: slot.start,
        end: slot.end,
      }));
    }
  });

  return normalized;
};

export const getDaySlots = (availability: WeeklyAvailability, day: string): WeeklySlot[] => {
  const slots = availability[day as keyof WeeklyAvailability];
  return Array.isArray(slots) ? slots : [];
};
