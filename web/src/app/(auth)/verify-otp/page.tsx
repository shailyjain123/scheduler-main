'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email') || '';
  const { verifyOtp, resendOtp, isLoading, error } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!emailFromQuery) {
      router.push('/login');
    }
  }, [emailFromQuery, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.slice(-1); // Only take the last character
    
    if (value.length > 1 && !digit) {
      // Handle paste if multiple characters and no last digit
      const pastedData = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedData.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      
      const nextIndex = Math.min(index + pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // move to next
    if (digit !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const otpString = otp.join('');
    if (otpString.length < 6) {
      setLocalError('Please enter the full 6-digit code');
      return;
    }

    const result = await verifyOtp(emailFromQuery, otpString);
    if (!result.success) {
      setLocalError(error || 'Verification failed');
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    
    const result = await resendOtp(emailFromQuery);
    if (result.success) {
      setResendTimer(60);
      setLocalError(null);
      if (typeof result.remainingAttempts === 'number') {
        setRemainingAttempts(result.remainingAttempts);
      }
    } else {
      setLocalError(error || 'Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-[360px] flex flex-col">
      {/* Mobile Logo Only - to match login page */}
      <div className="lg:hidden flex items-center gap-1.5 mb-8">
        <span className="material-symbols-outlined text-primary text-2xl">calendar_today</span>
        <span className="text-xl font-bold tracking-tighter text-[#5C6EFF]">Schedulr</span>
      </div>

      {/* Back Link */}
      <Link href="/login" className="inline-flex items-center gap-2 text-outline hover:text-primary transition-colors mb-8 group">
        <span className="material-symbols-outlined text-base transition-transform group-hover:-translate-x-1">arrow_back</span>
        <span className="text-[13px] font-semibold">Back to Sign In</span>
      </Link>

      <div className="space-y-1 mb-8">
        <h2 className="text-xl font-bold tracking-tight text-on-surface">Verify your account</h2>
        <p className="text-[13px] text-on-surface-variant leading-relaxed">
          We&apos;ve sent a 6-digit code to <span className="font-bold text-on-background">{emailFromQuery}</span>. 
          Please enter it below to continue.
        </p>
      </div>

      {/* OTP Form */}
      <form className="space-y-6" onSubmit={handleVerify}>
        <div className="flex justify-between gap-2.5">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el; }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={isLoading}
              className="w-11 h-12 text-center text-lg font-bold bg-surface-container-low border-0 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all outline-none disabled:opacity-50"
              placeholder="-"
            />
          ))}
        </div>

        {localError && (
          <div className="p-2.5 bg-error-container text-on-error-container rounded-lg text-[11px] font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="material-symbols-outlined text-base">error</span>
            {localError}
          </div>
        )}

        <div className="space-y-4">
          <button 
            type="submit" 
            disabled={isLoading || otp.some(d => d === '')}
            className="w-full h-11 bg-primary hover:bg-primary-container text-white font-bold rounded-lg transition-all shadow-[0_4px_12px_rgba(54,73,219,0.25)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : 'Verify Code'}
          </button>
          
          <div className="text-center space-y-2">
            <button 
              type="button" 
              onClick={handleResend}
              disabled={isLoading || resendTimer > 0 || (remainingAttempts !== null && remainingAttempts <= 0)}
              className="text-[11px] font-bold tracking-wider uppercase text-outline hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
            </button>
            {remainingAttempts !== null && (
              <p className={`text-[10px] font-bold uppercase tracking-tight ${remainingAttempts === 0 ? 'text-error' : 'text-outline/60'}`}>
                {remainingAttempts === 0 
                  ? 'Maximum attempts reached' 
                  : `${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining`}
              </p>
            )}
          </div>
        </div>
      </form>

      {/* Footer info - following the design style */}
      <p className="mt-12 text-center text-[10px] uppercase font-bold tracking-widest text-outline/40">
        © 2024 Intelligent Concierge Systems
      </p>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-surface">Loading...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
