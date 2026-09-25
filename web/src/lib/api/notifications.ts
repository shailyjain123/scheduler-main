import { apiClient } from './client';

export type NotificationFilter = 'all' | 'unread' | 'read';
export type NotificationCategory = 'meetings' | 'integrations' | 'onboarding' | 'contacts' | 'system' | 'plan' | 'credit';

export interface NotificationItem {
  id: number;
  user_id: number;
  notification_type: 'booking' | 'insight' | 'cancellation' | 'reschedule' | 'payment' | string;
  category: NotificationCategory;
  event_name: string;
  title: string;
  description: string;
  read_at: string | null;
  grouped_count: number;
  metadata: Record<string, unknown>;
  priority: 'normal' | 'high';
  action_url: string | null;
  created_at: string;
  updated_at: string;
  last_occurred_at: string | null;
}

export interface NotificationPagination {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unread_count: number;
  pagination: NotificationPagination;
}

interface GetNotificationsParams {
  filter?: NotificationFilter;
  category?: NotificationCategory[];
  page?: number;
  perPage?: number;
}

export const notificationsApi = {
  getNotifications: ({ filter = 'all', category = [], page = 1, perPage = 20 }: GetNotificationsParams = {}) => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('filter', filter);
    if (category.length > 0) params.set('category', category.join(','));
    params.set('page', String(page));
    params.set('per_page', String(perPage));

    return apiClient.get<NotificationsResponse>(`/notifications?${params.toString()}`);
  },

  getUnreadCount: () => apiClient.get<{ unread_count: number }>('/notifications/unread_count'),

  markAsRead: (id: number) => apiClient.post(`/notifications/${id}/mark_as_read`, {}),

  markAllAsRead: () => apiClient.post('/notifications/mark_all_as_read', {}),

  deleteNotification: (id: number) => apiClient.delete(`/notifications/${id}`),

  bulkDelete: (ids: number[]) =>
    apiClient.delete(`/notifications/bulk_destroy?ids[]=${ids.join('&ids[]=')}`)
};
