'use client';

import { useEffect } from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';

export const useNotificationCable = () => {
  const { user, token } = useAuthStore();
  const { addNotification, updateNotification, setUnreadCount } = useNotificationStore();

  useEffect(() => {
    if (!user || !token) return;

    // Standard WebSocket URL - adjust if using a specific path
    const wsUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws')}/cable?token=${token}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      // Subscribe to NotificationsChannel
      const subscribeMsg = {
        command: 'subscribe',
        identifier: JSON.stringify({ channel: 'NotificationsChannel' }),
      };
      socket.send(JSON.stringify(subscribeMsg));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ping' || !data.message) return;

      const { type, notification, unread_count } = data.message;

      if (type === 'NEW_NOTIFICATION') {
        addNotification(notification);
        // Optional: show a toast or browser notification
        if (Notification.permission === 'granted' && document.hidden) {
          new Notification(notification.title, { body: notification.description });
        }
      } else if (type === 'NOTIFICATION_UPDATED' && notification) {
        updateNotification(notification);
        if (typeof unread_count === 'number') {
          setUnreadCount(unread_count);
        }
      } else if (type === 'UNREAD_COUNT_UPDATE') {
        setUnreadCount(unread_count);
      }
    };

    return () => {
      socket.close();
    };
  }, [user, token, addNotification, updateNotification, setUnreadCount]);
};
