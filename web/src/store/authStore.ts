import { create } from 'zustand';
import { normalizeWeeklyAvailability } from '@/lib/availability';

const TOKEN_COOKIE_NAME = 'token';
const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const writeTokenCookie = (token: string) => {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${TOKEN_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
};

const clearTokenCookie = () => {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
};

export interface User {
  id: number;
  email: string;
  full_name: string;
  status: string;
  onboarding_completed: boolean;
  onboarding_stage: number;
  email_verification_enabled?: boolean;
  username?: string;
  bio?: string;
  timezone?: string;
  avatar_url?: string;
  phone_number?: string;
  workspace_name?: string;
  language?: string;
  work_type?: string;
  default_meeting_duration?: number;
  default_buffer_time?: number;
  signup_method?: string;
  plan_type?: 'free' | 'starter' | 'pro' | 'enterprise' | 'ultimate' | 'premium';
  billing_cycle?: 'monthly' | 'yearly' | 'quarterly';
  total_credits?: number;
  used_credits?: number;
  remaining_credits?: number;
  plan_started_at?: string | null;
  plan_expires_at?: string | null;
  days_remaining?: number;
  plan_expired?: boolean;
  credits_exhausted?: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: User, token?: string | null) => void;
  clearAuth: () => void;
  setHydrated: (isHydrated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isHydrated: false,
  isLoading: false,
  error: null,
  setAuth: (user, token = null) => {
    const onboardingStage = user.onboarding_stage ?? 1;
    const normalizedUser = {
      ...user,
      onboarding_stage: onboardingStage,
      availability: normalizeWeeklyAvailability(user?.availability),
    };

    if (typeof window !== 'undefined') {
      if (token) {
        // A new token was provided — store it everywhere
        localStorage.setItem('token', token);
        writeTokenCookie(token);
      }
      // When token is null/undefined, preserve whatever is already stored.
      // Do NOT remove the existing token — this prevents the hydration
      // race condition where setAuth(user) clears an active session.
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    }

    // Resolve the effective token: new token, or the one already in state/storage
    const effectiveToken = token
      || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

    set({ user: normalizedUser, token: effectiveToken, isHydrated: true, error: null });
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      clearTokenCookie();
    }
    set({ user: null, token: null, isHydrated: true });
  },
  setHydrated: (isHydrated) => set({ isHydrated }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
