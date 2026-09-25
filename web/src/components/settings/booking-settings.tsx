'use client';

import React, { useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

const BUFFER_OPTIONS = [0, 5, 10, 15, 30, 45, 60];

const MINIMUM_NOTICE_OPTIONS = [
  { label: '0 minutes (instant)', value: 0, unit: 'Minutes' },
  { label: '30 minutes', value: 30, unit: 'Minutes' },
  { label: '1 hour', value: 1, unit: 'Hours' },
  { label: '2 hours', value: 2, unit: 'Hours' },
  { label: '4 hours', value: 4, unit: 'Hours' },
  { label: '6 hours', value: 6, unit: 'Hours' },
  { label: '12 hours', value: 12, unit: 'Hours' },
  { label: '24 hours', value: 24, unit: 'Hours' },
];

const DATE_RANGE_OPTIONS = [
  { label: 'Indefinitely', type: 'indefinitely', count: 0 },
  { label: 'Next 7 days', type: 'days', count: 7 },
  { label: 'Next 15 days', type: 'days', count: 15 },
  { label: 'Next 30 days', type: 'days', count: 30 },
  { label: 'Next 60 days', type: 'days', count: 60 },
  { label: 'Next 90 days', type: 'days', count: 90 },
];

export default function BookingSettings() {
  const { settings, updateSettings } = useSettingsStore();
  const [isCustomNotice, setIsCustomNotice] = useState(false);
  const [isCustomRange, setIsCustomRange] = useState(false);
  
  // Local state for numeric inputs
  const [localMaxBookings, setLocalMaxBookings] = useState<string>(
    settings?.max_bookings_per_day?.toString() || ''
  );
  const [localRangeCount, setLocalRangeCount] = useState<string>(
    settings?.booking_range_count?.toString() || ''
  );
  const [localNoticeValue, setLocalNoticeValue] = useState<string>(
    settings?.minimum_notice_value?.toString() || '0'
  );

  // Sync local state from store
  React.useEffect(() => {
    if (settings) {
      setLocalMaxBookings(settings.max_bookings_per_day?.toString() || '');
      setLocalRangeCount(settings.booking_range_count?.toString() || '');
      setLocalNoticeValue(settings.minimum_notice_value?.toString() || '0');
    }
  }, [settings?.max_bookings_per_day, settings?.booking_range_count, settings?.minimum_notice_value]);

  if (!settings) return null;

  const handleMaxBookingsBlur = () => {
    const value = parseInt(localMaxBookings);
    if (!isNaN(value) && value > 0) {
      updateSettings({ max_bookings_per_day: value });
    } else if (localMaxBookings === '') {
      updateSettings({ max_bookings_per_day: null });
    } else {
      setLocalMaxBookings(settings.max_bookings_per_day?.toString() || '');
    }
  };

  const handleRangeCountBlur = () => {
    const value = parseInt(localRangeCount);
    if (!isNaN(value) && value > 0) {
      updateSettings({ booking_range_type: 'days', booking_range_count: value });
    } else {
      setLocalRangeCount(settings.booking_range_count?.toString() || '');
    }
  };

  const handleNoticeValueBlur = () => {
    const value = parseInt(localNoticeValue);
    if (!isNaN(value) && value >= 0) {
      updateSettings({ minimum_notice_value: value });
    } else {
      setLocalNoticeValue(settings.minimum_notice_value?.toString() || '0');
    }
  };

  const currentNoticeValue = settings.minimum_notice_value;
  const currentNoticeUnit = settings.minimum_notice_unit;
  
  const isPredefinedNotice = MINIMUM_NOTICE_OPTIONS.some(
    opt => opt.value === currentNoticeValue && opt.unit === currentNoticeUnit
  );

  const currentRangeType = settings.booking_range_type;
  
  return (
    <div className="grid grid-cols-12 gap-6 pb-20">
      <div className="col-span-12 lg:col-span-8 space-y-6">
        
        {/* Date Range Section */}
        <section className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3] p-6 transition-all hover:shadow-[0_8px_40px_rgba(17,24,39,0.08)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#EEF0FF] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#5C6EFF] text-xl">calendar_month</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900">Booking Range</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Range Option</label>
              <select 
                value={isCustomRange ? 'custom' : (currentRangeType === 'indefinitely' ? 'indefinitely' : settings.booking_range_count)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setIsCustomRange(true);
                  } else if (val === 'indefinitely') {
                    setIsCustomRange(false);
                    updateSettings({ booking_range_type: 'indefinitely' });
                  } else {
                    setIsCustomRange(false);
                    const count = parseInt(val);
                    setLocalRangeCount(count.toString());
                    updateSettings({ booking_range_type: 'days', booking_range_count: count });
                  }
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-[#f0f1f3] rounded-2xl focus:ring-4 focus:ring-[#5C6EFF]/5 transition-all outline-none font-bold text-sm text-slate-700 appearance-none"
              >
                {DATE_RANGE_OPTIONS.map(opt => (
                  <option key={opt.label} value={opt.type === 'indefinitely' ? 'indefinitely' : opt.count}>
                    {opt.label}
                  </option>
                ))}
                <option value="custom">Custom range...</option>
              </select>
            </div>

            {isCustomRange && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Number of Days</label>
                <div className="relative">
                  <input 
                    type="number"
                    min="1"
                    value={localRangeCount}
                    onChange={(e) => setLocalRangeCount(e.target.value)}
                    onBlur={handleRangeCountBlur}
                    className="w-full px-4 py-3 bg-slate-50 border border-[#f0f1f3] rounded-2xl focus:ring-4 focus:ring-[#5C6EFF]/5 transition-all outline-none font-bold text-sm text-slate-700"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Days</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Minimum Notice Section */}
        <section className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3] p-6 transition-all hover:shadow-[0_8px_40px_rgba(17,24,39,0.08)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#D97706] text-xl">timer</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900">Minimum Notice</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Notice Option</label>
              <select 
                value={isCustomNotice || !isPredefinedNotice ? 'custom' : `${currentNoticeValue}-${currentNoticeUnit}`}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setIsCustomNotice(true);
                  } else {
                    setIsCustomNotice(false);
                    const [v, u] = val.split('-');
                    updateSettings({ 
                      minimum_notice_value: parseInt(v), 
                      minimum_notice_unit: u as any 
                    });
                  }
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-[#f0f1f3] rounded-2xl focus:ring-4 focus:ring-[#5C6EFF]/5 transition-all outline-none font-bold text-sm text-slate-700 appearance-none"
              >
                {MINIMUM_NOTICE_OPTIONS.map(opt => (
                  <option key={`${opt.value}-${opt.unit}`} value={`${opt.value}-${opt.unit}`}>
                    {opt.label}
                  </option>
                ))}
                <option value="custom">Custom...</option>
              </select>
            </div>

            {(isCustomNotice || !isPredefinedNotice) && (
              <div className="flex gap-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Value</label>
                  <input 
                    type="number"
                    min="0"
                    value={localNoticeValue}
                    onChange={(e) => setLocalNoticeValue(e.target.value)}
                    onBlur={handleNoticeValueBlur}
                    className="w-full px-4 py-3 bg-slate-50 border border-[#f0f1f3] rounded-2xl focus:ring-4 focus:ring-[#5C6EFF]/5 transition-all outline-none font-bold text-sm text-slate-700"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Unit</label>
                  <select 
                    value={settings.minimum_notice_unit}
                    onChange={(e) => updateSettings({ minimum_notice_unit: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-50 border border-[#f0f1f3] rounded-2xl focus:ring-4 focus:ring-[#5C6EFF]/5 transition-all outline-none font-bold text-sm text-slate-700 appearance-none"
                  >
                    <option value="Minutes">Minutes</option>
                    <option value="Hours">Hours</option>
                    <option value="Days">Days</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Daily Load Section */}
        <section className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3] p-6 transition-all hover:shadow-[0_8px_40px_rgba(17,24,39,0.08)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#FFE4E6] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#E11D48] text-xl">event_busy</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900">Daily Booking Limit</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Limit Option</label>
              <select 
                value={settings.max_bookings_per_day === null ? 'unlimited' : 'custom'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'unlimited') {
                    setLocalMaxBookings('');
                    updateSettings({ max_bookings_per_day: null });
                  } else {
                    const defaultLimit = 5;
                    setLocalMaxBookings(defaultLimit.toString());
                    updateSettings({ max_bookings_per_day: defaultLimit });
                  }
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-[#f0f1f3] rounded-2xl focus:ring-4 focus:ring-[#5C6EFF]/5 transition-all outline-none font-bold text-sm text-slate-700 appearance-none"
              >
                <option value="unlimited">Unlimited bookings</option>
                <option value="custom">Custom limit...</option>
              </select>
            </div>

            {settings.max_bookings_per_day !== null && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Max Bookings</label>
                <div className="relative">
                  <input 
                    type="number"
                    min="1"
                    value={localMaxBookings}
                    onChange={(e) => setLocalMaxBookings(e.target.value)}
                    onBlur={handleMaxBookingsBlur}
                    className="w-full px-4 py-3 bg-slate-50 border border-[#f0f1f3] rounded-2xl focus:ring-4 focus:ring-[#5C6EFF]/5 transition-all outline-none font-bold text-sm text-slate-700"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Per Day</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Buffers Section */}
        <section className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3] p-6 transition-all hover:shadow-[0_8px_40px_rgba(17,24,39,0.08)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#16A34A] text-xl">hourglass_empty</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900">Meeting Buffers</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Buffer Before</label>
              <select 
                value={settings.buffer_before}
                onChange={(e) => updateSettings({ buffer_before: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 border border-[#f0f1f3] rounded-2xl focus:ring-4 focus:ring-[#5C6EFF]/5 transition-all outline-none font-bold text-sm text-slate-700 appearance-none"
              >
                {BUFFER_OPTIONS.map(opt => (
                  <option key={`before-${opt}`} value={opt}>{opt === 0 ? 'None' : `${opt} minutes`}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Buffer After</label>
              <select 
                value={settings.buffer_after}
                onChange={(e) => updateSettings({ buffer_after: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 border border-[#f0f1f3] rounded-2xl focus:ring-4 focus:ring-[#5C6EFF]/5 transition-all outline-none font-bold text-sm text-slate-700 appearance-none"
              >
                {BUFFER_OPTIONS.map(opt => (
                  <option key={`after-${opt}`} value={opt}>{opt === 0 ? 'None' : `${opt} minutes`}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

      </div>

      {/* Sidebar: Information/Tips */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#5C6EFF]/10 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-[#5C6EFF]/20" />
          
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[#5C6EFF]">info</span>
            </div>
            <h4 className="text-base font-bold mb-4 tracking-tight uppercase">Global Controls</h4>
            <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-6 uppercase tracking-wider">
              These settings apply to all your event types unless overridden in specific type settings.
            </p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-[#5C6EFF] text-sm mt-0.5">verified</span>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Enforce consistency</p>
              </div>
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-[#5C6EFF] text-sm mt-0.5">verified</span>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Prevent overlaps</p>
              </div>
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-[#5C6EFF] text-sm mt-0.5">verified</span>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Manage workload</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#5C6EFF] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <h4 className="text-base font-bold mb-2 tracking-tight uppercase">Base Configuration</h4>
            <p className="text-[#EEF0FF] text-[10px] font-bold leading-relaxed uppercase tracking-widest opacity-80">
              Your default availability is calculated based on these parameters.
            </p>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        </div>
      </div>
    </div>
  );
}
