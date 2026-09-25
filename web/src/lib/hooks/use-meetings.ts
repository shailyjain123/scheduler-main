'use client';

import useSWR from 'swr';
import { apiClient } from '@/services/apiClient';
import { EventsResponse } from '../types/event';

const fetcher = (url: string) => apiClient.get<EventsResponse>(url).then(res => {
  if (!res.success) throw new Error(res.error?.message || 'Failed to fetch');
  return res;
});

export function useMeetings() {
  const { data, error, isLoading, mutate } = useSWR('/events', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 60000,
    keepPreviousData: true
  });

  return {
    meetings: data?.data ?? null,
    isLoading,
    isError: Boolean(error),
    error: error ?? null,
    mutate
  };
}
