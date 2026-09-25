import { useAuthStore } from '@/store/authStore';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  message?: string;
  pagination?: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || '') {
    if (!baseURL) {
      throw new Error('NEXT_PUBLIC_API_URL is required for ApiClient configuration');
    }
    this.baseURL = baseURL;
  }

  private getTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;
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
  }

  private handle401(endpoint: string) {
    if (typeof window === 'undefined') return;

    // Don't clear auth or redirect if we're already on login/callback pages
    // or if the endpoint is specifically allowed to fail
    if (this.shouldBypass401Redirect(endpoint)) return;

    const store = useAuthStore.getState();
    if (!store.isHydrated) {
      return;
    }

    // Never redirect during login flow or verification
    if (window.location.pathname === '/login' || window.location.pathname.startsWith('/verify-otp')) {
      return;
    }

    console.warn(`[ApiClient] 401 Unauthorized at ${endpoint}. Path: ${window.location.pathname}. Token present: ${!!store.token}`);
    
    // Only clear and redirect if we actually had a session and aren't in a bypass route
    if (store.token || store.user) {
      store.clearAuth();
      
      // Use window.location.href for a clean reset after a fraction of a second
      // only if we are on a protected route
      const protectedRoutes = ['/dashboard', '/meetings', '/availability', '/contacts'];
      const isProtectedRoute = protectedRoutes.some(route => window.location.pathname.startsWith(route));

      if (isProtectedRoute) {
        setTimeout(() => {
           if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/onboarding') && !window.location.pathname.startsWith('/callback')) {
              window.location.href = '/login';
           }
        }, 100);
      }
    }
  }

  private shouldBypass401Redirect(endpoint: string): boolean {
    const bypassList = [
      '/auth/login',
      '/auth/signup',
      '/auth/verify-otp',
      '/auth/resend-otp',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/google/',
      '/auth/microsoft/',
      '/auth/slack/',
      '/callback',
      '/users/me',
    ];
    return bypassList.some(path => endpoint.includes(path));
  }

  private async request<T>(method: string, endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || this.getTokenFromCookie() : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseURL}/api/v1${endpoint}`, {
        method,
        headers,
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });
    } catch (error) {
      console.error(`[ApiClient] Fetch failed for ${method} ${endpoint}:`, error);
      throw error;
    }

    if (response.status === 204) {
      return { success: true } as ApiResponse<T>;
    }

    const text = await response.text();
    let json: ApiResponse<T>;
    
    try {
      json = text ? JSON.parse(text) : { success: true };
    } catch {
      console.error('API Parse Error:', text);
      return { 
        success: false, 
        error: { code: 'PARSE_ERROR', message: 'Unexpected response from server' } 
      } as ApiResponse<T>;
    }

    // Handle 401 - session expired
    if (response.status === 401) {
      this.handle401(endpoint);
    }

    return json;
  }

  post<T>(endpoint: string, data?: unknown) {
    return this.request<T>('POST', endpoint, data);
  }

  get<T>(endpoint: string) {
    return this.request<T>('GET', endpoint);
  }

  patch<T>(endpoint: string, data: unknown) {
    return this.request<T>('PATCH', endpoint, data);
  }

  delete<T>(endpoint: string) {
    return this.request<T>('DELETE', endpoint);
  }
}

export const apiClient = new ApiClient();
