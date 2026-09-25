import React, { useEffect } from 'react';
import { formatOAuthErrorForUI, isRetryableError } from '../lib/oauthErrorHandler';

interface OAuthErrorAlertProps {
  errorCode?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  providerId?: string;
}

/**
 * OAuthErrorModal (Final Minimalist Replica)
 * 
 * Replicates the latest minimalist screenshot exactly.
 * Features a peach hero icon, specific instructional box, and dark-orange primary action.
 */
export default function OAuthErrorAlert({
  errorCode,
  errorMessage,
  onRetry,
  onDismiss,
}: OAuthErrorAlertProps) {
  // Handle ESC key to dismiss
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onDismiss) {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onDismiss]);

  if (!errorCode && !errorMessage) return null;

  const errorUI = formatOAuthErrorForUI(errorCode, errorMessage);
  const retryable = isRetryableError(errorCode);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      {/* Backdrop: Clean Subtle Blur */}
      <div 
        className="absolute inset-0 bg-[#000000]/30 backdrop-blur-sm transition-opacity duration-500 animate-in fade-in"
        onClick={onDismiss}
      />

      {/* Modal Card: Very Rounded, Ultra-Compact & Focused */}
      <div className="relative w-full max-w-[380px] bg-white rounded-[28px] shadow-[0_20px_48px_rgba(0,0,0,0.12)] animate-in zoom-in-95 duration-500 flex flex-col items-center text-center p-8">
        
        {/* Heraldic Hero Icon: Small Peach Circle with alert */}
        <div className="w-12 h-12 rounded-full bg-[#fff7ed] flex items-center justify-center text-[#a13300] mb-5">
          <div className="w-4 h-4 rounded-full bg-[#a13300] flex items-center justify-center text-white text-[10px] font-bold">
            !
          </div>
        </div>

        <h2 className="text-lg font-bold text-[#191c1e] mb-3 leading-tight">
          {errorUI.title}
        </h2>
        
        <p className="text-[#64748b] text-[13px] font-semibold leading-relaxed mb-6 max-w-[280px]">
          The account you are currently using doesn&apos;t match the one required for this connection.
        </p>

        {/* Instruction Card: Light Gray Rounded Box */}
        <div className="w-full bg-[#f8f9fb] rounded-xl p-4 flex items-start gap-3 mb-8 text-left">
          <div className="w-5 h-5 rounded-full bg-[#94a3b8]/40 flex items-center justify-center text-[#475569] shrink-0 mt-0.5">
             <span className="material-symbols-outlined text-[14px] font-bold">info</span>
          </div>
          <p className="text-[11px] font-bold text-[#475569] leading-relaxed opacity-90">
            To resolve this, please logout and sign back in using the correct email address.
          </p>
        </div>

        {/* Action Row: Vertical Stacking */}
        <div className="flex flex-col w-full items-center">
          {retryable && onRetry && (
            <button
              onClick={onRetry}
              className="w-full h-12 bg-[#a13300] hover:bg-[#852a00] text-white rounded-[20px] font-bold text-xs transition-all active:scale-[0.97] shadow-lg shadow-[#a13300]/15 mb-3"
            >
              Try Again
            </button>
          )}
          
          <button
            onClick={onDismiss}
            className="text-[10px] font-bold text-[#64748b] hover:text-[#191c1e] transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
