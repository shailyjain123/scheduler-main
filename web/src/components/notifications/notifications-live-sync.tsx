'use client';

import { useNotificationCable } from '@/hooks/useNotificationCable';

export default function NotificationsLiveSync() {
  useNotificationCable();
  return null;
}
