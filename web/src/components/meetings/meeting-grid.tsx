'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { format, startOfWeek, eachDayOfInterval, addDays, isSameDay, isToday, startOfMonth, endOfMonth, endOfWeek, isSameMonth, parseISO } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Event } from '@/lib/types/event';
import { useModalStore } from '@/store/modalStore';
import { useAuthStore } from '@/store/authStore';
import { formatInTimezone, toZonedDate } from '@/lib/date-utils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MeetingGridProps {
  currentDate: Date;
  view: 'day' | 'week' | 'month';
  events: Event[];
  onDateChange: (date: Date) => void;
  onViewChange: (view: 'day' | 'week' | 'month') => void;
}

interface EventLayout extends Event {
  top: number;
  height: number;
  left: number;
  width: number;
  column: number;
  maxColumns: number;
}

export default function MeetingGrid({ currentDate, view, events, onDateChange, onViewChange }: MeetingGridProps) {
  const { user } = useAuthStore();
  const userTz = user?.timezone;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const { openCreateEventModal, openEventDetail } = useModalStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (view !== 'month' && scrollContainerRef.current) {
      const zonedNow = toZonedDate(new Date(), userTz);
      const currentHour = zonedNow.getHours();
      const scrollHour = Math.max(currentHour - 1, 0);
      const scrollPos = scrollHour * 80;
      scrollContainerRef.current.scrollTo({ top: scrollPos, behavior: 'smooth' });
    }
  }, [view, currentDate, userTz]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const days = useMemo(() => {
    if (view === 'day') return [currentDate];
    if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    }
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      return eachDayOfInterval({ 
        start: startOfWeek(monthStart, { weekStartsOn: 1 }), 
        end: endOfWeek(monthEnd, { weekStartsOn: 1 }) 
      });
    }
    return [];
  }, [currentDate, view]);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const calculateTimePosition = (date: Date) => {
    const hoursElapsed = parseInt(formatInTimezone(date, 'H', userTz)) + 
                         parseInt(formatInTimezone(date, 'm', userTz)) / 60;
    return (hoursElapsed / 24) * 100;
  };

  const formatHourLabel = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const statusBadge = (status: Event['status']) => {
    if (status === 'completed') return { label: 'Completed', className: 'bg-sky-50 text-sky-700 border-sky-100' };
    if (status === 'cancelled') return { label: 'Cancelled', className: 'bg-rose-50 text-rose-600 border-rose-100' };
    if (status === 'no-shows') return { label: 'No-show', className: 'bg-amber-50 text-amber-700 border-amber-100' };
    return { label: 'Scheduled', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  };

  const timeIndicatorPos = calculateTimePosition(currentTime);

  // --- LAYOUT ALGORITHM ---
  const layoutEventsByDay = (day: Date): EventLayout[] => {
    const dayStr = formatInTimezone(day, 'yyyy-MM-dd', userTz);
    
    const dayEvents = events
      .filter(e => formatInTimezone(parseISO(e.start_time), 'yyyy-MM-dd', userTz) === dayStr)
      .sort((a, b) => {
        const startDiff = parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime();
        if (startDiff !== 0) return startDiff;
        return parseISO(b.end_time).getTime() - parseISO(a.end_time).getTime();
      });

    if (dayEvents.length === 0) return [];

    const clusters: Event[][] = [];
    let currentCluster: Event[] = [];
    let clusterEnd: Date | null = null;

    dayEvents.forEach(event => {
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);

      if (!clusterEnd || start < clusterEnd) {
        currentCluster.push(event);
        if (!clusterEnd || end > clusterEnd) clusterEnd = end;
      } else {
        clusters.push(currentCluster);
        currentCluster = [event];
        clusterEnd = end;
      }
    });
    if (currentCluster.length > 0) clusters.push(currentCluster);

    const layouts: EventLayout[] = [];

    clusters.forEach(cluster => {
      const columns: Event[][] = [];
      
      cluster.forEach(event => {
        let placed = false;
        const start = parseISO(event.start_time);

        for (let i = 0; i < columns.length; i++) {
          const lastEventInCol = columns[i][columns[i].length - 1];
          if (start >= parseISO(lastEventInCol.end_time)) {
            columns[i].push(event);
            placed = true;
            break;
          }
        }

        if (!placed) {
          columns.push([event]);
        }
      });

      const maxCols = columns.length;
      cluster.forEach(event => {
        let colIndex = -1;
        for (let i = 0; i < columns.length; i++) {
          if (columns[i].includes(event)) {
            colIndex = i;
            break;
          }
        }

        const start = parseISO(event.start_time);
        const end = parseISO(event.end_time);
        const top = calculateTimePosition(start) || 0;
        const bottom = calculateTimePosition(end) || 100;
        const height = Math.max(bottom - top, 3); // Min height 3% (~25px in 14h view)

        layouts.push({
          ...event,
          top,
          height,
          column: colIndex,
          maxColumns: maxCols,
          left: (colIndex / maxCols) * 100,
          width: (100 / maxCols)
        });
      });
    });

    return layouts;
  };

  const visibleEvents = events.filter(e => 
    days.some(day => isSameDay(parseISO(e.start_time), day))
  );

  return (
    <div className="flex-1 bg-white rounded-2xl border border-[#f0f1f3] shadow-xl shadow-slate-200/50 flex flex-col relative overflow-hidden group/grid h-full">
      {/* 1. Header (Days) */}
      <div className={cn(
        "grid border-b border-[#f0f1f3]",
        view === 'month' ? "grid-cols-1" : "grid-cols-[64px_1fr]"
      )}>
        {view !== 'month' && (
          <div className="border-r border-[#f0f1f3] h-14 bg-[#f8f9fb]/50 flex items-center justify-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Time</span>
          </div>
        )}
        <div className={cn(
          "grid divide-x divide-[#f0f1f3]",
          view === 'month' ? "grid-cols-7" : `grid-cols-${days.length}`
        )} style={view !== 'month' ? { gridTemplateColumns: `repeat(${days.length}, 1fr)` } : {}}>
          {days.slice(0, view === 'month' ? 7 : days.length).map((day, idx) => (
            <div 
              key={idx} 
              className={cn(
                "h-14 flex flex-col items-center justify-center space-y-0.5",
                view !== 'month' && "cursor-pointer group/header hover:bg-slate-50 transition-colors"
              )}
              onClick={() => {
                if (view !== 'month') {
                  onDateChange(day);
                  onViewChange('day');
                }
              }}
            >
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{format(day, view === 'month' ? 'EEEE' : 'EEE')}</span>
              {view !== 'month' && (
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                  isToday(day) ? "bg-[#5C6EFF] text-white shadow-lg shadow-[#5C6EFF]/20" : 
                  isSameDay(day, currentDate) ? "bg-slate-200 text-slate-900 shadow-sm" : "text-slate-900",
                  "group-hover/header:ring-2 group-hover/header:ring-[#5C6EFF]/20"
                )}>
                  {format(day, 'dd')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Grid Body */}
      <div className="flex-1 relative overflow-y-auto thin-scrollbar bg-[#fcfdfe]" ref={scrollContainerRef}>
        {visibleEvents.length === 0 && view !== 'month' && null}

        <div className={cn(
          "grid min-h-full",
          view === 'month' ? "grid-cols-7 auto-rows-fr" : "grid-cols-[64px_1fr]"
        )}>
          {view === 'month' ? (
            days.map((day, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "min-h-[120px] p-2 border-b border-r border-[#f0f1f3] transition-colors relative group/day cursor-pointer",
                  !isSameMonth(day, currentDate) ? "bg-[#f8f9fb]/50" : "bg-white hover:bg-slate-50",
                  isToday(day) && "bg-blue-50/20"
                )}
                onClick={() => {
                  openCreateEventModal({
                    date: format(day, 'yyyy-MM-dd'),
                    time: '09:00', // Default time for month view selection
                  });
                }}
              >
                <span className={cn(
                  "text-[10px] font-bold transition-all",
                  isToday(day) ? "text-[#5C6EFF] scale-110" : "text-slate-400 group-hover/day:text-slate-900",
                  !isSameMonth(day, currentDate) && "opacity-30"
                )}>
                  {format(day, 'd')}
                </span>
                
                <div className="mt-2 space-y-1">
                  {events.filter(e => isSameDay(parseISO(e.start_time), day)).slice(0, 3).map(event => (
                    <div 
                      key={event.id} 
                      onClick={(e) => {
                        e.stopPropagation();
                        openEventDetail(event);
                      }}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[8px] font-bold truncate border-l-2 shadow-sm cursor-pointer hover:brightness-95 transition-all flex items-center justify-between gap-1", 
                        event.status === 'cancelled' ? 'bg-rose-50 border-rose-300 text-rose-700' : event.status === 'completed' ? 'bg-sky-50 border-sky-300 text-sky-700' : event.color_theme || "bg-indigo-50 border-indigo-500 text-indigo-700"
                      )}
                    >
                      <span className={cn("truncate", event.status === 'cancelled' ? 'line-through opacity-70' : '')}>{event.title}</span>
                      {(event.status !== 'scheduled' || (event as any).rescheduled || (event as any).previous_start_time) && (
                        <span
                          title={event.status === 'scheduled' ? 'Scheduled' : statusBadge(event.status).label}
                          className={cn(
                            "ml-2 ml-2 inline-block text-[8px] font-bold uppercase tracking-widest px-1 py-0.5 rounded-full",
                            statusBadge(event.status).className
                          )}
                        >
                          {statusBadge(event.status).label}
                        </span>
                      )}
                    </div>
                  ))}
                  {events.filter(e => isSameDay(parseISO(e.start_time), day)).length > 3 && (
                    <span className="text-[7px] font-bold text-slate-400 pl-1">+{events.filter(e => isSameDay(parseISO(e.start_time), day)).length - 3} more</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="border-r border-[#f0f1f3] bg-[#f8f9fb]/20">
                {hours.map((hour) => (
                  <div key={hour} className="h-20 border-b border-[#f0f1f3]/50 flex items-start justify-center pr-2 pt-2 relative">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-none bg-white/80 px-1 rounded z-10">
                      {formatHourLabel(hour)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="relative grid divide-x divide-[#f0f1f3]" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                <div className="absolute inset-0 pointer-events-none">
                  {hours.slice(0, -1).map((hour) => (
                    <div key={hour} className="h-20 border-b border-[#f0f1f3]/60 w-full flex flex-col">
                       <div className="flex-1 border-b border-[#f0f1f3]/20 border-dashed"></div>
                       <div className="flex-1"></div>
                    </div>
                  ))}
                </div>

                {/* Event Click/Interaction Area */}
                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                  {days.map((day) => (
                    <div key={day.toString()} className="h-full">
                      {hours.slice(0, -1).map((hour) => (
                        <div key={hour} className="h-20 flex flex-col">
                          <div 
                            className="flex-1 hover:bg-blue-50/10 cursor-pointer pointer-events-auto transition-colors"
                            onClick={() => {
                              openCreateEventModal({
                                date: format(day, 'yyyy-MM-dd'),
                                time: `${hour.toString().padStart(2, '0')}:00`,
                              });
                            }}
                          ></div>
                          <div 
                            className="flex-1 hover:bg-blue-50/10 cursor-pointer pointer-events-auto transition-colors"
                            onClick={() => {
                              openCreateEventModal({
                                date: format(day, 'yyyy-MM-dd'),
                                time: `${hour.toString().padStart(2, '0')}:30`,
                              });
                            }}
                          ></div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Overlapping Events Layer */}
                {days.map((day) => {
                  const dayLayouts = layoutEventsByDay(day);
                  return (
                    <div key={day.toString()} className="h-full relative pointer-events-none">
                      {dayLayouts.map(event => {
                        const start = parseISO(event.start_time);
                        const end = parseISO(event.end_time);
                        const themeColorClass = event.color_theme?.split(' ')[0] || "bg-[#5C6EFF]";
                        
                        return (
                          <div 
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEventDetail(event);
                            }}
                            className={cn(
                              "absolute event-card-premium rounded-xl cursor-pointer pointer-events-auto group/card overflow-hidden",
                              event.height < 5 && "min-h-[24px]"
                            )}
                            style={{ 
                              top: `${event.top}%`, 
                              height: `${event.height}%`, 
                              left: `${event.left}%`, 
                              width: `${event.width - 0.4}%`, 
                            }}
                          >
                            <div className="flex h-full w-full relative">
                              {/* Status badge */}
                              {(event.status !== 'scheduled' || (event as any).rescheduled || (event as any).previous_start_time) && (
                                  <div className={cn(
                                    "absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold backdrop-blur-md shadow-sm",
                                  statusBadge(event.status).className
                                  )}>
                                  {statusBadge(event.status).label}
                                  </div>
                                )}
                               <div className={cn("event-color-indicator shrink-0", themeColorClass)} />
                               
                               <div className="flex-1 flex flex-col p-2.5 min-w-0">
                                 <p className={cn("event-title-p truncate group-hover/card:text-[#5C6EFF] transition-colors mb-2", event.status === 'cancelled' ? 'line-through text-slate-400' : '')}>
                                    {event.title}
                                    {event.attendees?.length > 1 && (
                                      <span className="ml-2 inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded-md">
                                        <span className="material-symbols-outlined text-[12px]">group</span>
                                        {event.attendees.length}
                                      </span>
                                    )}
                                 </p>
                                 
                                 {event.height > 6 && (
                                   <div className="event-time-p mt-auto">
                                      <span className="material-symbols-outlined text-[11px] font-bold opacity-70">schedule</span>
                                      <span className="truncate">
                                        {formatInTimezone(start, 'h:mm', userTz)} - {formatInTimezone(end, 'h:mm a', userTz)}
                                      </span>
                                   </div>
                                 )}
                               </div>

                               {/* Glow effect on hover */}
                               <div className={cn(
                                 "absolute inset-0 opacity-0 group-hover/card:opacity-[0.04] transition-opacity pointer-events-none",
                                 themeColorClass
                               )} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {timeIndicatorPos !== null && (
                  <div 
                    className="absolute left-0 right-0 z-50 flex items-center pointer-events-none transition-all duration-1000"
                    style={{ top: `${timeIndicatorPos}%` }}
                  >
                    <div className="w-full h-[2px] bg-[#5C6EFF]/40 shadow-[0_0_12px_rgba(92,110,255,0.4)]"></div>
                    <div className="absolute left-0 w-3 h-3 bg-[#5C6EFF] rounded-full border-2 border-white shadow-glow-indigo transform -translate-x-1.5 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-glow"></div>
                    </div>
                    <div className="absolute right-3 bg-slate-900 text-white text-[8px] px-2.5 py-1 rounded-lg font-bold shadow-2xl transform translate-x-1 flex items-center space-x-2 backdrop-blur-md bg-slate-900/90">
                        <span className="w-1.5 h-1.5 bg-[#5C6EFF] rounded-full animate-pulse"></span>
                        <span className="tracking-widest uppercase">{formatInTimezone(currentTime, 'h:mm a', userTz)}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
