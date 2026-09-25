'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type User } from '@/store/authStore';
import { ApiClient } from '@/lib/api/client';

/**
 * AuthCallbackPage
 * Handles the redirect from the Rails backend after a successful OmniAuth flow.
 * Extracts the JWT token and target path from the URL parameters.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    // Parse parameters from the URL fragment (#token=...&target=...)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const token = params.get('token');
    const target = params.get('target') || '/dashboard';
    const apiBase = params.get('api_base');
    const error = params.get('error');

    if (error) {
      console.error('Auth error:', error);
      router.push(`/login#error=${error}`);
      return;
    }

    if (token) {
      const fetchUser = async () => {
        try {
          // Store token in localStorage AND cookie immediately so that:
          // 1. ApiClient can attach it as Authorization header
          // 2. Next.js middleware can read the cookie on subsequent navigations
          localStorage.setItem('token', token);
          const secure = window.location.protocol === 'https:' ? '; Secure' : '';
          document.cookie = `token=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`;

          const callbackClient = new ApiClient(apiBase || undefined);
          const response = await callbackClient.get<{ user: User }>('/users/me');
          
          if (response.success && response.data) {
            setAuth(response.data.user, token);
            // Use full navigation so Next.js middleware sees the freshly-written cookie
            window.location.assign(target);
          } else {
            throw new Error('Failed to fetch user profile');
          }
        } catch (err) {
          console.error('Callback error:', err);
          localStorage.removeItem('token');
          document.cookie = 'token=; Path=/; Max-Age=0; SameSite=Lax';
          router.push('/login#error=session_failed');
        }
      };

      fetchUser();
    } else {
      router.push('/login');
    }
  }, [router, setAuth]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <div className="w-16 h-16 border-4 border-[#5C6EFF]/20 border-t-[#5C6EFF] rounded-full animate-spin mb-8"></div>
      <h2 className="text-2xl font-bold text-[#1a1b1e] mb-2 text-center">Completing Secure Login</h2>
      <p className="text-[#6b6d76] text-center font-medium max-w-[320px]">
        We&apos;re securely syncing your profile and setting up your workspace...
      </p>
      
      {/* Premium Micro-animation logic could go here */}
      <div className="mt-12 flex items-center gap-2 group">
        <div className="w-2 h-2 rounded-full bg-[#5C6EFF]/20 animate-pulse"></div>
        <div className="w-2 h-2 rounded-full bg-[#5C6EFF]/40 animate-pulse duration-700"></div>
        <div className="w-2 h-2 rounded-full bg-[#5C6EFF]/60 animate-pulse duration-1000"></div>
      </div>
    </div>
  );
}
