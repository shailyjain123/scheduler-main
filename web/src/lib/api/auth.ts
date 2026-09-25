import { apiClient } from './client';

const writeTokenCookie = (token: string) => {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `token=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`;
};

const clearTokenCookie = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'token=; Path=/; Max-Age=0; SameSite=Lax';
};

export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  email_verification_enabled?: boolean;
  username?: string;
  bio?: string;
  phone_number?: string;
  workspace_name?: string;
  language?: string;
  timezone?: string;
  avatar_url?: string;
  default_buffer_time?: number;
  created_at: string;
}

export interface AuthData {
  token: string;
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthData> {
    const response = await apiClient.post<AuthData>('/auth/login', {
      email,
      password,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Login failed');
    }

    const { token, user } = response.data!;

    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      writeTokenCookie(token);
    }

    return { token, user };
  },

  async signup(email: string, password: string, firstName?: string, lastName?: string): Promise<AuthData> {
    const response = await apiClient.post<AuthData>('/auth/signup', {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Signup failed');
    }

    const { token, user } = response.data!;

    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      writeTokenCookie(token);
    }

    return { token, user };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        clearTokenCookie();
      }
    }
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<{ user: User }>('/users/me');

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch user info');
    }

    return response.data!.user;
  },

  async updateProfile(userId: number, data: Partial<User>): Promise<User> {
    const response = await apiClient.patch<{ user: User }>(`/users/${userId}`, {
      user: data,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update profile');
    }

    return response.data!.user;
  },

  async deleteAccount(userId: number): Promise<void> {
    const response = await apiClient.delete(`/users/${userId}`);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete account');
    }

    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      clearTokenCookie();
    }
  },

  async changePassword(data: any): Promise<any> {
    const response = await apiClient.post('/auth/change-password', data);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update password');
    }
    return response.data;
  },

  async getSessions(): Promise<any[]> {
    const response = await apiClient.get<any[]>('/auth/sessions');
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch sessions');
    }
    return response.data!;
  },

  async revokeSession(id: number): Promise<void> {
    const response = await apiClient.delete(`/auth/sessions/${id}`);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to revoke session');
    }
  },

  async revokeOtherSessions(): Promise<void> {
    const response = await apiClient.delete('/auth/sessions');
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to revoke sessions');
    }
  },

  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;

    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getStoredUser();
  },
};
