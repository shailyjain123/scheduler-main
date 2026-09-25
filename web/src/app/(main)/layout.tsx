'use client';

import { ReactNode, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import CreateEventModal from '@/components/modals/create-event-modal';
import ConfirmationModal from '@/components/modals/confirmation-modal';
import NotificationsLiveSync from '@/components/notifications/notifications-live-sync';
import { onboardingPagePath } from '@/lib/routes';
import { useUIStore } from '@/store/uiStore';
import MainLayoutSkeleton from '@/components/skeletons/MainLayoutSkeleton';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isHydrated, isLoading } = useAuthStore();
  const { sidebarCollapsed } = useUIStore();
  const router = useRouter();

  useEffect(() => {
    // Wait for hydration before acting on auth state
    if (!isHydrated || isLoading) return;

    if (!user) {
      router.push('/login');
    } else if (!user.onboarding_completed) {
      // If onboarding is not complete, redirect to the correct onboarding page
      const stage = user.onboarding_stage || 1;
      router.push(onboardingPagePath(stage));
    }
  }, [user, isLoading, isHydrated, router]);

  // Handle loading state or auth redirect state safely
  if (!isHydrated || isLoading || !user) {
    return <MainLayoutSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex">
      {/* Sidebar - Drawer on mobile, Fixed on desktop */}
      <Sidebar />

      {/* Main Content Area */}
      <div className={`flex-1 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-[220px]'} flex flex-col min-h-screen transition-all duration-300 ease-in-out`}>
        <Header />

        <main className="flex-1 lg:p-6 overflow-x-hidden relative">
          <div className="max-w-[1440px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500 h-full">
            {children}
          </div>
        </main>

        {/* Footer info (optional per Stitch) */}
        <footer className="px-4 lg:px-8 py-6 opacity-20 pointer-events-none text-center lg:text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#757686]">
            Schedulr v2.4.0 • Enterprise Scheduling Infrastructure
          </p>
        </footer>
      </div>

      {/* Global Modals */}
      <NotificationsLiveSync />
      <CreateEventModal />
      <ConfirmationModal />
    </div>
  );
}
