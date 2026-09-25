'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center max-w-md w-full bg-white p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 mb-6">
          <span className="material-symbols-outlined text-[32px] text-rose-500">
            warning
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
          Something went wrong
        </h2>
        <p className="text-sm text-slate-500 mb-8">
          We've encountered an unexpected error. Please try again or return to the dashboard.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-[#5C6EFF] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#4a59e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5C6EFF]"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
          >
            Go to Dashboard
          </Link>
        </div>
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-8 text-left p-4 bg-slate-50 rounded-xl overflow-auto text-xs font-mono text-slate-600 border border-slate-200">
            <p className="font-bold text-slate-800 mb-2">Error Details (Development Only):</p>
            {error.message}
          </div>
        )}
      </div>
    </div>
  );
}
