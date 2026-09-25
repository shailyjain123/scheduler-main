'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useNotificationStore } from '@/store/notificationStore';
import { formatDistanceToNow } from 'date-fns';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { toggleMobileSidebar } = useUIStore();
  const { 
    notifications, 
    unreadCount, 
    markAllAsRead, 
    markAsRead, 
    isLoading,
    fetchNotifications 
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(true);
  }, []);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    // Use full navigation (not router.push) to ensure the proxy sees the cleared cookie
    window.location.assign('/login');
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
    }
    setIsNotificationsOpen(false);
  };

  // Dynamic Title mapping
  const getHeaderTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.includes('/events') || pathname.includes('/event-types')) return 'Event Types';
    if (pathname.includes('/availability')) return 'Availability';
    if (pathname.includes('/integrations')) return 'Integrations';
    if (pathname.includes('/settings')) return 'Settings';
    if (pathname.includes('/meetings')) return 'Meetings';
    if (pathname.includes('/profile')) return 'Profile';
    if (pathname.includes('/notifications')) return '';
    return 'Dashboard';
  };

  return (
    <header className="w-full sticky top-0 z-40 bg-white/80 backdrop-blur-md px-4 lg:px-6 h-16 flex items-center justify-between border-b border-[#f0f1f3]">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all active:scale-95"
          aria-label="Toggle navigation"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">{getHeaderTitle()}</h2>
      </div>
      <div className="flex items-center space-x-4 h-full">
        <div className="flex items-center space-x-2.5 h-full">
          {/* Notifications Dropdown */}
          <div className="relative h-full flex items-center" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`p-2 rounded-lg transition-all relative group shadow-none hover:shadow-sm ${isNotificationsOpen ? 'bg-slate-50 text-[#5C6EFF]' : 'text-slate-500 hover:bg-slate-50'}`}
              aria-label="Toggle notifications"
            >
              <span className="material-symbols-outlined text-xl font-light group-hover:scale-105 transition-transform">notifications</span>
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"
                  aria-label="New notifications"
                />
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute top-full right-0 mt-1 w-[320px] bg-white/95 backdrop-blur-xl border border-[#f0f1f3] rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-[#f0f1f3] flex items-center justify-between bg-white/50 sticky top-0 z-10 backdrop-blur-sm">
                  <h3 className="text-[12px] font-bold text-slate-900 uppercase tracking-tight">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllAsRead();
                      }}
                      className="text-[10px] font-bold text-[#5C6EFF] hover:text-[#3649db] transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-[360px] overflow-y-auto no-scrollbar py-1">
                  {isLoading ? (
                    <div className="divide-y divide-slate-50">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 flex gap-3 animate-pulse">
                          <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                          <div className="flex-grow space-y-2">
                            <div className="h-3 w-3/4 bg-slate-100 rounded" />
                            <div className="h-2 w-full bg-slate-50 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <span className="material-symbols-outlined text-3xl text-slate-200 mb-2">notifications_off</span>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">All caught up!</p>
                    </div>
                  ) : (
                    notifications.map((n: any) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left p-4 hover:bg-[#f8f9fb] transition-all flex gap-3 border-b border-[#f0f1f3] last:border-0 relative ${!n.read_at ? 'bg-[#EEF0FF]/30' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.notification_type === 'booking' ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-400'}`}>
                          <span className="material-symbols-outlined text-[18px]">
                            {n.notification_type === 'booking' ? 'calendar_today' : 'notifications'}
                          </span>
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-[11px] font-bold text-slate-900 leading-tight mb-0.5 truncate">{n.title}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{n.description}</p>
                          <p className="text-[9px] font-bold text-slate-300 mt-1.5 uppercase tracking-tighter">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!n.read_at && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#5C6EFF] mt-1 shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>

                <button
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    router.push('/notifications');
                  }}
                  className="w-full py-2.5 text-[10px] font-bold text-slate-500 hover:text-[#5C6EFF] transition-colors border-t border-[#f0f1f3] bg-slate-50/50"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>

          {/* User Preview & Dropdown */}
          <div className="relative h-full flex items-center" ref={profileDropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-1.5 pl-1.5 group h-full"
            >
              <div className="relative w-8 h-8 rounded-full bg-slate-100 ring-2 ring-transparent group-hover:ring-indigo-100 transition-all overflow-hidden shadow-sm">
                {user?.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-slate-400">
                    <span className="material-symbols-outlined text-lg">person</span>
                  </div>
                )}
              </div>
              <span className={`material-symbols-outlined text-slate-400 group-hover:text-slate-600 transition-all text-[18px] ${isProfileOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-[#f0f1f3] rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-2 border-b border-[#f0f1f3] mb-1">
                  <p className="text-[11px] font-bold text-slate-900 truncate uppercase tracking-tight">{user?.full_name}</p>
                  <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-widest">{user?.email}</p>
                </div>

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push('/profile');
                  }}
                  className="w-full text-left px-4 py-2 text-[11px] font-bold text-slate-600 hover:bg-[#f8f9fb] hover:text-[#5C6EFF] transition-colors flex items-center space-x-2"
                >
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  <span>Profile</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-[11px] font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center space-x-2"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
