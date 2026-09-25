'use client';

import { ReactNode, useEffect } from 'react';
import { useAuthStore, type User } from '@/store/authStore';
import { apiClient } from '@/services/apiClient';

/**
 * AuthProvider
 * Responsible for rehydrating the global auth state from localStorage on application mount.
 * Prevents child components from seeing an unauthenticated state during the hydration flicker.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { isHydrated, setAuth, clearAuth, setHydrated } = useAuthStore();

  useEffect(() => {
    const getTokenCookie = () => {
      const cookies = document.cookie ? document.cookie.split('; ') : [];
      const tokenPair = cookies.find((entry) => entry.startsWith('token='));
      if (!tokenPair) return null;

      const raw = tokenPair.substring('token='.length);
      if (!raw) return null;

      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    };

    // Initial hydration from localStorage / cookie
    const hydrate = async () => {
      const tokenFromStorage = localStorage.getItem('token');
      const tokenFromCookie = getTokenCookie();
      const token = tokenFromStorage || tokenFromCookie;
      const userData = localStorage.getItem('user');

      // Sync: if we have a token in localStorage but not in the cookie,
      // re-write the cookie so the Next.js middleware can see it
      if (tokenFromStorage && !tokenFromCookie) {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `token=${encodeURIComponent(tokenFromStorage)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`;
      }

      // Fast path: we have both token and cached user data in localStorage
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          // If signup_method is missing or null, it's a legacy or incomplete session.
          // We need to fetch fresh data to apply SSO restrictions.
          if (parsedUser && parsedUser.signup_method) {
            setAuth(parsedUser, token);
            return; // Done — auth restored instantly
          }
          console.info('[Auth] Cached user data is stale (missing signup_method), fetching fresh data...');
        } catch (error) {
          console.error('[Auth] Failed to parse stored user data', error);
          localStorage.removeItem('user');
          // Fall through to /users/me validation
        }
      }

      // If we have a token (from cookie or storage) but no cached user,
      // try to restore the session via the /users/me endpoint
      if (token) {
        try {
          const meResponse = await apiClient.get<{ user: User }>('/users/me');
          if (meResponse.success && meResponse.data?.user) {
            setAuth(meResponse.data.user, token);
            return;
          }

          // If response failed (success: false), clear the invalid session
          // This handles cases where:
          // - success: false with error details (token invalid/expired)
          // - success: false without error (malformed response)
          // - Network/server errors that returned unexpected response
          if (!meResponse.success) {
            console.warn('[Auth] Token validation failed, clearing session', meResponse.error || 'Response success: false');
            clearAuth();
          }
        } catch (error) {
          console.error('[Auth] Token restore via /users/me failed with network error', error);
          // Preserve token and proceed — maybe it's just a temporary network issue
          // We mark as hydrated so the app can show whatever it needs to (potentially offline or error states)
        }
      }

      // No token at all or restore skipped correctly
      setHydrated(true);
    };

    // Keep auth state in sync across tabs when token/user are changed elsewhere.
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;
      if (event.key !== 'token' && event.key !== 'user' && event.key !== null) return;

      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        // Another tab logged out — clear cookie in THIS tab's scope too,
        // otherwise the proxy will still see the stale cookie and allow access
        document.cookie = 'token=; Path=/; Max-Age=0; SameSite=Lax';
        clearAuth();
        return;
      }

      try {
        const parsedUser = JSON.parse(userData);
        setAuth(parsedUser, token);
      } catch (error) {
        console.error('[Auth] Failed to parse synced user data', error);
        document.cookie = 'token=; Path=/; Max-Age=0; SameSite=Lax';
        clearAuth();
      }
    };

    void hydrate();
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [setAuth, clearAuth, setHydrated]);

  // Show a premium splash screen during initial hydration to prevent layout shifts or premature redirects
  if (!isHydrated) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
        <div className="relative mb-8">
          {/* Animated Logo Placeholder */}
          <div className="w-16 h-16 rounded-2xl bg-[#5C6EFF] flex items-center justify-center shadow-2xl shadow-[#5C6EFF]/40 animate-pulse">
            <span className="text-white font-bold text-2xl tracking-tighter">S</span>
          </div>
          <div className="absolute -inset-4 bg-[#5C6EFF]/10 rounded-full blur-2xl animate-pulse delay-700" />
        </div>

        <h2 className="text-xl font-bold text-[#191c1e] tracking-tight mb-2">Schedulr</h2>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className="w-1 h-1 rounded-full bg-[#5C6EFF] animate-bounce" />
          <div className="w-1 h-1 rounded-full bg-[#5C6EFF] animate-bounce delay-150" />
          <div className="w-1 h-1 rounded-full bg-[#5C6EFF] animate-bounce delay-300" />
        </div>

        <p className="fixed bottom-12 text-[10px] font-bold uppercase tracking-[0.2em] text-[#757686] opacity-40">
          Intelligent Concierge Platform
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
