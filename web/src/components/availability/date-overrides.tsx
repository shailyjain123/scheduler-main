'use client';

import { useMemo, useState } from 'react';
import { DateOverride } from '@/lib/types/schedules';

interface DateOverridesProps {
  overrides: DateOverride[];
  onAdd: (override: DateOverride) => Promise<void>;
  onDelete: (id?: number) => Promise<void>;
  disabled?: boolean;
  conflictingOverrideIds?: number[]; // New prop to identify conflicts
}

export default function DateOverrides({ 
  overrides, 
  onAdd, 
  onDelete, 
  disabled = false,
  conflictingOverrideIds = [] 
}: DateOverridesProps) {
  // ... (previous state)
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(() => ({
    date: new Date().toLocaleDateString('en-CA'),
    is_unavailable: true,
    start_time: '09:00',
    end_time: '17:00',
    reason: ''
  }));

  const sortedOverrides = useMemo(
    () => [...overrides].sort((a, b) => a.date.localeCompare(b.date)),
    [overrides]
  );

  const [overrideType, setOverrideType] = useState<'entire_day' | 'specific_hours'>('entire_day');

  const submit = async () => {
    if (disabled) return;
    if (!form.date) return;
    setIsSubmitting(true);
    try {
      await onAdd({
        date: form.date,
        is_unavailable: true, // This component is specifically for unavailability overrides in the new flow
        start_time: overrideType === 'entire_day' ? null : form.start_time,
        end_time: overrideType === 'entire_day' ? null : form.end_time,
        reason: form.reason || null,
      });
      setIsOpen(false);
      setForm({ ...form, reason: '' });
      setOverrideType('entire_day');
    } catch {
      // Parent handles error
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancel = () => {
    setIsOpen(false);
    setForm({
      date: new Date().toLocaleDateString('en-CA'),
      is_unavailable: true,
      start_time: '09:00',
      end_time: '17:00',
      reason: ''
    });
    setOverrideType('entire_day');
  };

  const hasInvalidRange = !!(overrideType === 'specific_hours' && form.start_time && form.end_time && form.end_time <= form.start_time);

  return (
    <section className="bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-slate-900">Date Overrides</h4>
          <span
            className="material-symbols-outlined text-slate-400 text-[18px] cursor-help"
            title="Date overrides allow you to block specific dates or times outside your regular schedule."
          >
            info
          </span>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 mb-4">
        Block entire days or specific time ranges (e.g., for appointments or vacations).
      </p>

      {!isOpen ? (
        <button
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          className="w-full bg-[#5C6EFF] text-white font-semibold py-2.5 rounded-lg mb-6 hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Add Override</span>
        </button>
      ) : (
        <div className="mb-6 rounded-lg border border-slate-200 p-4 space-y-4 bg-slate-50 shadow-inner">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Date</label>
            <input
              type="date"
              value={form.date}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#5C6EFF]/20 focus:border-[#5C6EFF] outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unavailability Type</label>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOverrideType('entire_day')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs font-bold transition-all ${overrideType === 'entire_day' ? 'bg-[#5C6EFF] border-[#5C6EFF] text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                Entire Day
              </button>
              <button
                type="button"
                onClick={() => setOverrideType('specific_hours')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs font-bold transition-all ${overrideType === 'specific_hours' ? 'bg-[#5C6EFF] border-[#5C6EFF] text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                Specific Hours
              </button>
            </div>
          </div>

          {overrideType === 'specific_hours' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">From</label>
                  <input
                    type="time"
                    value={form.start_time || '09:00'}
                    disabled={disabled}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className={`w-full bg-white border rounded-lg px-3 py-2 text-xs focus:ring-2 outline-none transition-all ${hasInvalidRange ? 'border-red-300 bg-red-50/50 focus:ring-red-200' : 'border-slate-200 focus:ring-[#5C6EFF]/20'}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">To</label>
                  <input
                    type="time"
                    value={form.end_time || '17:00'}
                    disabled={disabled}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className={`w-full bg-white border rounded-lg px-3 py-2 text-xs focus:ring-2 outline-none transition-all ${hasInvalidRange ? 'border-red-300 bg-red-50/50 focus:ring-red-200' : 'border-slate-200 focus:ring-[#5C6EFF]/20'}`}
                  />
                </div>
              </div>
              {hasInvalidRange && (
                <p className="mt-2 text-[10px] font-bold text-red-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  End time must be after start time
                </p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Label (Optional)</label>
            <input
              type="text"
              value={form.reason}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g., Doctor&apos;s appointment"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#5C6EFF]/20 focus:border-[#5C6EFF] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              disabled={disabled || isSubmitting}
              onClick={cancel}
              className="w-full bg-white border border-slate-200 text-slate-600 text-xs font-bold py-2.5 rounded-lg hover:bg-slate-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              disabled={disabled || isSubmitting || !form.date || hasInvalidRange}
              onClick={submit}
              className="w-full bg-slate-900 text-white text-xs font-bold py-2.5 rounded-lg shadow-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Override'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sortedOverrides.length > 0 ? (
          sortedOverrides.map((override, idx) => {
            const hasConflict = override.id && conflictingOverrideIds.includes(override.id);
            const isPartial = override.start_time && override.end_time;
            
            return (
              <div key={idx} className={`flex items-center justify-between p-3 border rounded-lg transition-all ${hasConflict ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-start gap-2.5">
                  {hasConflict && (
                    <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5 animate-bounce-subtle" title="Conflict detected with existing meetings">
                      warning
                    </span>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">{override.date}</p>
                      {isPartial && (
                        <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                          Partial
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-tight">
                      {isPartial ? `${override.start_time} - ${override.end_time}` : 'Entire Day'}
                      {override.reason && ` • ${override.reason}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${override.is_unavailable
                      ? 'bg-red-50 text-red-600 border-red-100'
                      : 'bg-green-50 text-green-600 border-green-100'
                    }`}>
                    {override.is_unavailable ? 'Unavailable' : 'Available'}
                  </span>
                  <button
                    disabled={disabled}
                    onClick={() => {
                      if (window.confirm("Are you sure you want to remove this override and restore your regular hours?")) {
                        onDelete(override.id);
                      }
                    }}
                    className="material-symbols-outlined text-slate-400 hover:text-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    title="Delete override"
                  >
                    delete
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 px-4 border-2 border-dashed border-slate-100 rounded-xl">
            <p className="text-xs font-medium text-slate-400">No overrides set. Taking a holiday? Add it here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
