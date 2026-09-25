'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { cn } from '@/lib/utils';
import { AppointmentsOverviewItem } from '@/lib/types/dashboard';

interface AppointmentsOverviewChartProps {
  data: AppointmentsOverviewItem[];
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (date: string) => void;
  onCustomToChange: (date: string) => void;
  isLoading?: boolean;
}

export default function AppointmentsOverviewChartCore({ 
  data, 
  dateRange, 
  onDateRangeChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  isLoading = false
}: AppointmentsOverviewChartProps) {

  const [localFrom, setLocalFrom] = useState(customFrom);
  const [localTo, setLocalTo] = useState(customTo);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => { setLocalFrom(customFrom); }, [customFrom]);
  useEffect(() => { setLocalTo(customTo); }, [customTo]);

  const getDiffDays = () => {
    if (dateRange === 'last-7') return 7;
    if (dateRange === 'last-30' || dateRange === 'next-30') return 30;
    if (dateRange === 'next-90') return 90;
    if (dateRange === 'last-30-next-30') return 60;
    if (dateRange === 'custom' && customFrom && customTo) {
      const start = new Date(customFrom);
      const end = new Date(customTo);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 30;
  };

  const bucketDataByWeek = (items: AppointmentsOverviewItem[]) => {
    const weeks: { [key: string]: AppointmentsOverviewItem } = {};
    items.forEach(item => {
      const date = new Date(item.date);
      const day = date.getDay();
      const diff = date.getDate() - day;
      const weekStart = new Date(date.setDate(diff));
      const weekKey = weekStart.toISOString().split('T')[0];
      if (!weeks[weekKey]) {
        weeks[weekKey] = { date: weekKey, scheduled: 0, completed: 0, cancelled: 0, no_shows: 0 };
      }
      weeks[weekKey].scheduled += item.scheduled || 0;
      weeks[weekKey].completed += item.completed || 0;
      weeks[weekKey].cancelled += item.cancelled || 0;
      weeks[weekKey].no_shows += item.no_shows || 0;
    });
    return Object.values(weeks).sort((a, b) => a.date.localeCompare(b.date)).map(w => {
      const dateObj = new Date(w.date);
      const endDateObj = new Date(dateObj);
      endDateObj.setDate(endDateObj.getDate() + 6);
      return { ...w, formattedDate: `${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` };
    });
  };

  const bucketDataByMonth = (items: AppointmentsOverviewItem[]) => {
    const months: { [key: string]: AppointmentsOverviewItem } = {};
    items.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[monthKey]) {
        months[monthKey] = { date: monthKey + '-01', scheduled: 0, completed: 0, cancelled: 0, no_shows: 0 };
      }
      months[monthKey].scheduled += item.scheduled || 0;
      months[monthKey].completed += item.completed || 0;
      months[monthKey].cancelled += item.cancelled || 0;
      months[monthKey].no_shows += item.no_shows || 0;
    });
    return Object.values(months).sort((a, b) => a.date.localeCompare(b.date)).map(m => {
      const dateObj = new Date(m.date);
      return { ...m, formattedDate: dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) };
    });
  };

  const diffDays = getDiffDays();
  let formattedData = [] as any[];
  if (diffDays > 180) formattedData = bucketDataByMonth(data);
  else if (diffDays > 30) formattedData = bucketDataByWeek(data);
  else formattedData = data.map(item => ({ ...item, formattedDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }));

  const getActiveRangeLabel = () => {
    switch (dateRange) {
      case 'last-7': return 'Last 7 Days';
      case 'last-30': return 'Last 30 Days';
      case 'next-30': return 'Next 30 Days';
      case 'next-90': return 'Next 90 Days';
      case 'last-30-next-30': return 'Last 30 & Next 30 Days';
      case 'custom': return `Custom (${customFrom || 'Start'} to ${customTo || 'End'})`;
      default: return '';
    }
  };

  return (
    <section className="bg-white p-5 rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3] flex flex-col h-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h4 className="text-[17px] font-bold text-slate-900 tracking-tight">Appointments Overview</h4>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Trends over time</p>
            {getActiveRangeLabel() && (
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-[#5C6EFF]/10 text-[#5C6EFF] rounded-full">
                {getActiveRangeLabel()}
              </span>
            )}
          </div>
        </div>
        <div className="relative min-w-[180px]">
          <select value={dateRange} onChange={(e) => onDateRangeChange(e.target.value)} className="w-full appearance-none bg-white border border-[#f0f1f3] rounded-lg px-3 py-1.5 pr-8 text-[12px] font-bold text-slate-700 shadow-sm outline-none focus:border-[#5C6EFF] focus:ring-1 focus:ring-[#5C6EFF]">
            <option value="last-30-next-30">Last 30 Days + Next 30 Days</option>
            <option value="last-7">Last 7 Days</option>
            <option value="last-30">Last 30 Days</option>
            <option value="next-30">Next 30 Days</option>
            <option value="next-90">Next 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-400 pointer-events-none">expand_more</span>
        </div>
      </div>

      {dateRange === 'custom' && (
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-[#f0f1f3] flex-wrap">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Start Date</span>
            <input type="date" value={localFrom} onChange={(e) => setLocalFrom(e.target.value)} className="bg-white border border-[#f0f1f3] rounded-lg px-3 py-1 text-[12px] font-semibold text-slate-700 shadow-sm outline-none focus:border-[#5C6EFF] focus:ring-1 focus:ring-[#5C6EFF]" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">End Date</span>
            <input type="date" value={localTo} onChange={(e) => setLocalTo(e.target.value)} className="bg-white border border-[#f0f1f3] rounded-lg px-3 py-1 text-[12px] font-semibold text-slate-700 shadow-sm outline-none focus:border-[#5C6EFF] focus:ring-1 focus:ring-[#5C6EFF]" />
          </div>
          <button onClick={() => { onCustomFromChange(localFrom); onCustomToChange(localTo); }} disabled={!localFrom || !localTo} className="bg-[#5C6EFF] hover:bg-[#4A5EE5] text-white text-[12px] font-bold px-4 py-1.5 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[32px] flex items-center justify-center">
            Apply Filter
          </button>
        </div>
      )}

      <div className={cn("flex-1 min-h-[300px] min-w-0 w-full relative transition-opacity duration-500", isLoading && "opacity-40 pointer-events-none")}>
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
            <span className="material-symbols-outlined text-4xl mb-3 font-light">show_chart</span>
            <p className="text-[12px] font-bold uppercase tracking-widest">No data available</p>
          </div>
        ) : isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f1f3" />
              <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f0f1f3', boxShadow: '0 4px 20px rgba(17,24,39,0.08)' }} itemStyle={{ fontSize: '13px', fontWeight: 600 }} labelStyle={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }} />
              <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '20px' }} iconType="circle" />
              <Line type="monotone" name="Scheduled" dataKey="scheduled" stroke="#5C6EFF" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" name="Completed" dataKey="completed" stroke="#16A34A" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" name="Cancelled" dataKey="cancelled" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </section>
  );
}
