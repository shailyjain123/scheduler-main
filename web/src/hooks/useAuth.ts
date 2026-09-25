import { useAuthStore, type User } from '../store/authStore';
import { apiClient, ApiResponse } from '../services/apiClient';
import { onboardingPagePath } from '@/lib/routes';

export function useAuth() {
  const { setAuth, clearAuth, setLoading, setError, isLoading, error, user } = useAuthStore();

  const extractAuthPayload = (response: ApiResponse<unknown>): { 
    token: string | null; 
    resolvedUser: User | null; 
    verificationRequired: boolean; 
    email: string | null 
  } => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (response.data || {}) as any;

    const token =
      payload.token ||
      payload.auth?.token ||
      payload.session?.token ||
      null;

    const resolvedUser =
      payload.user ||
      payload.auth?.user ||
      payload.session?.user ||
      null;

    const verificationRequired =
      payload.verification_required ||
      payload.auth?.verification_required ||
      false;

    const email = (payload.email as string | null) || ((payload.auth as Record<string, unknown>)?.email as string | null) || null;

    return { 
      token: token as string | null, 
      resolvedUser: resolvedUser as User | null, 
      verificationRequired: !!verificationRequired, 
      email: email as string | null
    };
  };

  const handleAuthResponse = async (response: ApiResponse): Promise<{ 
    success: boolean; 
    verificationRequired: boolean; 
    email?: string | null; 
    originalResponse?: ApiResponse 
  }> => {
    if (!response.success) {
      if (response.error?.code === 'EMAIL_NOT_VERIFIED') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const email = response.error.details?.email || (response.data as any)?.email || '';
        return { success: false, verificationRequired: true, email, originalResponse: response };
      }
      setError(response.error?.message || 'Authentication failed');
      return { success: false, verificationRequired: false, originalResponse: response };
    }

    const { token, resolvedUser: extractedUser, verificationRequired, email } = extractAuthPayload(response as ApiResponse<unknown>);

    if (verificationRequired) {
      return { success: true, verificationRequired: true, email };
    }

    if (!token) {
      setError('Authentication token missing in server response.');
      return { success: false, verificationRequired: false };
    }

    let resolvedUser = extractedUser;
    if (!resolvedUser) {
      const meResponse = await apiClient.get<{ user: User }>('/users/me');
      if (!meResponse.success || !meResponse.data?.user) {
        setError(meResponse.error?.message || 'Failed to load account after login.');
        return { success: false, verificationRequired: false };
      }
      resolvedUser = meResponse.data.user;
    }

    setAuth(resolvedUser, token);

    const target = !resolvedUser.onboarding_completed
      ? onboardingPagePath(resolvedUser.onboarding_stage || 1)
      : '/dashboard';

    // Use full navigation so proxy always receives the freshly written token cookie.
    window.location.assign(target);

    return { success: true, verificationRequired: false };
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      return handleAuthResponse(response);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed. Please check your connection and try again.';
      setError(errorMsg);
      return { success: false, verificationRequired: false };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (full_name: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/signup', { full_name, email, password });
      return handleAuthResponse(response);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Signup failed. Please check your input and try again.';
      setError(errorMsg);
      return { success: false, verificationRequired: false };
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/verify-otp', { email, otp });
      return handleAuthResponse(response);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Verification failed. Please try again.';
      setError(errorMsg);
      return { success: false, verificationRequired: false };
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<{ remaining_attempts: number }>('/auth/resend-otp', { email });
      if (!response.success) {
        setError(response.error?.message || 'Failed to resend OTP');
        return { success: false };
      }
      return { success: true, remainingAttempts: response.data?.remaining_attempts };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint to invalidate session
      await apiClient.post('/auth/logout', {});
    } catch (err) {
      // Log error but proceed with clearing local state
      console.error('Logout API failed:', err);
    } finally {
      clearAuth();
      // Use full navigation (not router.push) to ensure the proxy sees the cleared cookie
      window.location.assign('/login');
    }
  };

  const requestPasswordReset = async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      if (!response.success) {
        setError(response.error?.message || 'Unable to send reset email. Please try again.');
        return false;
      }
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unable to send reset email. Please try again.';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (
    email: string,
    token: string,
    password: string,
    passwordConfirmation: string,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/reset-password', {
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      });
      if (!response.success) {
        setError(response.error?.message || 'Unable to reset password.');
        return false;
      }
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unable to reset password.';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    signup,
    verifyOtp,
    resendOtp,
    requestPasswordReset,
    resetPassword,
    logout,
    isLoading,
    error,
    user,
    isAuthenticated: !!user,
  };
}
