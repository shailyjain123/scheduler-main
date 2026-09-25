'use client';

import React, { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import PlanSettings from '@/components/settings/plan-settings';

import LoadingSkeleton from './loading';

export default function PlanSettingsPage() {
  const { fetchSettings, isLoading, settings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (isLoading && !settings) {
    return <LoadingSkeleton />;
  }

  return <PlanSettings />;
}
