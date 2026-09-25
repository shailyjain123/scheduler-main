'use client';

import React, { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import BookingSettings from '@/components/settings/booking-settings';

import SettingsSkeleton from '@/components/skeletons/SettingsSkeleton';

export default function BookingSettingsPage() {
  const { fetchSettings, isLoading, settings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (isLoading && !settings) {
    return <SettingsSkeleton />;
  }

  return <BookingSettings />;
}
