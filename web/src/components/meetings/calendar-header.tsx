'use client';

import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CalendarHeaderProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    view: 'day' | 'week' | 'month';
    onViewChange: (view: 'day' | 'week' | 'month') => void;
}

export default function CalendarHeader({ currentDate, onDateChange, view, onViewChange }: CalendarHeaderProps) {
  const goToToday = () => onDateChange(new Date());

  const onPrev = () => {
    if (view === 'day') onDateChange(subDays(currentDate, 1));
    else if (view === 'week') onDateChange(subWeeks(currentDate, 1));
    else if (view === 'month') onDateChange(subMonths(currentDate, 1));
  };

  const onNext = () => {
    if (view === 'day') onDateChange(addDays(currentDate, 1));
    else if (view === 'week') onDateChange(addWeeks(currentDate, 1));
    else if (view === 'month') onDateChange(addMonths(currentDate, 1));
  };

  const monthLabel = format(currentDate, 'MMMM yyyy');
  const views: ('day' | 'week' | 'month')[] = ['day', 'week', 'month'];

  return (
    <div className="flex flex-col space-y-4 mb-6">
      <div className="flex items-center justify-between">
        {/* Navigation & Date */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <button 
              onClick={goToToday}
              className="px-4 h-9 bg-white border border-[#f0f1f3] text-[10px] font-bold uppercase tracking-widest text-slate-800 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
            >
              Today
            </button>
            <div className="flex items-center space-x-1">
              <button 
                onClick={onPrev}
                className="w-9 h-9 flex items-center justify-center bg-white border border-[#f0f1f3] text-slate-800 hover:bg-slate-50 rounded-lg transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button 
                onClick={onNext}
                className="w-9 h-9 flex items-center justify-center bg-white border border-[#f0f1f3] text-slate-800 hover:bg-slate-50 rounded-lg transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tighter ml-2">
              {monthLabel}
            </h2>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Eastern Time</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">GMT-5</span>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center space-x-4">
          <div className="bg-[#f8f9fb] p-1 rounded-xl border border-[#f0f1f3] flex shadow-sm">
            {views.map((v) => (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                className={cn(
                  "px-5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all rounded-lg",
                  view === v ? "bg-white text-[#5C6EFF] shadow-sm ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

