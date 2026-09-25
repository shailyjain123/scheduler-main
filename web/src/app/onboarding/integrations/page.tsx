'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { apiClient } from '../../../services/apiClient';
import { useRouter } from 'next/navigation';
import { useOnboardingProtection } from '../../../hooks/useOnboardingProtection';
import OAuthErrorAlert from '../../../components/OAuthErrorAlert';
import { onboardingPagePath } from '@/lib/routes';
import { ApiResponse } from '@/lib/api/client';

export default function IntegrationsPage() {
  const protectionStatus = useOnboardingProtection(2);
  const { user, setAuth } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<{ code: string; message: string; provider?: string } | null>(null);
  const [connectedTools, setConnectedTools] = useState<string[]>([]);

  const providerMapping: Record<string, string> = {
    google: 'google',
    google_meet: 'google',
    outlook: 'microsoft',
    teams: 'microsoft',
    slack: 'slack',
    zoom: 'zoom',
  };

  const getProvider = (toolId: string) => providerMapping[toolId] || toolId;

  useEffect(() => {
    if (user?.integrations) {
      const integrations = user.integrations as { connected?: string[] };
      setConnectedTools(Array.from(new Set((integrations.connected || []).map((tool: string) => tool.toString()))));
    }
  }, [user]);

  // Handle OAuth Redirect Fragments
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const success = params.get('success');
    const errorCode = params.get('error');
    const errorMessage = params.get('message');

    if (success) {
      // Clear error state on success
      setError(null);
      // Refresh user data to get updated integrations
      const refreshUser = async () => {
        try {
          const response = await apiClient.get<ApiResponse>('/users/me');
          if (response.success && response.data) {
            setAuth((response.data as any).user, localStorage.getItem('token') || '');
          }
        } catch {
          console.error('Failed to refresh user data:');
        }
      };
      refreshUser();
    } else if (errorCode) {
      // Use structured error from error handler
      const provider = typeof window !== 'undefined' ? sessionStorage.getItem('oauth_provider_id') : null;
      setError({
        code: errorCode,
        message: errorMessage ? decodeURIComponent(errorMessage) : `Authentication failed: ${errorCode}`,
        provider: provider || undefined
      });
      // Clear stored provider
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('oauth_provider_id');
      }
    }

    // Clear hash
    window.history.replaceState(null, '', window.location.pathname);
  }, [setAuth]);

  const integrationCategories = [
    {
      title: 'Video Conferencing',
      items: [
        { id: 'google_meet', name: 'Google Meet', desc: 'Auto-generate unique meeting links', icon: 'videocam', color: 'text-[#00AC47]', bg: 'bg-[#00AC47]/10' },
        { id: 'zoom', name: 'Zoom Video', desc: 'Connect to sync your personal room', icon: 'videocam', color: 'text-[#2D8CFF]', bg: 'bg-[#2D8CFF]/10' },
        { id: 'teams', name: 'Microsoft Teams', desc: 'Collaborate with your enterprise team', icon: 'groups', color: 'text-[#6264A7]', bg: 'bg-[#6264A7]/10' },
      ]
    },
    {
      title: 'Calendar',
      items: [
        { id: 'google', name: 'Google Calendar', desc: 'Check for conflicts and sync events', icon: 'calendar_month', color: 'text-[#4285F4]', bg: 'bg-[#4285F4]/10' },
        { id: 'outlook', name: 'Outlook Calendar', desc: 'Primary calendar for Outlook users', icon: 'event', color: 'text-[#0078D4]', bg: 'bg-[#0078D4]/10' },
      ]
    },
    {
      title: 'Communication',
      items: [
        { id: 'slack', name: 'Slack', desc: 'Real-time booking notifications', icon: 'chat', color: 'text-[#E01E5A]', bg: 'bg-[#E01E5A]/10' },
      ]
    }
  ];

  const handleConnect = async (id: string) => {
    const isConnected = connectedTools.includes(id);
    const provider = getProvider(id);
    
    if (isConnected) {
      // Handle Disconnect
      setConnectingId(id);
      try {
        const response = await apiClient.delete<ApiResponse>(`/integrations/${id}`);
        if (response.success) {
          setConnectedTools(prev => prev.filter(t => t !== id));
          setError(null); // Clear error on success
        } else {
          setError({
            code: 'DISCONNECT_FAILED',
            message: response.message || `Failed to disconnect ${id}`
          });
        }
      } catch {
        setError({
          code: 'DISCONNECT_ERROR',
          message: `An unexpected error occurred while disconnecting ${id}`
        });
      } finally {
        setConnectingId(null);
      }
    } else {
      const { token } = useAuthStore.getState();
      
      // Store the provider name for error display on callback
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('oauth_provider_id', id);
      }
      
      const backendUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!backendUrl) {
        throw new Error('NEXT_PUBLIC_API_URL is required for integration redirects');
      }
      window.location.href = `${backendUrl}/api/v1/auth/${provider}/authorize?origin=onboarding&token=${token}&integration=${id}`;
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<ApiResponse>('/onboarding/integrations', { integrations: { connected: connectedTools } });
      if (response.success) {
        if (user) {
          setAuth({ ...user, onboarding_stage: 3, integrations: { connected: connectedTools } }, localStorage.getItem('token') || '');
        }
        router.push(onboardingPagePath(3));
      } else {
        setError({
          code: 'SAVE_FAILED',
          message: response.error?.message || 'Failed to save progress'
        });
      }
    } catch {
      setError({
        code: 'SAVE_ERROR',
        message: 'An unexpected error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (user) {
      setAuth({ ...user, onboarding_stage: 1 }, localStorage.getItem('token') || '');
    }
    router.push(onboardingPagePath(1));
  };

  // Show loading screen while checking auth
  if (protectionStatus.isLoading || !protectionStatus.isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[640px]">
      <div className="w-full bg-white rounded-2xl shadow-[0_16px_48px_rgba(17,24,39,0.06)] p-8 border border-[#e1e2e4]">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold text-[#191c1e] mb-1.5">Integrations setup</h2>
          <p className="text-[#454655] text-[13px]">Connect your calendar and meeting providers to enable scheduling automation.</p>
        </div>

        <div className="space-y-8">
          {error && (
            <OAuthErrorAlert
              errorCode={error.code}
              errorMessage={error.message}
              onDismiss={() => setError(null)}
              onRetry={() => {
                // Retry by clearing error and allowing user to try connecting again
                setError(null);
              }}
              providerId={error.provider}
            />
          )}

          {integrationCategories.map((cat) => (
            <div key={cat.title} className="space-y-3.5">
              <h3 className="text-[10px] font-bold text-[#757686] uppercase tracking-[0.15em] ml-1">
                {cat.title}
              </h3>
              <div className="space-y-2.5">
                {cat.items.map((item) => {
                  const isConnected = connectedTools.includes(item.id);
                  const isConnecting = connectingId === item.id;

                  return (
                    <div 
                      key={item.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 ${
                        isConnected 
                        ? 'bg-[#5C6EFF]/5 border-[#5C6EFF]/20 shadow-sm' 
                        : 'bg-white border-[#e1e2e4] hover:border-[#c5c5d7] hover:bg-[#f8f9fb]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center ${item.color} shadow-sm border border-black/5`}>
                          <span className="material-symbols-outlined text-xl">{item.icon}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-[13px] text-[#191c1e]">{item.name}</h4>
                          <p className="text-[11px] text-[#757686] font-medium leading-tight">{item.desc}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {isConnected && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 rounded-full border border-green-200 group-hover:hidden transition-all">
                            <span className="material-symbols-outlined text-[9px] text-green-600 font-bold">check</span>
                            <span className="text-[8px] font-bold text-green-600 uppercase tracking-widest">Connected</span>
                          </div>
                        )}
                        
                        <button 
                          onClick={() => handleConnect(item.id)}
                          disabled={isConnecting}
                          className={`min-w-[90px] h-8 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                            isConnected 
                            ? 'bg-white text-[#757686] border border-[#e1e2e4] hover:bg-[#edeef0]' 
                            : 'bg-[#191c1e] text-white hover:bg-[#454655]'
                          } disabled:opacity-50`}
                        >
                          {isConnecting ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-3 w-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                              <span>...</span>
                            </div>
                          ) : isConnected ? (
                            'Disconnect'
                          ) : (
                            'Connect'
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Integration guidance */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#f8f9fb] to-[#edeef0] border border-[#e1e2e4] mt-6 flex gap-4 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#5C6EFF]/5 rounded-full blur-2xl group-hover:bg-[#5C6EFF]/10 transition-colors" />
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#5C6EFF] shadow-sm border border-[#e1e2e4] shrink-0">
              <span className="material-symbols-outlined text-[20px]">lightbulb</span>
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-[#191c1e] mb-1">Recommended configuration</h4>
              <p className="text-[11px] text-[#757686] font-medium leading-relaxed">
                Linking a calendar and video provider enables conflict checks, automatic meeting links, and faster booking operations.
              </p>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="pt-8 flex items-center justify-between border-t border-[#e1e2e4]">
            <button 
              type="button"
              className="text-[13px] font-bold text-[#757686] hover:text-[#191c1e] transition-colors flex items-center gap-1.5 group"
              onClick={handleBack}
            >
              <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
              Back
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-[#5C6EFF] hover:bg-[#3649db] text-white px-10 h-12 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-[#5C6EFF]/20 disabled:opacity-70 disabled:cursor-not-allowed min-w-[160px] group"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-sm">Continue</span>
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-2 transition-transform">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
