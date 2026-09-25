import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, ApiResponse } from '@/services/apiClient';

export interface LocationDefault {
  type: string;
  label: string;
}

export interface IntegrationStatus {
  connected: boolean;
}

export interface LocationDefaultsData {
  recommended_default: LocationDefault;
  integrations: Record<string, IntegrationStatus>;
}

const TYPE_TO_LABEL: Record<string, string> = {
  'google_meet': 'Google Meet',
  'zoom': 'Zoom',
  'teams': 'Microsoft Teams',
  'phone': 'Phone Call',
  'in_person': 'In-person Meeting'
};

const TYPE_TO_ONBOARDING_LABEL: Record<string, string> = {
  'google_meet': 'Google Meet',
  'zoom': 'Zoom',
  'teams': 'Teams',
  'phone': 'Phone',
  'in_person': 'Physical'
};

export function useLocationDefaults() {
  const [data, setData] = useState<LocationDefaultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDefaults = useCallback(async () => {
    try {
      const response = await apiClient.get<LocationDefaultsData>('/integrations/location_defaults');
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch location defaults:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDefaults();
  }, [fetchDefaults]);

  const getLabel = useCallback((type: string, mode: 'standard' | 'onboarding' = 'standard') => {
    const map = mode === 'onboarding' ? TYPE_TO_ONBOARDING_LABEL : TYPE_TO_LABEL;
    return map[type] || 'Zoom';
  }, []);

  return useMemo(() => ({
    data,
    isLoading,
    getLabel,
    refresh: fetchDefaults
  }), [data, isLoading, getLabel, fetchDefaults]);
}
