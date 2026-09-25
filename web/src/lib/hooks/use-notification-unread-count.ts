'use client';

import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/notifications';

export function useNotificationUnreadCount() {
  const query = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const response = await notificationsApi.getUnreadCount();
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch unread count');
      }
      return response.data.unread_count;
    },
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  return {
    unreadCount: query.data ?? 0,
    isLoading: query.isLoading,
  };
}
