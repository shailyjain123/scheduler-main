'use client';

import React, { useEffect } from 'react';
import { useNotificationStore, Notification } from '@/store/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import NotificationSkeleton from '@/components/skeletons/NotificationSkeleton';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    isLoading,
    unreadCount,
    hasMore,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking': return 'calendar_today';
      case 'cancellation': return 'event_busy';
      case 'reschedule': return 'swap_horiz';
      case 'integration': return 'sync';
      case 'profile_update': return 'person';
      default: return 'notifications';
    }
  };

  const getIconStyles = (type: string) => {
    switch (type) {
      case 'booking': return 'bg-indigo-50 text-indigo-500';
      case 'cancellation': return 'bg-red-50 text-red-500';
      case 'reschedule': return 'bg-amber-50 text-amber-500';
      case 'integration': return 'bg-emerald-50 text-emerald-500';
      case 'profile_update': return 'bg-sky-50 text-sky-500';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }

    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 py-8 px-4 lg:px-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-[#5C6EFF] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount} New
            </span>
          )}
        </div>
        <button
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="text-xs font-bold text-[#5C6EFF] hover:text-[#3649db] disabled:opacity-30 transition-all"
        >
          Mark all as read
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && notifications.length === 0 ? (
          <NotificationSkeleton count={6} />
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-slate-200 text-4xl">notifications_off</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">All caught up!</h3>
            <p className="text-sm text-slate-400">You don't have any notifications at the moment.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`group flex items-start gap-4 p-5 rounded-2xl transition-all duration-300 cursor-pointer border ${
                    !notification.read_at 
                    ? 'bg-white border-[#5C6EFF]/20 shadow-sm' 
                    : 'bg-white/50 border-slate-100 opacity-70'
                  } hover:border-[#5C6EFF]/30 hover:shadow-md`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${getIconStyles(notification.notification_type)}`}>
                    <span className="material-symbols-outlined text-[24px]">
                      {getIcon(notification.notification_type)}
                    </span>
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {notification.title}
                        {!notification.read_at && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5C6EFF]" />
                        )}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight ml-4 whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {notification.description}
                    </p>
                  </div>

                  <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                  </div>
                </div>
              ))}
            </div>

              <div className="flex justify-center mt-6">
                <button
                  onClick={() => fetchNotifications()}
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:border-[#5C6EFF] hover:text-[#5C6EFF] transition-all disabled:opacity-50 min-w-[180px] h-10 flex items-center justify-center"
                >
                  {isLoading ? (
                    <NotificationSkeleton count={1} />
                  ) : 'Load More Notifications'}
                </button>
              </div>
          </>
        )}
      </div>
    </div>
  );
}
