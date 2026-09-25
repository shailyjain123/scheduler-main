'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFieldErrors } from '@/hooks/useFieldErrors';
import { ApiResponse } from '@/lib/api/client';
import { validateEmail } from '@/lib/utils/email-validation';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const resetToken = searchParams.get('token') || '';
  const resetEmail = searchParams.get('email') || '';
  const initialAuthMode = (searchParams.get('mode') === 'reset' && resetToken && resetEmail) ? 'reset' : 'auth';

  const [activeTab, setActiveTab] = useState<'signup' | 'signin'>(
    (tabParam === 'signup' || tabParam === 'signin') ? tabParam : 'signin'
  );
  const [authMode, setAuthMode] = useState<'auth' | 'forgot' | 'reset'>(initialAuthMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetConfirmPasswordValue, setResetConfirmPasswordValue] = useState('');
  const [resetValidationError, setResetValidationError] = useState<string | null>(null);
  const { fieldErrors, setFieldErrors, mergeFieldErrors, clearFieldError, captureApiErrors } = useFieldErrors<{ email: string; password: string; full_name: string }>();
  
  const { login, signup, requestPasswordReset, resetPassword, isLoading, error } = useAuth();
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!backendUrl) {
    throw new Error('NEXT_PUBLIC_API_URL is required for auth routes');
  }

  const handleTabChange = useCallback((tab: 'signup' | 'signin') => {
    setActiveTab(tab);
    setFieldErrors({});
    
    // Update URL gracefully
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [setFieldErrors]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof typeof formData;
    setFormData({ ...formData, [name]: e.target.value });
    clearFieldError(name);
    setBannerMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerMessage(null);
    setFieldErrors({});

    const errors: { email?: string; password?: string; full_name?: string } = {};

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (activeTab === 'signup') {
      if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])[^\s]+$/.test(formData.password)) {
        errors.password = 'Password must include at least one uppercase letter, one lowercase letter, one number, one special character, and no spaces';
      }
    }

    if (activeTab === 'signup') {
      if (!formData.full_name.trim()) {
        errors.full_name = 'Full name is required';
      } else if (formData.full_name.trim().length < 3 || formData.full_name.trim().length > 50) {
        errors.full_name = 'Full name must be between 3 and 50 characters';
      } else if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(formData.full_name.trim())) {
        errors.full_name = 'Full name can only contain letters and single spaces';
      }
    }

    if (Object.keys(errors).length > 0) {
      mergeFieldErrors(errors);
      return;
    }

    try {
      let result: { 
        success: boolean; 
        verificationRequired: boolean; 
        email?: string | null; 
        originalResponse?: unknown 
      };

      if (activeTab === 'signup') {
        result = await signup(formData.full_name, formData.email, formData.password);
      } else {
        result = await login(formData.email, formData.password);
      }

      if (!result?.success && result?.originalResponse) {
        captureApiErrors(result.originalResponse as ApiResponse);
      }

      if (result?.verificationRequired) {
        const email = (result.email || formData.email).trim();
        if (email) {
          router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
          return;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error(message);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerMessage(null);

    const success = await requestPasswordReset(forgotEmail);
    if (success) {
      setBannerMessage('If an account exists for this email, a reset link has been sent.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerMessage(null);
    setResetValidationError(null);

    if (!resetPasswordValue || !resetConfirmPasswordValue) {
      setResetValidationError('Please fill both password fields.');
      return;
    }

    if (resetPasswordValue !== resetConfirmPasswordValue) {
      setResetValidationError('Confirm Password must match New Password.');
      return;
    }

    const success = await resetPassword(
      resetEmail,
      resetToken,
      resetPasswordValue,
      resetConfirmPasswordValue,
    );
    if (success) {
      setBannerMessage('Password reset successful. You can now sign in.');
      setAuthMode('auth');
      setActiveTab('signin');
      setFormData((prev) => ({ ...prev, email: resetEmail, password: '' }));
      setResetPasswordValue('');
      setResetConfirmPasswordValue('');
      setResetValidationError(null);
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/login');
      }
    }
  };

  const resetPasswordsMismatch =
    resetConfirmPasswordValue.length > 0 &&
    resetPasswordValue !== resetConfirmPasswordValue;

  const isResetFormValid =
    resetPasswordValue.length >= 8 &&
    resetConfirmPasswordValue.length > 0 &&
    !resetPasswordsMismatch;

  return (
    <div className="w-full max-w-[360px] flex flex-col items-center">
      <div className="lg:hidden flex items-center gap-1.5 mb-8">
        <span className="material-symbols-outlined text-primary text-2xl">calendar_today</span>
        <span className="text-xl font-bold tracking-tighter text-[#5C6EFF]">Schedulr</span>
      </div>

      <div className="w-full">
        {bannerMessage && (
          <div className="mt-4 p-2.5 bg-green-100 text-green-800 rounded-lg text-[11px] font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {bannerMessage}
          </div>
        )}

        {authMode === 'auth' && (
        <div className="flex w-full border-b border-surface-container-high h-9">
          <button 
            type="button"
            onClick={() => handleTabChange('signup')}
            disabled={isLoading}
            className={`flex-1 text-[13px] font-semibold transition-all ${
              activeTab === 'signup' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-outline hover:text-on-surface'
            } ${isLoading && 'opacity-50 cursor-not-allowed'}`}
          >
            Sign Up
          </button>
          <button 
            type="button"
            onClick={() => handleTabChange('signin')}
            disabled={isLoading}
            className={`flex-1 text-[13px] font-semibold transition-all ${
              activeTab === 'signin' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-outline hover:text-on-surface'
            } ${isLoading && 'opacity-50 cursor-not-allowed'}`}
          >
            Sign In
          </button>
        </div>
        )}

        {error && error !== 'Email or password is incorrect' && (
          <div className="mt-4 p-2.5 bg-error-container text-on-error-container rounded-lg text-[11px] font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        {authMode === 'auth' && (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {activeTab === 'signup' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[11px] font-semibold text-on-surface-variant ml-0.5">Full Name</label>
              <input 
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className={`w-full h-10 px-3.5 rounded-lg bg-surface-container-low border focus:ring-2 focus:ring-primary/20 text-[13px] transition-all outline-none disabled:opacity-50 ${
                  fieldErrors.full_name ? 'border-red-500' : 'border-transparent'
                }`}
                placeholder="Jane Doe" 
                type="text"
              />
              {fieldErrors.full_name && (
                <p className="mt-1 text-[11px] font-semibold text-red-500">{fieldErrors.full_name}</p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-on-surface-variant ml-0.5">Email</label>
            <input 
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={() => {
                const validation = validateEmail(formData.email);
                if (!validation.isValid) {
                  mergeFieldErrors({ email: validation.error });
                } else {
                  clearFieldError('email');
                }
              }}
              required
              disabled={isLoading}
              className={`w-full h-10 px-3.5 rounded-lg bg-surface-container-low border focus:ring-2 focus:ring-primary/20 text-[13px] transition-all outline-none disabled:opacity-50 ${
                fieldErrors.email ? 'border-red-500' : 'border-transparent'
              }`}
              placeholder="jane@example.com" 
              type="email"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-[11px] font-semibold text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-1 relative">
            <label className="text-[11px] font-semibold text-on-surface-variant ml-0.5">Password</label>
            <div className="relative">
              <input 
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                minLength={8}
                className={`w-full h-10 px-3.5 rounded-lg bg-surface-container-low border focus:ring-2 focus:ring-primary/20 text-[13px] transition-all outline-none pr-10 disabled:opacity-50 ${
                  (fieldErrors.password || (error === 'Email or password is incorrect' && activeTab === 'signin')) ? 'border-red-500' : 'border-transparent'
                }`}
                placeholder="••••••••" 
                type={showPassword ? 'text' : 'password'}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-[11px] font-semibold text-red-500">{fieldErrors.password}</p>
            )}
            {!fieldErrors.password && error === 'Email or password is incorrect' && activeTab === 'signin' && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-500">
                <span className="material-symbols-outlined text-[13px]">error</span>
                {error}
              </p>
            )}
            {activeTab === 'signin' && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot');
                    setForgotEmail(formData.email);
                    setBannerMessage(null);
                  }}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          <button 
            className="w-full h-11 bg-primary text-white font-bold rounded-lg shadow-[0_4px_12px_rgba(54,73,219,0.25)] hover:bg-primary-container transition-all active:scale-[0.98] mt-2 disabled:bg-outline disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2" 
            type="submit"
            disabled={isLoading}
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span className="text-sm">{activeTab === 'signup' ? 'Create Free Account' : 'Sign In to Account'}</span>
          </button>
        </form>
        )}

        {authMode === 'forgot' && (
          <form className="mt-6 space-y-4" onSubmit={handleForgotSubmit}>
            <p className="text-[12px] text-outline">Enter your registered email to receive a password reset link.</p>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-on-surface-variant ml-0.5">Email</label>
              <input
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                type="email"
                disabled={isLoading}
                className="w-full h-10 px-3.5 rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/20 text-[13px] transition-all outline-none disabled:opacity-50"
                placeholder="jane@example.com"
              />
            </div>
            <button className="w-full h-11 bg-primary text-white font-bold rounded-lg" type="submit" disabled={isLoading}>
              Send Reset Link
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('auth')}
              className="w-full h-11 border border-primary/20 text-primary font-bold rounded-lg"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {authMode === 'reset' && (
          <form className="mt-6 space-y-4" onSubmit={handleResetSubmit}>
            <p className="text-[12px] text-outline">Set a new password for {resetEmail}.</p>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-on-surface-variant ml-0.5">New Password</label>
              <div className="relative">
                <input
                  value={resetPasswordValue}
                  onChange={(e) => {
                    setResetPasswordValue(e.target.value);
                    if (resetValidationError) setResetValidationError(null);
                  }}
                  required
                  minLength={8}
                  type={showResetPassword ? 'text' : 'password'}
                  disabled={isLoading}
                  className="w-full h-10 px-3.5 rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/20 text-[13px] transition-all outline-none pr-10 disabled:opacity-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showResetPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-on-surface-variant ml-0.5">Confirm Password</label>
              <div className="relative">
                <input
                  value={resetConfirmPasswordValue}
                  onChange={(e) => {
                    setResetConfirmPasswordValue(e.target.value);
                    if (resetValidationError) setResetValidationError(null);
                  }}
                  required
                  minLength={8}
                  type={showResetConfirmPassword ? 'text' : 'password'}
                  disabled={isLoading}
                  className={`w-full h-10 px-3.5 rounded-lg bg-surface-container-low border focus:ring-2 text-[13px] transition-all outline-none pr-10 disabled:opacity-50 ${resetPasswordsMismatch ? 'border-[#ba1a1a] focus:ring-[#ba1a1a]/20' : 'border-0 focus:ring-primary/20'}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showResetConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {resetPasswordsMismatch && (
                <p className="text-[11px] font-semibold text-[#ba1a1a]">Confirm Password must match New Password.</p>
              )}
              {resetValidationError && !resetPasswordsMismatch && (
                <p className="text-[11px] font-semibold text-[#ba1a1a]">{resetValidationError}</p>
              )}
            </div>
            <button className="w-full h-11 bg-primary text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2" type="submit" disabled={isLoading || !isResetFormValid}>
              Reset Password
            </button>
            <div className="flex flex-col gap-3 mt-4">
              {error?.toLowerCase().includes('expire') && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot');
                    setForgotEmail(resetEmail);
                    setBannerMessage(null);
                  }}
                  className="w-full h-11 border border-primary text-primary font-bold rounded-lg hover:bg-primary/5 transition-all"
                >
                  Request New Link
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('auth');
                  handleTabChange('signin');
                }}
                className="w-full h-11 border border-primary/20 text-primary font-bold rounded-lg hover:bg-primary/5 transition-all"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Divider */}
        {authMode === 'auth' && (
        <div className="relative flex items-center gap-4 my-8">
          <div className="flex-grow h-px bg-surface-container-high"></div>
          <span className="text-[10px] font-bold text-outline tracking-widest uppercase">OR</span>
          <div className="flex-grow h-px bg-surface-container-high"></div>
        </div>
        )}

        {/* SSO Buttons */}
        {authMode === 'auth' && (
        <div className="space-y-3">
          <a 
            href={`${backendUrl}/api/v1/auth/google/authorize`}
            className={`w-full h-11 flex items-center justify-center gap-3 border border-primary/20 rounded-lg text-primary text-sm font-semibold hover:bg-primary/5 transition-all ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="currentColor"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"></path>
            </svg>
            Continue with Google
          </a>
          
          <a 
            href={`${backendUrl}/api/v1/auth/microsoft/authorize`}
            className={`w-full h-11 flex items-center justify-center gap-3 border border-primary/20 rounded-lg text-primary text-sm font-semibold hover:bg-primary/5 transition-all ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <span className="material-symbols-outlined text-lg">grid_view</span>
            Continue with Microsoft
          </a>
          
        </div>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-[11px] leading-relaxed text-outline max-w-[280px] mx-auto">
          By signing up you agree to our 
          <span className="ml-1 font-semibold">Terms</span> & 
          <span className="ml-1 font-semibold">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
