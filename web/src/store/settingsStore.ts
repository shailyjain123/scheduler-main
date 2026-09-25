import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/authStore';

export interface EmailReminder {
  offset: string;
  recipient: string;
  enabled: boolean;
}

export interface SMSReminder {
  offset: string;
  recipient: string;
  enabled: boolean;
}

export interface PushNotificationsConfig {
  new_booking: boolean;
  cancellation: boolean;
  reschedule: boolean;
  meeting_soon: boolean;
  no_show: boolean;
}

export interface UserSettings {
  id: number;
  user_id: number;
  email_reminders_enabled: boolean;
  email_reminders_config: EmailReminder[];
  sms_reminders_enabled: boolean;
  sms_reminders_config: SMSReminder[];
  push_notifications_config: PushNotificationsConfig;
  buffer_before: number;
  buffer_after: number;
  minimum_notice_value: number;
  minimum_notice_unit: 'Minutes' | 'Hours' | 'Days';
  booking_range_type: 'indefinitely' | 'days';
  booking_range_count: number;
  max_bookings_per_day: number | null;
  timezone: string;
  plan_type: 'free' | 'starter' | 'pro' | 'enterprise' | 'ultimate' | 'premium';
  preferred_currency: string;
  billing_cycle: 'monthly' | 'yearly' | 'quarterly';
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  days_remaining: number;
  plan_expired: boolean;
  credits_exhausted: boolean;
  cancel_at_period_end: boolean;
  pending_plan_change: {
    plan_type?: string;
    billing_cycle?: string;
  };
}

interface SettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  updateReminder: (type: 'email' | 'sms', index: number, reminder: Partial<EmailReminder | SMSReminder>) => Promise<void>;
  addReminder: (type: 'email' | 'sms') => Promise<void>;
  removeReminder: (type: 'email' | 'sms', index: number) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<UserSettings>('/settings');
      if (response.success && response.data) {
        set({ settings: response.data, isLoading: false });
      } else {
        set({ error: response.error?.message || 'Failed to fetch settings', isLoading: false });
      }
    } catch (_err) {
      set({ error: 'An unexpected error occurred', isLoading: false });
    }
  },

  updateSettings: async (updates) => {
    const currentSettings = get().settings;
    if (!currentSettings) return;
    const authStore = useAuthStore.getState();
    const currentAuthUser = authStore.user;
    const currentAuthToken = authStore.token;

    // Optimistic update
    const updatedSettings = { ...currentSettings, ...updates };
    set({ settings: updatedSettings });

    if (updates.timezone && currentAuthUser) {
      authStore.setAuth({ ...currentAuthUser, timezone: updates.timezone }, currentAuthToken);
    }

    if (updates.plan_type && currentAuthUser) {
      authStore.setAuth({ ...currentAuthUser, plan_type: updates.plan_type as any }, currentAuthToken);
    }

    if (updates.preferred_currency && currentAuthUser) {
      authStore.setAuth({ ...currentAuthUser, preferred_currency: updates.preferred_currency }, currentAuthToken);
    }

    if (updates.billing_cycle && currentAuthUser) {
      authStore.setAuth({ ...currentAuthUser, billing_cycle: updates.billing_cycle }, currentAuthToken);
    }

    try {
      const response = await apiClient.patch<UserSettings>('/settings', { settings: updates });
      if (response.success && response.data) {
        set({ settings: response.data });
      } else {
        // Rollback
        set({ settings: currentSettings, error: response.error?.message || 'Failed to update settings' });
        if (updates.timezone && currentAuthUser) {
          authStore.setAuth(currentAuthUser, currentAuthToken);
        }
        if (updates.plan_type && currentAuthUser) {
          authStore.setAuth(currentAuthUser, currentAuthToken);
        }
        if (updates.preferred_currency && currentAuthUser) {
          authStore.setAuth(currentAuthUser, currentAuthToken);
        }
        if (updates.billing_cycle && currentAuthUser) {
          authStore.setAuth(currentAuthUser, currentAuthToken);
        }
      }
    } catch (_err) {
      // Rollback
      set({ settings: currentSettings, error: 'An unexpected error occurred' });
      if (updates.timezone && currentAuthUser) {
        authStore.setAuth(currentAuthUser, currentAuthToken);
      }
      if (updates.plan_type && currentAuthUser) {
        authStore.setAuth(currentAuthUser, currentAuthToken);
      }
      if (updates.preferred_currency && currentAuthUser) {
        authStore.setAuth(currentAuthUser, currentAuthToken);
      }
      if (updates.billing_cycle && currentAuthUser) {
        authStore.setAuth(currentAuthUser, currentAuthToken);
      }
    }
  },

  updateReminder: async (type, index, reminderUpdate) => {
    const currentSettings = get().settings;
    if (!currentSettings) return;

    const configKey = type === 'email' ? 'email_reminders_config' : 'sms_reminders_config';
    if (type === 'email') {
      const config = [...currentSettings.email_reminders_config];
      config[index] = { ...config[index], ...reminderUpdate } as EmailReminder;
      await get().updateSettings({ email_reminders_config: config });
    } else {
      const config = [...currentSettings.sms_reminders_config];
      config[index] = { ...config[index], ...reminderUpdate } as SMSReminder;
      await get().updateSettings({ sms_reminders_config: config });
    }
  },

  addReminder: async (type) => {
    const currentSettings = get().settings;
    if (!currentSettings) return;

    const configKey = type === 'email' ? 'email_reminders_config' : 'sms_reminders_config';
    const newReminder = type === 'email' 
      ? { offset: '1 hour before', recipient: 'guest', enabled: true }
      : { offset: '30 minutes before', recipient: 'guest', enabled: true };
    
    const config = [...currentSettings[configKey], newReminder];
    await get().updateSettings({ [configKey]: config });
  },

  removeReminder: async (type, index) => {
    const currentSettings = get().settings;
    if (!currentSettings) return;

    const configKey = type === 'email' ? 'email_reminders_config' : 'sms_reminders_config';
    const config = currentSettings[configKey].filter((_, i) => i !== index);
    
    await get().updateSettings({ [configKey]: config });
  },

  cancelSubscription: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post<UserSettings>('/settings/cancel_subscription', {});
      if (response.success && response.data) {
        set({ settings: response.data, isLoading: false });
      } else {
        set({ error: response.error?.message || 'Failed to cancel subscription', isLoading: false });
      }
    } catch (_err) {
      set({ error: 'An unexpected error occurred', isLoading: false });
    }
  },

  reactivateSubscription: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post<UserSettings>('/settings/reactivate_subscription', {});
      if (response.success && response.data) {
        set({ settings: response.data, isLoading: false });
      } else {
        set({ error: response.error?.message || 'Failed to reactivate subscription', isLoading: false });
      }
    } catch (_err) {
      set({ error: 'An unexpected error occurred', isLoading: false });
    }
  },
}));
