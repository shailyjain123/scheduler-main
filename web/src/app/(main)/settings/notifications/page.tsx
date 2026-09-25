'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import NotificationsSettings from '@/components/settings/notifications-settings';

import SettingsSkeleton from '@/components/skeletons/SettingsSkeleton';

export default function SettingsNotificationsPage() {
  const { settings, isLoading, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (isLoading && !settings) {
    return <SettingsSkeleton />;
  }

  return <NotificationsSettings />;
}
