'use client';

import useSWR from 'swr';
import { apiClient } from '@/services/apiClient';
import { EventType } from '@/lib/types/event';

interface EventTypesResponse {
  event_types: EventType[];
}

const fetcher = (url: string) => apiClient.get<EventTypesResponse>(url).then(res => {
  if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch event types');
  return res.data;
});

export function useEventTypes() {
  const { data, error, isLoading, mutate } = useSWR<EventTypesResponse>('/event_types', fetcher);

  return {
    eventTypes: data?.event_types || [],
    isLoading,
    isError: error,
    mutate
  };
}

const singleFetcher = (url: string) => apiClient.get<{ event_type: EventType }>(url).then(res => {
  if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch event type');
  return res.data;
});

export function useEventType(id: number | string) {
  const { data, error, isLoading, mutate } = useSWR<{ event_type: EventType }>(`/event_types/${id}`, singleFetcher);

  return {
    eventType: data?.event_type || null,
    isLoading,
    isError: error,
    mutate
  };
}
