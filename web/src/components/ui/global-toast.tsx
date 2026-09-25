'use client';

import { useEffect } from 'react';
import { useToastStore } from '@/store/toastStore';

const VARIANT_STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-indigo-200 bg-indigo-50 text-indigo-700',
} as const;

const VARIANT_ICONS = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
} as const;

export default function GlobalToast() {
  const { toasts, removeToast } = useToastStore();

  useEffect(() => {
    const timers = toasts.map((toast) => {
      return window.setTimeout(() => removeToast(toast.id), 3200);
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[220] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-in slide-in-from-right-4 duration-200 rounded-xl border px-3 py-2.5 shadow-sm ${VARIANT_STYLES[toast.variant]}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] leading-none">
              {VARIANT_ICONS[toast.variant]}
            </span>
            <p className="text-[12px] font-semibold leading-relaxed">{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
