'use client';

import useSWR from 'swr';
import { apiClient } from '@/services/apiClient';
import { DashboardStats } from '../types/dashboard';

const fetcher = (url: string) => apiClient.get<DashboardStats>(url).then(res => {
  if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch');
  return res.data;
});

export function useStats(params?: { from?: string; to?: string }) {
  const query = new URLSearchParams();
  if (params?.from) query.append('from', params.from);
  if (params?.to) query.append('to', params.to);
  const queryString = query.toString();
  const url = queryString ? `/dashboard/stats?${queryString}` : '/dashboard/stats';

  const { data, error, isLoading } = useSWR<DashboardStats>(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 60000,
    keepPreviousData: true
  });

  return {
    stats: data ?? null,
    isLoading,
    isError: Boolean(error),
    error: error ?? null
  };
}
