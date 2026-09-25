'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  NotificationCategory,
  NotificationFilter,
  NotificationItem,
  NotificationsResponse,
  notificationsApi,
} from '@/lib/api/notifications';

interface UseNotificationsParams {
  filter?: NotificationFilter;
  categories?: NotificationCategory[];
  perPage?: number;
}

function parseResponse(response: { success: boolean; data?: NotificationsResponse; error?: { message?: string } }) {
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch notifications');
  }

  return response.data;
}

export function useNotifications({ filter = 'all', categories = [], perPage = 20 }: UseNotificationsParams = {}) {
  const queryClient = useQueryClient();

  const notificationsQuery = useInfiniteQuery({
    queryKey: ['notifications', filter, categories.join(','), perPage],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await notificationsApi.getNotifications({
        filter,
        category: categories,
        page: pageParam,
        perPage,
      });
      return parseResponse(response);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.pagination.page + 1;
      return nextPage <= lastPage.pagination.total_pages ? nextPage : undefined;
    },
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const response = await notificationsApi.getUnreadCount();
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch unread count');
      }
      return response.data.unread_count;
    },
  });

  const invalidateNotifications = async () => {
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    await queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  };

  const markOneMutation = useMutation({
    mutationFn: ({ id, read }: { id: number; read: boolean }) => notificationsApi.markAsRead(id, read),
    onSuccess: invalidateNotifications,
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: invalidateNotifications,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.deleteNotification(id),
    onSuccess: invalidateNotifications,
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => notificationsApi.bulkDelete(ids),
    onSuccess: invalidateNotifications,
  });

  const allNotifications: NotificationItem[] = notificationsQuery.data?.pages.flatMap((page) => page.notifications) ?? [];

  return {
    notifications: allNotifications,
    pagination: notificationsQuery.data?.pages.at(-1)?.pagination,
    unreadCount: unreadCountQuery.data ?? 0,
    isLoading: notificationsQuery.isLoading || unreadCountQuery.isLoading,
    isError: notificationsQuery.isError || unreadCountQuery.isError,
    hasNextPage: notificationsQuery.hasNextPage,
    isFetchingNextPage: notificationsQuery.isFetchingNextPage,
    fetchNextPage: notificationsQuery.fetchNextPage,
    markAsRead: (id: number) => markOneMutation.mutateAsync({ id, read: true }),
    markAsUnread: (id: number) => markOneMutation.mutateAsync({ id, read: false }),
    markAllAsRead: () => markAllMutation.mutateAsync(),
    deleteNotification: (id: number) => deleteMutation.mutateAsync(id),
    bulkDelete: (ids: number[]) => bulkDeleteMutation.mutateAsync(ids),
    refresh: invalidateNotifications,
  };
}
