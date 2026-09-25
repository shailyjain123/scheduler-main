import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  email: string;
  full_name: string;
  status: string;
  onboarding_stage?: number;
  onboarding_completed?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: User, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  setAuth: async (user, token) => {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, token, error: null });
  },
  clearAuth: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ user: null, token: null });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  initialize: async () => {
    const token = await AsyncStorage.getItem('token');
    const userJson = await AsyncStorage.getItem('user');
    if (token && userJson) {
      set({ token, user: JSON.parse(userJson) });
    }
  },
}));
