'use client';

import { useState, useEffect } from 'react';
import { useIntegrations, Integration } from '@/lib/hooks/use-integrations';
import OAuthErrorAlert from '@/components/OAuthErrorAlert';
import { useAuthStore } from '@/store/authStore';
import IntegrationsSkeleton from '@/components/skeletons/IntegrationsSkeleton';

export default function IntegrationsPage() {
  const { integrations, isLoading, connectingId, connect, disconnect, refreshIntegrations } = useIntegrations();
  const [error, setError] = useState<{ code: string; message: string; provider?: string } | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const success = params.get('success');
    const errorCode = params.get('error');
    const errorMessage = params.get('message');

    if (success) {
      setError(null);
      refreshIntegrations();
    } else if (errorCode) {
      const provider = typeof window !== 'undefined' ? sessionStorage.getItem('oauth_integration_id') : null;
      setError({
        code: errorCode,
        message: errorMessage ? decodeURIComponent(errorMessage) : `Authentication failed: ${errorCode}`,
        provider: provider || undefined
      });
    }

    window.history.replaceState(null, '', window.location.pathname);
  }, [refreshIntegrations]);

  const categories = ['Calendar', 'Video', 'Communication'];

  if (isLoading) {
    return <IntegrationsSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-[1020px] mx-auto pb-12">
      {error && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <OAuthErrorAlert
            errorCode={error.code}
            errorMessage={error.message}
            onDismiss={() => setError(null)}
            onRetry={() => setError(null)}
            providerId={error.provider}
          />
        </div>
      )}

      {/* Integration Categories */}
      {categories.map((category) => {
        const items = integrations.filter(i => i.category === category);
        if (items.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              {category} Tools
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <IntegrationCard 
                  key={item.id} 
                  item={item} 
                  connectingId={connectingId}
                  onConnect={() => connect(item.id)}
                  onDisconnect={() => disconnect(item.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IntegrationCard({ 
  item, 
  connectingId, 
  onConnect, 
  onDisconnect 
}: { 
  item: Integration, 
  connectingId: string | null,
  onConnect: () => void,
  onDisconnect: () => void
}) {
  const isConnecting = connectingId === item.id;

  return (
    <div className={`group relative p-5 rounded-[1.5rem] border transition-all duration-500 bg-white hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] ${
      item.isConnected 
      ? 'border-indigo-100 ring-1 ring-indigo-50/50' 
      : 'border-slate-100 hover:border-indigo-200'
    }`}>
      <div className="flex flex-col h-full gap-4">
        <div className="flex items-start justify-between">
          <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center ${item.color} shadow-sm border border-black/5 group-hover:scale-105 transition-transform duration-500`}>
            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
          </div>
          
          {item.isConnected ? (
            item.isValid ? (
              <div className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100">
                <span className="w-1 h-1 rounded-full bg-red-500"></span>
                <span className="text-[9px] font-black uppercase tracking-widest">Expired</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-50 text-slate-400 rounded-full border border-slate-100">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#94a3b8]">Offline</span>
            </div>
          )}
        </div>

        <div className="space-y-1 flex-1">
          <h4 className="text-base font-bold text-[#191c1e] tracking-tight">{item.name}</h4>
          {item.email && (
            <p className="text-[10px] text-indigo-600 font-bold tracking-tight truncate mb-1">
              {item.email}
            </p>
          )}
          <p className="text-[12.5px] text-slate-500 font-medium leading-relaxed">
            {item.desc}
          </p>
        </div>

        <div className="pt-3">
          <button 
            onClick={item.isConnected ? onDisconnect : onConnect}
            disabled={isConnecting}
            className={`w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-[0.1em] transition-all active:scale-[0.98] ${
              item.isConnected 
              ? 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100' 
              : 'bg-[#191c1e] text-white shadow-lg shadow-black/5 hover:bg-[#334155]'
            } disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {isConnecting ? (
              <div className="h-3 w-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : item.isConnected ? (
              <>
                <span className="material-symbols-outlined text-base">link_off</span>
                <span>Disconnect</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">link</span>
                <span>Connect</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
