import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api/client';

export interface Notification {
  id: string | number;
  title: string;
  description: string;
  category: string;
  notification_type: string;
  read_at: string | null;
  created_at: string;
  action_url?: string;
  actor?: {
    id: number;
    full_name: string;
    avatar_url?: string;
  };
  metadata?: Record<string, any>;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  
  fetchNotifications: (reset?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  updateNotification: (notification: Notification) => void;
  setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      hasMore: true,
      page: 1,

      fetchNotifications: async (reset = false) => {
        const { page, notifications, isLoading } = get();
        if (isLoading) return;

        set({ isLoading: true });
        
        try {
          const currentPage = reset ? 1 : page;
          const response = await apiClient.get<any>(`/notifications?page=${currentPage}&per_page=20`);
          
          if (response.success && response.data) {
            const newNotifications = response.data;
            set({
              notifications: reset ? newNotifications : [...notifications, ...newNotifications],
              unreadCount: response.unread_count || 0,
              hasMore: newNotifications.length === 20,
              page: currentPage + 1,
            });
          }
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      markAsRead: async (id: string | number) => {
        try {
          const response = await apiClient.patch<any>(`/notifications/${id}/mark_as_read`, {});
          if (response.success) {
            set((state) => ({
              notifications: state.notifications.map((n) => 
                n.id === id || n.id.toString() === id.toString() ? { ...n, read_at: new Date().toISOString() } : n
              ),
              unreadCount: response.unread_count,
            }));
          }
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      },

      markAllAsRead: async () => {
        try {
          const response = await apiClient.patch<any>('/notifications/mark_all_as_read', {});
          if (response.success) {
            set((state) => ({
              notifications: state.notifications.map((n) => ({ ...n, read_at: new Date().toISOString() })),
              unreadCount: 0,
            }));
          }
        } catch (error) {
          console.error('Failed to mark all as read:', error);
        }
      },

      addNotification: (notification: Notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },

      updateNotification: (notification: Notification) => {
        set((state) => {
          const index = state.notifications.findIndex(
            (item) => item.id === notification.id || item.id.toString() === notification.id.toString()
          );
          if (index === -1) {
            return { notifications: [notification, ...state.notifications] };
          }

          const notifications = state.notifications.slice();
          notifications[index] = { ...notifications[index], ...notification };
          return { notifications };
        });
      },

      setUnreadCount: (count: number) => {
        set({ unreadCount: count });
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({ unreadCount: state.unreadCount }),
    }
  )
);
