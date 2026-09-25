'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 mb-6">
          <span className="material-symbols-outlined text-[40px] text-slate-400">
            location_off
          </span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-base text-slate-500 max-w-md mx-auto mb-8">
          The page you are looking for doesn't exist or has been moved. Please check the URL or navigate back home.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-[#5C6EFF] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#4a59e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5C6EFF]"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
