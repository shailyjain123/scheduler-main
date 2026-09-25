import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiResponse } from '../api/client';
import { useAuthStore } from '@/store/authStore';

export interface Integration {
  id: string;
  name: string;
  provider: string;
  isConnected: boolean;
  isValid?: boolean;
  email?: string;
  icon: string;
  color: string;
  bg: string;
  desc: string;
  category: string;
}

const INTEGRATIONS_CONFIG: Omit<Integration, 'isConnected'>[] = [
  { 
    id: 'google', 
    name: 'Google Calendar', 
    provider: 'google', 
    icon: 'calendar_month', 
    color: 'text-[#4285F4]', 
    bg: 'bg-[#4285F4]/10', 
    desc: 'Conflict checks and event synchronization',
    category: 'Calendar'
  },
  { 
    id: 'google_meet', 
    name: 'Google Meet', 
    provider: 'google', 
    icon: 'videocam', 
    color: 'text-[#00AC47]', 
    bg: 'bg-[#00AC47]/10', 
    desc: 'Automatic meeting link generation',
    category: 'Video'
  },
  { 
    id: 'outlook', 
    name: 'Outlook Calendar', 
    provider: 'microsoft', 
    icon: 'event', 
    color: 'text-[#0078D4]', 
    bg: 'bg-[#0078D4]/10', 
    desc: 'Sync with your Microsoft ecosystem',
    category: 'Calendar'
  },
  { 
    id: 'teams', 
    name: 'Microsoft Teams', 
    provider: 'microsoft', 
    icon: 'groups', 
    color: 'text-[#6264A7]', 
    bg: 'bg-[#6264A7]/10', 
    desc: 'Enterprise video communication',
    category: 'Video'
  },
  { 
    id: 'slack', 
    name: 'Slack', 
    provider: 'slack', 
    icon: 'chat', 
    color: 'text-[#E01E5A]', 
    bg: 'bg-[#E01E5A]/10', 
    desc: 'Real-time booking notifications',
    category: 'Communication'
  },
  { 
    id: 'zoom', 
    name: 'Zoom Video', 
    provider: 'zoom', 
    icon: 'videocam', 
    color: 'text-[#2D8CFF]', 
    bg: 'bg-[#2D8CFF]/10', 
    desc: 'Connect your personal meeting room',
    category: 'Video'
  }
];

export function useIntegrations() {
  const { user, setAuth } = useAuthStore();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const refreshIntegrations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<ApiResponse>('/integrations');
      if (response.success && response.data) {
        const backendIntegrations = (response.data as any).integrations || {};
        
        const updated = INTEGRATIONS_CONFIG.map(config => {
          const status = backendIntegrations[config.id] || { connected: false };
          return {
            ...config,
            isConnected: status.connected,
            isValid: status.valid !== false, // Use server status, default to true if not explicitly false
            email: status.email
          };
        });
        setIntegrations(updated as Integration[]);
      }
    } catch (error) {
      console.error('Failed to refresh integrations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial sync from cached user object for immediate UI response
    if (user) {
      const connectedIds = (user.integrations?.connected || []) as string[];
      const updated = INTEGRATIONS_CONFIG.map(config => ({
        ...config,
        isConnected: connectedIds.includes(config.id),
        isValid: true // Default to true until backend refresh confirms otherwise
      }));
      setIntegrations(updated);
    }
    
    // 2. Always fetch definitive state from backend
    refreshIntegrations();
  }, [user, refreshIntegrations]);

  const connect = async (id: string) => {
    setConnectingId(id);
    const config = INTEGRATIONS_CONFIG.find(c => c.id === id);
    if (!config) return;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('oauth_integration_id', id);
    }

    const token = localStorage.getItem('token');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) {
      throw new Error('NEXT_PUBLIC_API_URL is required for integration redirects');
    }
    window.location.href = `${backendUrl}/api/v1/auth/${config.provider}/authorize?origin=settings&token=${token}&integration=${id}`;
  };

  const disconnect = async (id: string) => {
    setConnectingId(id);
    try {
      const response = await apiClient.delete<ApiResponse>(`/integrations/${id}`);
      if (response.success) {
        await refreshIntegrations();
        return { success: true };
      }
      return { success: false, message: response.message || 'Failed to disconnect' };
    } catch (error) {
      return { success: false, message: 'An unexpected error occurred' };
    } finally {
      setConnectingId(null);
    }
  };

  return {
    integrations,
    isLoading,
    connectingId,
    connect,
    disconnect,
    refreshIntegrations
  };
}
