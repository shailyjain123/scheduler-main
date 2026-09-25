'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import StatCard from '@/components/dashboard/stat-card';
import ScheduleTimeline from '@/components/dashboard/schedule-timeline';
import AppointmentsOverviewChart from '@/components/dashboard/appointments-overview-chart';
import AppointmentsStatusChart from '@/components/dashboard/appointments-status-chart';
import EventDetailModal from '@/components/modals/event-detail-modal';
import { useModalStore } from '@/store/modalStore';
import { useStats } from '@/lib/hooks/use-stats';
import { useEvents } from '@/lib/hooks/use-events';
import { useEventDeepLinking } from '@/lib/hooks/use-event-deep-linking';
import { DashboardStats } from '@/lib/types/dashboard';
import { Event } from '@/lib/types/event';
import { formatInTimezone, datePresets } from '@/lib/date-utils';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';

function DashboardContent() {
  const { user } = useAuthStore();
  const userTz = user?.timezone;
  const { openEventDetail } = useModalStore();
  const [dateRange, setDateRange] = useState<string>('last-30-next-30');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set([1]));
  const [hasMore, setHasMore] = useState<boolean>(true);
  const perPage = 25;

  const dateFilter = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Keep it stable across re-renders
    let from = new Date(now.getTime());
    let to = new Date(now.getTime());

    switch (dateRange) {
      case 'last-7':
        from.setDate(now.getDate() - 7);
        to = now;
        break;
      case 'last-30':
        from.setDate(now.getDate() - 30);
        to = now;
        break;
      case 'next-30':
        from = now;
        to.setDate(now.getDate() + 30);
        break;
      case 'next-90':
        from = now;
        to.setDate(now.getDate() + 90);
        break;
      case 'custom':
        if (customFrom) {
          from = new Date(customFrom);
        }
        if (customTo) {
          to = new Date(customTo);
        } else {
          // default customTo to +30 days if blank
          to.setDate(from.getDate() + 30);
        }
        break;
      case 'last-30-next-30':
      default:
        from.setDate(now.getDate() - 30);
        to.setDate(now.getDate() + 30);
        break;
    }

    return {
      from: from.toISOString(),
      to: to.toISOString()
    };
  }, [dateRange, customFrom, customTo]);

  const { stats, isLoading: statsLoading, isError: statsError } = useStats(dateFilter);
  const { events, pagination, isLoading: eventsLoading, isError: eventsError } = useEvents({
    page,
    per_page: perPage,
    ...dateFilter
  });

  // Reset pagination state when date filter changes
  useEffect(() => {
    setPage(1);
    setAllEvents([]);
    setFetchedPages(new Set([1]));
    setHasMore(true);
  }, [dateFilter.from, dateFilter.to]);

  // Append data and prevent duplicates
  useEffect(() => {
    if (events && events.length > 0) {
      setAllEvents(prev => {
        const newEvents = [...prev];
        const existingIds = new Set(prev.map(e => e.id));
        events.forEach(e => {
          if (!existingIds.has(e.id)) {
            newEvents.push(e);
          }
        });
        return newEvents;
      });

      if (pagination) {
        setHasMore(page < pagination.total_pages);
      }
    } else if (events && events.length === 0 && !eventsLoading) {
      setHasMore(false);
    }
  }, [events, page, pagination, eventsLoading]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || eventsLoading) return;
    const nextPage = page + 1;
    if (fetchedPages.has(nextPage)) return;
    
    setFetchedPages(prev => {
      const newSet = new Set(prev);
      newSet.add(nextPage);
      return newSet;
    });
    setPage(nextPage);
  }, [hasMore, eventsLoading, page, fetchedPages]);

  const statData = stats as DashboardStats | null;
  const eventList = events as Event[];

  // Handle deep links
  useEventDeepLinking(allEvents);

  if ((statsLoading || eventsLoading) && allEvents.length === 0) {
    return <DashboardSkeleton />;
  }

  const name = user?.full_name?.split(' ')[0] || 'User';
  
  const meetings = (allEvents || []).map((event) => {
    const start = new Date(event.start_time);
    const dayMonth = formatInTimezone(start, { month: 'short', day: 'numeric' }, userTz);
    const time = formatInTimezone(start, datePresets.timeOnly, userTz);
    
    return {
      id: event.id,
      title: event.title,
      time: `${dayMonth}, ${time}`,
      guest: event.user_id === user?.id 
        ? (event.attendees?.[0]?.name || 'Invited Guest')
        : (event.organizer?.name || 'Organizer'),
      meetingLink: event.meeting_link,
      sourceEvent: event,
      status: event.status || 'scheduled',
      color: event.color_theme || 'border-indigo-500',
      guestsCount: (event.attendees?.length || 1) - 1
    };
  });

  const statsValue = {
    totalBookings: statsLoading ? 'Loading...' : statsError ? 'Unavailable' : (statData?.totalBookings ?? 0),
    conversionRate: statsLoading ? 'Loading...' : statsError ? 'Unavailable' : `${statData?.conversionRate ?? 0}%`,
    noShowRate: statsLoading ? 'Loading...' : statsError ? 'Unavailable' : `${statData?.noShowRate ?? 0}%`,
    upcomingCalls: statsLoading ? 'Loading...' : statsError ? 'Unavailable' : (statData?.upcomingCalls ?? 0)
  };

  return (
    <div className="space-y-8">
      <EventDetailModal />

      {(statsError || eventsError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-bold text-red-700">
          Dashboard data failed to load. Values may be incomplete until the API recovers.
        </div>
      )}

      {/* 1. Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1.5">Hey {name},</h2>
          <p className="text-slate-500 font-medium text-sm">Welcome back to your workspace. Here&apos;s what&apos;s happening.</p>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Bookings" value={statsValue.totalBookings} icon="calendar_today" iconBg="bg-[#EEF0FF]" iconColor="text-[#5C6EFF]" />
        <StatCard title="Conversion Rate" value={statsValue.conversionRate} icon="show_chart" iconBg="bg-[#DCFCE7]/30" iconColor="text-[#16A34A]" />
        <StatCard title="No-show Rate" value={statsValue.noShowRate} icon="warning" iconBg="bg-[#FEF9C3]" iconColor="text-[#F59E0B]" />
        <StatCard title="Upcoming Calls" value={statsValue.upcomingCalls} icon="event_upcoming" iconBg="bg-[#F3F0FF]" iconColor="text-[#A78BFA]" />
      </div>

      {/* 3. Main Content (Timeline) */}
      <div className="w-full h-[600px]">
        {eventsError && allEvents.length === 0 ? (
          <section className="bg-white p-5 rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-red-200 h-full flex items-center justify-center">
            <p className="text-[12px] font-bold uppercase tracking-widest text-red-600">Unable to load meetings</p>
          </section>
        ) : (
          <ScheduleTimeline 
            meetings={meetings} 
            hasMore={hasMore}
            isLoadingMore={eventsLoading}
            onLoadMore={handleLoadMore}
            onMeetingClick={(meeting) => {
              if (meeting.sourceEvent) {
                openEventDetail(meeting.sourceEvent);
              }
            }}
          />
        )}
      </div>

      {/* 4. Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-auto xl:h-[400px]">
        <AppointmentsOverviewChart 
          data={statData?.appointmentsOverview || []} 
          dateRange={dateRange}
          onDateRangeChange={(range: string) => { setDateRange(range); setPage(1); }}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={(date: string) => { setCustomFrom(date); setPage(1); }}
          onCustomToChange={(date: string) => { setCustomTo(date); setPage(1); }}
          isLoading={statsLoading}
        />
        <AppointmentsStatusChart 
          data={statData?.appointmentsByStatus || []} 
          isLoading={statsLoading}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
