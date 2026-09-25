'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const TABS = [
  { name: 'Reminders & Notifications', href: '/settings/notifications', icon: 'notifications' },
  { name: 'Schedule Settings', href: '/settings/booking', icon: 'event_available' },
  { name: 'Plan & Subscription', href: '/settings/plan', icon: 'workspace_premium' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-2">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#EEF0FF] text-[#5C6EFF] border border-[#5C6EFF]'
                    : 'bg-white text-[#757686] border border-slate-100 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {tab.icon}
                </span>
                {tab.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="min-h-[600px]">
        {children}
      </div>
    </div>
  );
}
