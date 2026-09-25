'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { schedulesApi } from '../api/schedules';
import { Schedule, AvailabilitySlot, DateOverride } from '../types/schedules';

const EMPTY_SCHEDULES: Schedule[] = [];

export function useSchedules() {
  const queryClient = useQueryClient();
  const userTimezone = useAuthStore((state) => state.user?.timezone);

  // Note: We deliberately DO NOT automatically invalidate schedules when userTimezone changes
  // to avoid unintended shifts in the availability editor. 

  const query = useQuery({
    queryKey: ['schedules'],
    queryFn: () => schedulesApi.getSchedules(),
    refetchOnMount: 'always',
  });

  return {
    schedules: query.data || EMPTY_SCHEDULES,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetched: query.isFetched,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useSchedule(id: number | undefined) {
  const query = useQuery({
    queryKey: ['schedule', id],
    queryFn: () => (id ? schedulesApi.getSchedule(id) : Promise.resolve(null)),
    enabled: !!id,
  });

  return {
    schedule: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  const mutation = useMutation<Schedule, Error, { id: number, data: Partial<Schedule> & { availability_slots?: AvailabilitySlot[], date_overrides?: DateOverride[] } }>({
    mutationFn: ({ id, data }: { id: number, data: Partial<Schedule> & { availability_slots?: AvailabilitySlot[], date_overrides?: DateOverride[] } }) => 
      schedulesApi.updateSchedule(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', data.id] });
    },
  });

  return {
    updateSchedule: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  const mutation = useMutation<Schedule, Error, Partial<Schedule>>({
    mutationFn: (data: Partial<Schedule>) => schedulesApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  return {
    createSchedule: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error as Error | null,
  };
}
