'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const { user, isHydrated, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    // Use full navigation to ensure proxy sees the cleared cookie
    window.location.assign('/login');
  };

  // NOTE: Auth guard (redirect to /login if no user, redirect to /dashboard
  // if onboarding_completed) is handled by useOnboardingProtection hook in
  // each individual onboarding page. Do NOT duplicate that logic here —
  // it causes race conditions and double-navigations.

  // Handle server-side or loading state safely
  const currentStage = isHydrated ? (user?.onboarding_stage || 1) : 1;
  const onboardingPages = [
    { id: 1, name: 'Profile setup' },
    { id: 2, name: 'Integrations setup' },
    { id: 3, name: 'Availability setup' },
    { id: 4, name: 'Meeting types' },
    { id: 5, name: 'Finalise' },
  ];
  const currentPageName = onboardingPages.find((s) => s.id === currentStage)?.name || 'Onboarding';
  return (
    <div className="min-h-screen bg-[#f8f9fb] text-[#191c1e] font-sans antialiased overflow-x-hidden">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 px-10 h-16 bg-white/80 backdrop-blur-md border-b border-[#f0f1f3]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#5C6EFF] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#5C6EFF]/20">
            <span className="material-symbols-outlined text-lg font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-[#111827]">Schedulr</span>
        </div>
        
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <h1 className="font-bold text-[13px] text-slate-900 uppercase tracking-[0.15em]">Onboarding</h1>
          <div className="flex items-center gap-1 mt-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div 
                key={s}
                className={`w-4 h-1 rounded-full transition-all duration-500 ${
                  s === currentStage ? 'bg-[#5C6EFF] w-6' : s < currentStage ? 'bg-[#5C6EFF]/40' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Current Page</span>
              <span className="text-[12px] font-bold text-[#5C6EFF] tracking-tight">{currentPageName}</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleLogout}
                className="text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all p-2 rounded-xl flex items-center justify-center group shadow-none hover:shadow-sm"
                title="Logout"
              >
                <span className="material-symbols-outlined text-[20px] group-hover:translate-x-0.5 transition-transform">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-16 px-4 flex flex-col items-center min-h-screen relative">
        {/* Modern Progress Bar Section */}
        <div className="w-full max-w-[640px] mb-8">
          <div className="flex justify-between items-center mb-2.5">
            <div className="h-1 w-full bg-[#e7e8ea] rounded-full flex gap-1.5 overflow-hidden">
              {[1, 2, 3, 4, 5].map((s) => (
                <div 
                  key={s}
                  className={`h-full w-1/5 rounded-full transition-all duration-700 ease-out ${
                    s <= currentStage ? 'bg-[#5C6EFF]' : 'bg-[#e7e8ea]'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#5C6EFF]">
              {currentStage === 5 ? 'DONE' : currentPageName}
            </span>
          </div>
        </div>

        {/* Page Content */}
        <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>

        {/* Decorative Ambient Elements */}
        <div className="fixed top-24 left-12 opacity-20 pointer-events-none -z-10">
          <div className="w-64 h-64 rounded-full bg-gradient-to-br from-[#5C6EFF] to-[#A78BFA] blur-[100px] animate-pulse" />
        </div>
        <div className="fixed bottom-12 right-12 opacity-10 pointer-events-none -z-10">
          <div className="w-96 h-96 rounded-full bg-[#674bb5] blur-[120px]" />
        </div>
      </main>

      {/* Powered by tag */}
      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 opacity-30 pointer-events-none">
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#757686]">
          Schedulr Intelligent Platform
        </p>
      </footer>
    </div>
  );
}
