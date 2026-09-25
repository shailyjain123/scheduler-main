'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface ValidationErrors {
  email?: string;
  password?: string;
  fullName?: string;
}

export function SignupForm() {
  const router = useRouter();
  const { signup, isLoading, error } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    setFormError(null);

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one number';
    }

    if (confirmPassword && password !== confirmPassword) {
      errors.password = 'Passwords do not match';
    }

    setValidationErrors(errors);

    if (!agreedToTerms) {
      setFormError('You must agree to the terms and conditions');
      return false;
    }

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const result = await signup(fullName, email, password);
      if (result.verificationRequired) {
        // OTP verification is a client-side route change, not a post-auth redirect
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
      }
      // If signup succeeded, handleAuthResponse in useAuth already called
      // window.location.assign() — no need to redirect again here
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Signup failed');
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    if (field === 'fullName') {
      setFullName(value);
      if (validationErrors.fullName) {
        setValidationErrors({ ...validationErrors, fullName: undefined });
      }
    } else if (field === 'email') {
      setEmail(value);
      if (validationErrors.email) {
        setValidationErrors({ ...validationErrors, email: undefined });
      }
    } else if (field === 'password') {
      setPassword(value);
      if (validationErrors.password) {
        setValidationErrors({ ...validationErrors, password: undefined });
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 border rounded-lg shadow-lg bg-white">
      <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Full Name Field */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => handleFieldChange('fullName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
              validationErrors.fullName
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="John Doe"
            disabled={isLoading}
          />
          {validationErrors.fullName && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.fullName}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
              validationErrors.email
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="your@email.com"
            disabled={isLoading}
          />
          {validationErrors.email && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
                validationErrors.password
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="••••••••"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={isLoading}
            >
              {showPassword ? '👁️‍🗨️' : '👁️'}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            At least 8 characters, 1 uppercase letter, 1 number
          </p>
          {validationErrors.password && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
              password && confirmPassword && password !== confirmPassword
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="••••••••"
            disabled={isLoading}
          />
          {password && confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
          )}
          {password && confirmPassword && password === confirmPassword && (
            <p className="mt-1 text-sm text-green-600">✓ Passwords match</p>
          )}
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start gap-2">
          <input
            id="terms"
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1 rounded border-gray-300 focus:ring-blue-500"
            disabled={isLoading}
          />
          <label htmlFor="terms" className="text-sm text-gray-600">
            I agree to the{' '}
            <span className="font-medium">Terms of Service</span>{' '}
            and{' '}
            <span className="font-medium">Privacy Policy</span>
          </label>
        </div>

        {/* Form Error */}
        {(formError || error) && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            <p className="font-medium">Signup Failed</p>
            <p>{formError || error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Footer Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
