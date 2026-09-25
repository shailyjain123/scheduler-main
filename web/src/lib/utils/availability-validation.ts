import { AvailabilitySlot } from '@/lib/types/schedules';

type SlotWithIndex = AvailabilitySlot & { __index: number };
type MinutesSlotWithIndex = SlotWithIndex & { __startMinutes: number, __endMinutes: number };

export const MINIMUM_SLOT_DURATION_MINUTES = 30;
export const MAX_SLOT_DURATION_MINUTES = 24 * 60;

const isParsableTime = (value: string): boolean => /^\d{2}:\d{2}$/.test(value);

const timeToMinutes = (value: string): number => {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
};

/**
 * Calculate actual duration in minutes, handling overnight ranges.
 * If endMinutes < startMinutes, it's an overnight range (crosses midnight).
 * Example: 23:00 to 07:00 = 8 hours (480 minutes)
 */
const calculateDuration = (startMinutes: number, endMinutes: number): number => {
  if (endMinutes >= startMinutes) {
    // Same day range
    return endMinutes - startMinutes;
  }
  // Overnight range: add 24 hours to end time
  return (24 * 60) - startMinutes + endMinutes;
};

const toValidMinutesSlots = (slots: AvailabilitySlot[]): MinutesSlotWithIndex[] =>
  slots
    .map((slot, index) => ({ ...slot, __index: index }))
    .filter((slot) => !isInvalidSlotRange(slot))
    .map((slot) => ({
      ...slot,
      __startMinutes: timeToMinutes(slot.start_time),
      __endMinutes: timeToMinutes(slot.end_time),
    }));

export const isInvalidSlotRange = (slot: AvailabilitySlot): boolean => {
  if (!slot.start_time || !slot.end_time) return true;
  if (!isParsableTime(slot.start_time) || !isParsableTime(slot.end_time)) return true;
  
  // Allow equal times for same-day or overnight ranges
  if (slot.end_time === slot.start_time) return true;

  const startMinutes = timeToMinutes(slot.start_time);
  const endMinutes = timeToMinutes(slot.end_time);
  const duration = calculateDuration(startMinutes, endMinutes);

  // Check minimum duration (30 minutes)
  if (duration < MINIMUM_SLOT_DURATION_MINUTES) return true;
  
  // Check maximum duration (less than 24 hours)
  if (duration >= MAX_SLOT_DURATION_MINUTES) return true;
  
  return false;
};

export const getOverlappingSlotIndices = (slots: AvailabilitySlot[]): Set<number> => {
  const overlaps = new Set<number>();

  const validSlots = toValidMinutesSlots(slots);

  const slotsByDay = validSlots.reduce<Record<number, MinutesSlotWithIndex[]>>((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {});

  Object.values(slotsByDay).forEach((daySlots) => {
    daySlots.sort((a, b) => a.__startMinutes - b.__startMinutes);

    for (let i = 0; i < daySlots.length; i += 1) {
      for (let j = i + 1; j < daySlots.length; j += 1) {
        const left = daySlots[i];
        const right = daySlots[j];

        // Check if slots overlap, considering overnight ranges
        if (doSlotsCrossOver(left, right)) {
          overlaps.add(left.__index);
          overlaps.add(right.__index);
        }
      }
    }
  });

  return overlaps;
};

/**
 * Determine if two time slots overlap, considering overnight ranges.
 * 
 * Cases:
 * 1. Both same-day: 09:00-17:00 and 14:00-18:00 (overlap)
 * 2. Both overnight: 23:00-07:00 and 22:00-06:00 (overlap)
 * 3. One overnight, one same-day: 23:00-07:00 and 08:00-16:00 (no overlap)
 * 4. One overnight, one same-day: 23:00-07:00 and 06:00-10:00 (overlap)
 */
const doSlotsCrossOver = (left: MinutesSlotWithIndex, right: MinutesSlotWithIndex): boolean => {
  const leftIsOvernight = left.__endMinutes < left.__startMinutes;
  const rightIsOvernight = right.__endMinutes < right.__startMinutes;

  if (!leftIsOvernight && !rightIsOvernight) {
    // Both same-day: simple comparison
    return left.__startMinutes < right.__endMinutes && left.__endMinutes > right.__startMinutes;
  }

  if (leftIsOvernight && rightIsOvernight) {
    // Both overnight: they overlap if they intersect on a 24h timeline
    // Convert to normalized timeline where overnight shifts forward
    const leftStart = left.__startMinutes;
    const leftEnd = left.__endMinutes + (24 * 60);
    const rightStart = right.__startMinutes;
    const rightEnd = right.__endMinutes + (24 * 60);
    
    // Treat as if both start after midnight
    return leftStart < rightEnd && leftEnd > rightStart;
  }

  // One overnight, one same-day
  const overnight = leftIsOvernight ? left : right;
  const sameDay = leftIsOvernight ? right : left;

  // Overnight range spans from overnightStart to overnightEnd (next day)
  // Same-day range is from sameDayStart to sameDayEnd
  // They overlap if same-day overlaps with either the "before midnight" or "after midnight" part
  
  // Check if same-day overlaps with overnight's "before midnight" part
  if (sameDay.__startMinutes < overnight.__startMinutes && sameDay.__endMinutes > overnight.__startMinutes) {
    return true;
  }
  
  // Check if same-day overlaps with overnight's "after midnight" part
  if (sameDay.__startMinutes < overnight.__endMinutes) {
    return true;
  }

  return false;
};

export const hasOverlappingSlotRanges = (slots: AvailabilitySlot[]): boolean =>
  getOverlappingSlotIndices(slots).size > 0;

// Gap is only a default Add Shift suggestion, not a validation rule.
export const getInsufficientGapSlotIndices = (_slots: AvailabilitySlot[]): Set<number> =>
  new Set<number>();

export const hasInsufficientGapSlotRanges = (slots: AvailabilitySlot[]): boolean =>
  getInsufficientGapSlotIndices(slots).size > 0;
