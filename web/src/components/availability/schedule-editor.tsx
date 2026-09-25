'use client';

import { AvailabilitySlot } from '@/lib/types/schedules';
import {
  getOverlappingSlotIndices,
  isInvalidSlotRange,
} from '@/lib/utils/availability-validation';

interface ScheduleEditorProps {
  slots: AvailabilitySlot[];
  onUpdate: (slots: AvailabilitySlot[]) => void;
  onApplyMondayToWeekdays?: () => void;
  disabled?: boolean;
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const ADD_SHIFT_DEFAULT_GAP_MINUTES = 60;

export default function ScheduleEditor({ slots, onUpdate, onApplyMondayToWeekdays, disabled = false }: ScheduleEditorProps) {
  const overlappingSlotIndices = getOverlappingSlotIndices(slots);

  const toMinutes = (value: string): number => {
    const [hours, minutes] = value.split(':').map(Number);
    return (hours * 60) + minutes;
  };

  const toTime = (totalMinutes: number): string => {
    const clamped = Math.max(0, Math.min(totalMinutes, (24 * 60) - 1));
    const hours = Math.floor(clamped / 60);
    const minutes = clamped % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getSlotsForDay = (dayIndex: number) => {
    return slots
      .filter((s) => s.day_of_week === dayIndex)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const toggleDay = (dayIndex: number, enabled: boolean) => {
    if (disabled) return;
    if (enabled) {
      if (getSlotsForDay(dayIndex).length === 0) {
        onUpdate([...slots, { day_of_week: dayIndex, start_time: '09:00', end_time: '17:00' }]);
      }
    } else {
      onUpdate(slots.filter((s) => s.day_of_week !== dayIndex));
    }
  };

  const addSlot = (dayIndex: number) => {
    if (disabled) return;

    const daySlots = getSlotsForDay(dayIndex);
    if (daySlots.length === 0) {
      onUpdate([...slots, { day_of_week: dayIndex, start_time: '09:00', end_time: '10:00' }]);
      return;
    }

    const latestEnd = Math.max(...daySlots.map((slot) => toMinutes(slot.end_time)));
    const defaultStart = latestEnd + ADD_SHIFT_DEFAULT_GAP_MINUTES;
    const defaultEnd = defaultStart + 60;

    if (defaultEnd > 24 * 60) {
      return;
    }

    onUpdate([
      ...slots,
      {
        day_of_week: dayIndex,
        start_time: toTime(defaultStart),
        end_time: toTime(defaultEnd),
      },
    ]);
  };

  const removeSlot = (slotId?: number, dayIndex?: number, index?: number) => {
    if (disabled) return;
    if (slotId) {
      onUpdate(slots.filter((s) => s.id !== slotId));
    } else {
      const daySlots = getSlotsForDay(dayIndex!);
      const slotToRemove = daySlots[index!];
      onUpdate(slots.filter((s) => s !== slotToRemove));
    }
  };

  const updateSlotTime = (slotIndex: number, field: 'start_time' | 'end_time', value: string) => {
    if (disabled) return;
    if (slotIndex < 0) return;
    const next = [...slots];
    next[slotIndex] = { ...next[slotIndex], [field]: value };
    onUpdate(next);
  };

  return (
    <section className="bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xl font-bold text-slate-900 tracking-tight">Working Hours</h4>
        <button
          type="button"
          onClick={onApplyMondayToWeekdays}
          disabled={disabled || getSlotsForDay(1).length === 0}
          className="text-xs font-bold text-[#5C6EFF] hover:text-[#4454d6] disabled:text-slate-300 disabled:cursor-not-allowed"
        >
          Apply Monday&apos;s hours to all weekdays
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {/* Responsive Header - Hidden on very small screens */}
        <div className="hidden sm:grid grid-cols-12 bg-slate-50 border-b border-slate-200 min-h-[36px] items-center px-3 md:px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span className="col-span-2 md:col-span-1">Enabled</span>
          <span className="col-span-3 md:col-span-2">Day</span>
          <span className="col-span-7 md:col-span-9 pl-4">Availability Intervals</span>
        </div>

        {DAYS_OF_WEEK.map((day, dayIdx) => {
          const daySlots = getSlotsForDay(dayIdx);
          const isEnabled = daySlots.length > 0;
          const rowSlots = isEnabled ? daySlots : [null];

          return (
            <div key={day} className="border-b border-slate-100 last:border-b-0">
              {rowSlots.map((slot, slotRowIndex) => {
                const absoluteIndex = slot
                  ? slots.findIndex((s) => (slot.id ? s.id === slot.id : s === slot))
                  : -1;
                const hasInvalidRange = slot ? isInvalidSlotRange(slot) : false;
                const hasOverlap = absoluteIndex >= 0 ? overlappingSlotIndices.has(absoluteIndex) : false;
                const hasSlotError = hasInvalidRange || hasOverlap;

                return (
                  <div
                    key={`${day}-${slotRowIndex}`}
                    className="flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center py-3 sm:py-0 sm:min-h-[52px] px-3 md:px-4 gap-3 sm:gap-0"
                  >
                    {/* Toggle & Day Label - Grouped on mobile */}
                    <div className="flex items-center justify-between w-full sm:w-auto sm:col-span-5 md:col-span-3 gap-4">
                      <div className="flex items-center gap-3">
                        {slotRowIndex === 0 ? (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              disabled={disabled}
                              checked={isEnabled}
                              onChange={(e) => toggleDay(dayIdx, e.target.checked)}
                            />
                            <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#5C6EFF]"></div>
                          </label>
                        ) : (
                          <div className="w-10 flex justify-center">
                            <span className="text-xs text-slate-300">↳</span>
                          </div>
                        )}
                        <div className="font-bold text-slate-800 text-sm sm:min-w-[80px]">
                          {slotRowIndex === 0 ? day : ''}
                        </div>
                      </div>

                      {/* Mobile Actions - Only visible on small screens when slot exists */}
                      {slot && (
                        <div className="flex sm:hidden items-center gap-2">
                          <button
                            type="button"
                            onClick={() => addSlot(dayIdx)}
                            disabled={disabled || !isEnabled}
                            className="p-2 rounded-lg border border-slate-100 text-[#5C6EFF] active:bg-slate-50 disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSlot(slot.id, dayIdx, slotRowIndex)}
                            disabled={disabled}
                            className="p-2 rounded-lg border border-slate-100 text-red-400 active:bg-slate-50 disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inputs Area */}
                    <div className="w-full sm:col-span-7 md:col-span-9 sm:pl-4">
                      {slot ? (
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                              <input
                                type="time"
                                value={slot.start_time}
                                disabled={disabled}
                                onChange={(e) => updateSlotTime(absoluteIndex, 'start_time', e.target.value)}
                                className={`w-full bg-slate-50 border px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium text-slate-700 outline-none transition-all ${hasSlotError ? 'border-red-400 bg-red-50/70 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-[#5C6EFF]/10 focus:border-[#5C6EFF]'}`}
                              />
                            </div>
                            <span className="text-slate-400 text-xs font-bold px-1">to</span>
                            <div className="flex-1 min-w-0">
                              <input
                                type="time"
                                value={slot.end_time}
                                disabled={disabled}
                                onChange={(e) => updateSlotTime(absoluteIndex, 'end_time', e.target.value)}
                                className={`w-full bg-slate-50 border px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium text-slate-700 outline-none transition-all ${hasSlotError ? 'border-red-400 bg-red-50/70 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-[#5C6EFF]/10 focus:border-[#5C6EFF]'}`}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between lg:justify-end gap-3 flex-shrink-0">
                            {hasInvalidRange ? (
                              <p className="text-[10px] font-bold text-red-500 whitespace-nowrap lg:mr-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">error</span>
                                Invalid range (min 30m)
                              </p>
                            ) : hasOverlap ? (
                              <p className="text-[10px] font-bold text-red-500 whitespace-nowrap lg:mr-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">error</span>
                                Overlapping slot
                              </p>
                            ) : <div className="hidden lg:block w-20" />}
                            
                            {/* Desktop Actions */}
                            <div className="hidden sm:flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => addSlot(dayIdx)}
                                disabled={disabled || !isEnabled}
                                title="Add hours"
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-[#5C6EFF] hover:border-[#cbd3ff] transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSlot(slot.id, dayIdx, slotRowIndex)}
                                disabled={disabled}
                                title="Delete slot"
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between sm:justify-start w-full gap-4">
                          <div className="text-xs font-medium text-slate-400 py-2 sm:py-0">Unavailable</div>
                          {!isEnabled && slotRowIndex === 0 && (
                            <button
                              type="button"
                              onClick={() => toggleDay(dayIdx, true)}
                              className="text-[10px] font-bold uppercase tracking-widest text-[#5C6EFF] hover:underline sm:hidden"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        })}
      </div>
    </section>
  );
}
