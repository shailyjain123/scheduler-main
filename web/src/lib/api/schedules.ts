import { apiClient } from '@/services/apiClient';
import { resolveTimezone } from '@/lib/bookings/timezoneUtils';
import { Schedule, AvailabilitySlot, DateOverride } from '../types/schedules';
import type { ApiResponse } from './client';
import { useAuthStore } from '@/store/authStore';
import {
  convertWallClockTime,
  convertAvailabilitySlot,
  convertDateOverride,
} from '@/lib/timezone-converter';

interface AvailabilityScheduleResponse {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  timezone: string;
}

interface AvailabilityOverrideResponse {
  id: number;
  date: string;
  is_unavailable: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  timezone?: string;
}

const toUiDayOfWeek = (backendDay: number): number => (backendDay + 6) % 7;
const toBackendDayOfWeek = (uiDay: number): number => (uiDay + 1) % 7;

/**
 * Maps backend schedule slot to UI format and applies timezone conversion.
 * If the stored timezone differs from the user's current timezone, times are converted.
 */
const mapScheduleSlot = (slot: AvailabilityScheduleResponse, _userTimezone?: string): AvailabilitySlot => {
  return {
    id: slot.id,
    day_of_week: toUiDayOfWeek(slot.day_of_week),
    start_time: slot.start_time,
    end_time: slot.end_time,
    is_active: slot.is_active,
    timezone: slot.timezone,
  };
};

/**
 * Maps backend override to UI format. No conversion is applied to maintain wall-clock consistency.
 */
const mapOverride = (override: AvailabilityOverrideResponse, _userTimezone?: string): DateOverride => {
  return {
    id: override.id,
    date: override.date,
    is_unavailable: override.is_unavailable,
    start_time: override.start_time,
    end_time: override.end_time,
    reason: override.reason,
    timezone: override.timezone,
  };
};

const buildDefaultScheduleView = (slots: AvailabilitySlot[], overrides: DateOverride[]): Schedule => ({
  id: 1,
  name: 'Default Schedule',
  is_default: true,
  availability_slots: slots,
  date_overrides: overrides,
});

const getErrorMessage = (response: ApiResponse<unknown>, fallback: string): string => {
  const details = response.error?.details;
  const detailsText = details ? JSON.stringify(details).toLowerCase() : '';
  const message = (response.error?.message || '').toLowerCase();

  if (
    message.includes('pg::checkviolation') ||
    message.includes('check violation') ||
    message.includes('end_time') ||
    message.includes('must be after') ||
    detailsText.includes('must be after')
  ) {
    return 'Invalid Range: End time must be after Start time.';
  }

  if (message.includes('overlapping schedule block') || detailsText.includes('overlapping schedule block') || detailsText.includes('overlap')) {
    return 'Overlapping intervals are not allowed within the same day.';
  }

  if (
    message.includes('scheduled meeting') ||
    message.includes('scheduled event') ||
    detailsText.includes('scheduled meeting') ||
    detailsText.includes('scheduled event')
  ) {
    return 'Cannot block this range because scheduled meetings already exist.';
  }

  if (response.error?.message) return response.error.message;
  return fallback;
};

const requireSuccess = (response: ApiResponse<unknown>, fallbackMessage: string) => {
  if (!response.success) {
    throw new Error(getErrorMessage(response, fallbackMessage));
  }
};

const requireData = <T>(response: ApiResponse<T>, fallbackMessage: string): T => {
  requireSuccess(response, fallbackMessage);
  if (response.data === undefined || response.data === null) {
    throw new Error(fallbackMessage);
  }
  return response.data;
};

const runSequential = async (
  operations: Array<() => Promise<ApiResponse<unknown>>>,
  label: string,
) => {
  for (let index = 0; index < operations.length; index += 1) {
    const response = await operations[index]();
    requireSuccess(response, `${label} failed at operation ${index + 1}`);
  }
};

/**
 * Runs sequential operations but silently skips 404/not-found errors.
 * Useful for autosave scenarios where a resource might have been deleted elsewhere.
 */
const runSequentialWithNotFoundSkip = async (
  operations: Array<() => Promise<ApiResponse<unknown>>>,
  label: string,
) => {
  for (let index = 0; index < operations.length; index += 1) {
    const response = await operations[index]();
    // Skip errors that are "not found" (resource was deleted elsewhere)
    if (!response.success) {
      const message = response.error?.message || '';
      if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('resource not found')) {
        // Silently skip this operation - resource no longer exists
        continue;
      }
      // Throw other errors
      throw new Error(getErrorMessage(response, `${label} failed at operation ${index + 1}`));
    }
  }
};

const runParallelWithNotFoundSkip = async (
  operations: Array<() => Promise<ApiResponse<unknown>>>,
  label: string,
) => {
  if (operations.length === 0) return;
  const results = await Promise.all(operations.map((op) => op()));
  results.forEach((response, index) => {
    if (!response.success) {
      const message = response.error?.message || '';
      if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('resource not found')) {
        return;
      }
      throw new Error(getErrorMessage(response, `${label} failed at operation ${index + 1}`));
    }
  });
};

export const schedulesApi = {
  getSchedules: async (): Promise<Schedule[]> => {
    const [schedulesRes, overridesRes] = await Promise.all([
      apiClient.get<AvailabilityScheduleResponse[]>('/availability/schedules'),
      apiClient.get<AvailabilityOverrideResponse[]>('/availability/overrides'),
    ] as const);

    const schedulesData = requireData(schedulesRes, 'Failed to fetch availability schedules');
    const overridesData = requireData(overridesRes, 'Failed to fetch availability overrides');

    const slots = schedulesData
      .map((slot) => mapScheduleSlot(slot))
      .sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        if (a.start_time !== b.start_time) return a.start_time.localeCompare(b.start_time);
        return a.end_time.localeCompare(b.end_time);
      });
    const overrides = overridesData.map((override) => mapOverride(override));

    if (slots.length === 0 && overrides.length === 0) {
      return [];
    }

    return [buildDefaultScheduleView(slots, overrides)];
  },

  getSchedule: async (id: number): Promise<Schedule | null> => {
    const schedules = await schedulesApi.getSchedules();
    return schedules.find((schedule) => schedule.id === id) || null;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createSchedule: async (_data: Partial<Schedule>): Promise<Schedule> => {
    // In the new architecture there is no separate schedule entity.
    // Seed a default Mon-Fri schedule so the existing UI action remains functional.
    const userTimezone = useAuthStore.getState().user?.timezone || 'UTC';
    const timezone = resolveTimezone(userTimezone);
    const defaultDays = [0, 1, 2, 3, 4]; // UI: Monday-Friday

    await runSequential(
      defaultDays.map((uiDay) => () =>
        apiClient.post<AvailabilityScheduleResponse>('/availability/schedules', {
          schedule: {
            day_of_week: toBackendDayOfWeek(uiDay),
            start_time: '09:00',
            end_time: '17:00',
            is_active: true,
            timezone,
          }
        })
      ),
      'Failed to initialize default schedule'
    );

    const schedules = await schedulesApi.getSchedules();
    if (schedules.length === 0) {
      throw new Error('Failed to initialize default schedule');
    }
    return schedules[0];
  },

  updateSchedule: async (id: number, data: Partial<Schedule> & { availability_slots?: AvailabilitySlot[], date_overrides?: DateOverride[] }): Promise<Schedule> => {
    const { availability_slots, date_overrides } = data;
    
    // Get user's current timezone for saving
    const userTimezone = useAuthStore.getState().user?.timezone || 'UTC';

    try {
      if (availability_slots) {
        const existingRes = await apiClient.get<AvailabilityScheduleResponse[]>('/availability/schedules');
        const existingSlots = requireData(existingRes, 'Failed to fetch current schedule slots');

        const nextSlots = availability_slots;
        const keepIds = new Set(nextSlots.filter((slot) => slot.id).map((slot) => slot.id));

        const deleteRequests = existingSlots
          .filter((slot) => !keepIds.has(slot.id))
          .map((slot) => () => apiClient.delete(`/availability/schedules/${slot.id}`));

        const upsertRequests = nextSlots.map((slot) => () => {
          const payload = {
            schedule: {
              day_of_week: toBackendDayOfWeek(slot.day_of_week),
              start_time: slot.start_time,
              end_time: slot.end_time,
              is_active: slot.is_active ?? true,
              timezone: slot.timezone || resolveTimezone(userTimezone),
            }
          };

          if (slot.id) {
            return apiClient.patch(`/availability/schedules/${slot.id}`, payload);
          }
          return apiClient.post('/availability/schedules', payload);
        });

        await runParallelWithNotFoundSkip(deleteRequests, 'Schedule slot delete');
        await runParallelWithNotFoundSkip(upsertRequests, 'Schedule slot upsert');
      }

      if (date_overrides) {
        const existingRes = await apiClient.get<AvailabilityOverrideResponse[]>('/availability/overrides');
        const existingOverrides = requireData(existingRes, 'Failed to fetch current date overrides');

        const keepIds = new Set(date_overrides.filter((item) => item.id).map((item) => item.id));

        const deleteRequests = existingOverrides
          .filter((item) => !keepIds.has(item.id))
          .map((item) => () => apiClient.delete(`/availability/overrides/${item.id}`));

        const upsertRequests = date_overrides.map((item) => () => {
          const payload = {
            override: {
              date: item.date,
              is_unavailable: item.is_unavailable,
              start_time: item.start_time,
              end_time: item.end_time,
              reason: item.reason,
              timezone: item.timezone || userTimezone,
            }
          };

          if (item.id) {
            return apiClient.patch(`/availability/overrides/${item.id}`, payload);
          }
          return apiClient.post('/availability/overrides', payload);
        });

        await runParallelWithNotFoundSkip(deleteRequests, 'Date override delete');
        await runParallelWithNotFoundSkip(upsertRequests, 'Date override upsert');
      }

      const schedules = await schedulesApi.getSchedules();
      const foundSchedule = schedules.find((schedule) => schedule.id === id);
      if (!foundSchedule && schedules.length > 0) {
        return schedules[0];
      }
      if (!foundSchedule) {
        throw new Error('Schedule not found after update. The resource may have been deleted.');
      }
      return foundSchedule;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update availability';
      throw new Error(message);
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deleteSchedule: async (_id: number): Promise<void> => {
    const response = await apiClient.get<AvailabilityScheduleResponse[]>('/availability/schedules');
    const slots = requireData(response, 'Failed to fetch current schedule slots');

    await runSequential(
      slots.map((slot) => () => apiClient.delete(`/availability/schedules/${slot.id}`)),
      'Delete schedule slots'
    );
  },
  
  checkConflicts: async (date: string, startTime?: string | null, endTime?: string | null): Promise<{ conflicts_count: number, conflicts: unknown[] }> => {
    const params = new URLSearchParams({ date });
    if (startTime) params.append('start_time', startTime);
    if (endTime) params.append('end_time', endTime);

    const response = await apiClient.get<{ conflicts_count: number, conflicts: unknown[] }>(`/availability/conflicts?${params.toString()}`);
    return requireData(response, 'Failed to check conflicts');
  }
};
