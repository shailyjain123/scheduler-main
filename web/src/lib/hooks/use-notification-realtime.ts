'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';

const POLLING_INTERVAL_MS = 30_000;

function resolveCableUrl(apiUrl: string): string {
  const url = new URL(apiUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/cable';
  return url.toString();
}

export function useNotificationRealtime() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const authToken = useAuthStore((state) => state.token);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const pollerRef = useRef<number | null>(null);

  const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const cableUrl = useMemo(() => {
    if (!apiUrl) return '';
    try {
      return resolveCableUrl(apiUrl);
    } catch {
      return '';
    }
  }, [apiUrl]);

  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    };

    const startPolling = () => {
      if (pollerRef.current) return;
      pollerRef.current = window.setInterval(invalidate, POLLING_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (!pollerRef.current) return;
      window.clearInterval(pollerRef.current);
      pollerRef.current = null;
    };

    if (!token || !cableUrl) {
      startPolling();
      return () => stopPolling();
    }

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${cableUrl}?token=${encodeURIComponent(token)}`);
    } catch {
      startPolling();
      return () => stopPolling();
    }

    ws.onopen = () => {
      setIsRealtimeConnected(true);
      stopPolling();
      invalidate();
      ws?.send(
        JSON.stringify({
          command: 'subscribe',
          identifier: JSON.stringify({ channel: 'NotificationsChannel' }),
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as {
          type?: string;
          message?: {
            event?: string;
            unread_count?: number;
            notification?: { title?: string };
          };
        };

        if (parsed.type) return;

        const message = parsed.message;
        if (!message?.event || !message.event.startsWith('notification.')) return;

        if (typeof message.unread_count === 'number') {
          queryClient.setQueryData(['notifications-unread-count'], message.unread_count);
        }

        invalidate();

        if ((message.event === 'notification.created' || message.event === 'notification.grouped') && message.notification?.title) {
          pushToast(message.notification.title, 'info');
        }
      } catch {
        // Ignore malformed payloads.
      }
    };

    ws.onerror = () => {
      setIsRealtimeConnected(false);
      startPolling();
    };

    ws.onclose = () => {
      setIsRealtimeConnected(false);
      startPolling();
    };

    return () => {
      ws?.close();
      setIsRealtimeConnected(false);
      stopPolling();
    };
  }, [cableUrl, pushToast, queryClient, token]);

  return { isRealtimeConnected };
}
