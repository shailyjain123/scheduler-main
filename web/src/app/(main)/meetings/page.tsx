'use client';

import { useState } from 'react';
import CalendarSidebar from '@/components/meetings/calendar-sidebar';
import CalendarHeader from '@/components/meetings/calendar-header';
import MeetingGrid from '@/components/meetings/meeting-grid';
import EventDetailModal from '@/components/modals/event-detail-modal';
import { useMeetings } from '@/lib/hooks/use-meetings';
import { useEventDeepLinking } from '@/lib/hooks/use-event-deep-linking';
import { Event } from '@/lib/types/event';
import CalendarSkeleton from '@/components/skeletons/CalendarSkeleton';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function MeetingsContent() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [activeStatuses, setActiveStatuses] = useState<Record<Event['status'], boolean>>({
    scheduled: true,
    completed: true,
    cancelled: true,
    'no-shows': true,
  });
  const { meetings, isLoading, isError } = useMeetings();

  // Handle deep links
  useEventDeepLinking(meetings);

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center">
        <p className="text-[12px] font-bold uppercase tracking-widest text-red-600">Unable to load meetings</p>
      </div>
    );
  }

  const safeMeetings = meetings || [];
  const filteredMeetings = safeMeetings.filter((meeting) => activeStatuses[meeting.status]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <EventDetailModal />
      <CalendarHeader currentDate={currentDate} onDateChange={setCurrentDate} view={view} onViewChange={setView} />

      <div className="flex-1 flex space-x-8 min-h-0">
        <div className="w-56 flex-shrink-0">
          <CalendarSidebar
            selectedDate={currentDate}
            onDateChange={setCurrentDate}
            events={filteredMeetings}
            activeStatuses={activeStatuses}
            onToggleStatus={(status) => {
              setActiveStatuses((prev) => ({
                ...prev,
                [status]: !prev[status],
              }));
            }}
          />
        </div>

        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <MeetingGrid 
            currentDate={currentDate} 
            view={view} 
            events={filteredMeetings} 
            onDateChange={setCurrentDate}
            onViewChange={setView}
          />
        </div>
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <MeetingsContent />
    </Suspense>
  );
}
