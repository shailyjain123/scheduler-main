'use client';

import { useState } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Event } from '@/lib/types/event';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatusFilter {
  status: Event['status'];
  name: string;
  color: string;
}

interface CalendarSidebarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  events?: Event[];
  activeStatuses: Record<Event['status'], boolean>;
  onToggleStatus: (status: Event['status']) => void;
}

const statusFilters: StatusFilter[] = [
  { status: 'scheduled', name: 'Scheduled', color: 'bg-emerald-500' },
  { status: 'completed', name: 'Completed', color: 'bg-sky-500' },
  { status: 'cancelled', name: 'Cancelled', color: 'bg-rose-500' },
  { status: 'no-shows', name: 'No-shows', color: 'bg-amber-500' },
];

export default function CalendarSidebar({ selectedDate, onDateChange, events = [], activeStatuses, onToggleStatus }: CalendarSidebarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);

  // Sync mini-calendar month view when selectedDate changes from outside (e.g. Navigation)
  if (selectedDate.getTime() !== prevSelectedDate.getTime()) {
    setPrevSelectedDate(selectedDate);
    setCurrentMonth(new Date(selectedDate));
  }

  const getDaysInMonth = (month: Date) => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  };

  const calendarDays = getDaysInMonth(currentMonth);
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <aside className="w-full flex flex-col h-full space-y-8">
      {/* 1. Mini Calendar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}
              className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button 
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {weekDays.map((day, idx) => (
            <span key={idx} className="text-[9px] font-bold text-slate-300 text-center uppercase tracking-widest">{day}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {calendarDays.map((day, idx) => {
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const hasEvents = events.some(e => isSameDay(new Date(e.start_time), day));
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

            return (
              <div key={idx} className="flex flex-col items-center">
                <button 
                  onClick={() => onDateChange(day)}
                  className={cn(
                    "w-7 h-7 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center justify-center relative",
                    isSelected ? "bg-[#5C6EFF] text-white shadow-lg shadow-[#5C6EFF]/20" : 
                    isTodayDate ? "text-[#5C6EFF] bg-blue-50/50" : 
                    isCurrentMonth ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900" : "text-slate-300"
                  )}
                >
                  {format(day, 'd')}
                  {hasEvents && !isSelected && (
                    <span className="absolute bottom-1 w-0.5 h-0.5 rounded-full bg-[#5C6EFF]"></span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Filters */}
      <div className="space-y-4">
        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1">Filters</h4>
        <div className="space-y-2">
          {statusFilters.map(type => (
            <button 
              key={type.status}
              onClick={() => onToggleStatus(type.status)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-5 h-5 rounded-lg flex items-center justify-center transition-all border-2",
                  activeStatuses[type.status] ? `${type.color} border-transparent shadow-lg shadow-indigo-500/10` : "border-slate-100 bg-slate-50"
                )}>
                  {activeStatuses[type.status] && <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>}
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-colors",
                  activeStatuses[type.status] ? "text-slate-800" : "text-slate-400"
                )}>
                  {type.name}
                </span>
              </div>
              <div className={cn("w-1.5 h-1.5 rounded-full ring-4 ring-transparent group-hover:ring-slate-50 transition-all", type.color)}></div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
