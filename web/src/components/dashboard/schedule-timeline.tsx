'use client';

import { useCallback, useEffect, useRef } from 'react';

interface Meeting {
  id: string;
  title: string;
  time: string;
  guest: string;
  location?: string;
  meetingLink?: string | null;
  sourceEvent?: import('@/lib/types/event').Event;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-shows';
  color: string;
  guestsCount?: number;
}

interface ScheduleTimelineProps {
  meetings: Meeting[];
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onMeetingClick?: (meeting: Meeting) => void;
}

export default function ScheduleTimeline({ meetings, hasMore, isLoadingMore, onLoadMore, onMeetingClick }: ScheduleTimelineProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    if (node) {
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          onLoadMore?.();
        }
      }, { threshold: 1.0 });
      observerRef.current.observe(node);
    }
  }, [isLoadingMore, hasMore, onLoadMore]);

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);
  const statusColor = (status: Meeting['status']) => {
    if (status === 'scheduled') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (status === 'completed') return 'bg-sky-50 text-sky-700 border-sky-100';
    if (status === 'cancelled') return 'bg-rose-50 text-rose-600 border-rose-100';
    return 'bg-amber-50 text-amber-700 border-amber-100'; // no-shows
  };

  const statusLabel = (status: Meeting['status']) => {
    if (status === 'no-shows') return 'No-show';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const toJoinUrl = (meeting: Meeting) => {
    const rawLink = meeting.meetingLink?.trim();
    if (rawLink) {
      if (/^https?:\/\//i.test(rawLink)) return rawLink;
      return `https://${rawLink}`;
    }

    const location = meeting.location?.trim();
    if (!location) return null;
    if (/^https?:\/\//i.test(location)) return location;
    if (location.includes('.')) return `https://${location}`;
    return null;
  };

  const canJoinMeeting = (meeting: Meeting) => {
    return meeting.status === 'scheduled' && Boolean(toJoinUrl(meeting));
  };

  const handleJoin = (meeting: Meeting) => {
    const url = toJoinUrl(meeting);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="bg-white p-5 rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3] h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-[17px] font-bold text-slate-900 tracking-tight">Timeline</h4>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scrollbar pr-2 space-y-6 relative before:absolute before:left-24 before:top-4 before:bottom-4 before:w-[1.5px] before:bg-slate-50">
        {meetings.length > 0 ? (
          meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="flex items-start space-x-6 relative group"
            >
              <div className="w-24 shrink-0 pt-2 text-right">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-tight">{meeting.time}</span>
              </div>

              <div
                role={onMeetingClick ? 'button' : undefined}
                tabIndex={onMeetingClick ? 0 : undefined}
                onClick={() => onMeetingClick?.(meeting)}
                onKeyDown={(event) => {
                  if (!onMeetingClick) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onMeetingClick(meeting);
                  }
                }}
                className={`flex-1 bg-white p-4 rounded-xl border border-[#f0f1f3] border-l-4 ${meeting.color} transition-all duration-300 ${onMeetingClick ? 'cursor-pointer group-hover:shadow-lg group-hover:translate-x-1 focus:outline-none focus:ring-2 focus:ring-[#5C6EFF]/25 focus:ring-offset-2' : 'group-hover:shadow-lg group-hover:translate-x-1'}`}
              >
                <div className="flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-bold text-slate-900 truncate tracking-tight">{meeting.title}</p>
                    <div className="flex items-center space-x-2 mt-1.5">
                      <span className="material-symbols-outlined text-slate-400 text-[15px]">person</span>
                      <span className="text-[11px] font-bold text-slate-600 truncate max-w-[110px]">{meeting.guest}</span>
                      {meeting.guestsCount && meeting.guestsCount > 0 && (
                        <span className="text-[9px] font-bold text-slate-400">+{meeting.guestsCount} others</span>
                      )}
                      <span className="w-0.5 h-0.5 bg-slate-300 rounded-full mx-1"></span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-widest border ${statusColor(meeting.status)}`}>
                        {statusLabel(meeting.status)}
                      </span>
                    </div>
                  </div>
                  {canJoinMeeting(meeting) ? (
                    <button
                      onClick={() => handleJoin(meeting)}
                      className="bg-white text-[#5C6EFF] border border-[#5C6EFF]/10 px-4 h-8 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-[#5C6EFF] hover:text-white hover:border-[#5C6EFF] transition-all shadow-sm active:scale-95 shrink-0 ml-3"
                    >
                      Join
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
            <span className="material-symbols-outlined text-4xl mb-3 font-light">calendar_today</span>
            <p className="text-[12px] font-bold uppercase tracking-widest">No meetings today</p>
          </div>
        )}

        {/* Loader and End of List states */}
        {meetings.length > 0 && hasMore && (
          <div ref={loadMoreRef} className="py-4">
            {isLoadingMore ? (
              <div className="flex items-start space-x-6 relative animate-pulse">
                <div className="w-24 shrink-0 pt-2 text-right">
                  <div className="h-3 w-12 bg-slate-100 rounded ml-auto" />
                </div>
                <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-100 h-20" />
              </div>
            ) : null}
          </div>
        )}
        
        {meetings.length > 0 && !hasMore && (
          <div className="py-6 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">End of meetings</span>
          </div>
        )}
      </div>
    </section>
  );
}
