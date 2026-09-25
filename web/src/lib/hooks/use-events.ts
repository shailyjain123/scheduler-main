'use client';

import useSWR from 'swr';
import { apiClient } from '@/services/apiClient';
import { EventsResponse } from '../types/event';

const fetcher = (url: string) => apiClient.get<EventsResponse>(url).then(res => {
  if (!res.success) throw new Error(res.error?.message || 'Failed to fetch');
  return res;
});

interface UseEventsParams {
  page?: number;
  per_page?: number;
  from?: string;
  to?: string;
}

export function useEvents(params?: UseEventsParams) {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.per_page) query.append('per_page', params.per_page.toString());
  if (params?.from) query.append('from', params.from);
  if (params?.to) query.append('to', params.to);

  const queryString = query.toString();
  const url = queryString ? `/events?${queryString}` : '/events';

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 60000,
    keepPreviousData: true
  });

  return {
    events: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate
  };
}
