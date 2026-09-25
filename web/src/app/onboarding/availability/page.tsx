'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { apiClient } from '../../../services/apiClient';
import { useRouter } from 'next/navigation';
import { ApiResponse } from '@/lib/api/client';
import { useOnboardingProtection } from '../../../hooks/useOnboardingProtection';
import {
  DAYS_OF_WEEK,
  getDaySlots,
  getDefaultWeeklyAvailability,
  normalizeWeeklyAvailability,
  type WeeklyAvailability,
} from '@/lib/availability';
import { onboardingPagePath } from '@/lib/routes';

type TimeSlot = { start: string; end: string };

type ParsedSlot = {
  index: number;
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
};

type SlotIssue = {
  messages: string[];
  suggestion: TimeSlot | null;
};

type ValidationResult = {
  slotIssues: Record<string, SlotIssue>;
  hasErrors: boolean;
  firstError: string | null;
};

const toBackendAvailabilityError = (error: unknown): string => {
  const details = typeof error === 'object' && error !== null && 'details' in error
    ? String((error as { details?: unknown }).details)
    : '';
  const message = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message?: unknown }).message)
    : '';
  const source = `${message} ${details}`.toLowerCase();

  if (source.includes('at least 1 hour') || source.includes('minimum 1 hour gap')) {
    return 'A minimum 1-hour gap is required between consecutive slots.';
  }

  if (source.includes('overlap') || source.includes('overlapping schedule block')) {
    return 'Overlapping slots are not allowed.';
  }

  if (source.includes('end time must be after') || source.includes('end_time')) {
    return 'End time must be later than start time.';
  }

  return message || 'Failed to save progress';
};

const MINUTES_IN_DAY = 24 * 60;
const MINIMUM_SLOT_GAP_MINUTES = 60;
const MAX_SLOT_DURATION_MINUTES = MINUTES_IN_DAY - 1;

const issueKey = (day: string, slotIndex: number) => `${day}-${slotIndex}`;

const parseTimeToMinutes = (time: string): number | null => {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes: number): string => {
  const clamped = Math.max(0, Math.min(totalMinutes, MINUTES_IN_DAY - 1));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const formatTimeRange = (slot: TimeSlot): string => `${slot.start}-${slot.end}`;

const parseDaySlots = (slots: TimeSlot[]): ParsedSlot[] =>
  slots.map((slot, index) => {
    const startMinutes = parseTimeToMinutes(slot.start);
    const endMinutes = parseTimeToMinutes(slot.end);

    return {
      index,
      start: slot.start,
      end: slot.end,
      startMinutes: startMinutes ?? -1,
      endMinutes: endMinutes ?? -1,
      durationMinutes: startMinutes !== null && endMinutes !== null ? endMinutes - startMinutes : -1,
    };
  });

const intervalsOverlap = (left: ParsedSlot, right: ParsedSlot): boolean =>
  left.startMinutes < right.endMinutes && left.endMinutes > right.startMinutes;

const findNearestAvailableSlot = (target: ParsedSlot, peers: ParsedSlot[]): TimeSlot | null => {
  if (target.durationMinutes <= 0 || target.durationMinutes > MAX_SLOT_DURATION_MINUTES) {
    return null;
  }

  const occupied = peers
    .filter((slot) => slot.durationMinutes > 0 && slot.durationMinutes <= MINUTES_IN_DAY)
    .map((slot) => ({ start: slot.startMinutes, end: slot.endMinutes }))
    .sort((a, b) => a.start - b.start);

  const blockedByGap = occupied
    .map((interval) => ({
      start: Math.max(0, interval.start - MINIMUM_SLOT_GAP_MINUTES),
      end: Math.min(MINUTES_IN_DAY, interval.end + MINIMUM_SLOT_GAP_MINUTES),
    }))
    .sort((a, b) => a.start - b.start);

  const merged = blockedByGap.reduce<Array<{ start: number; end: number }>>((acc, interval) => {
    const last = acc[acc.length - 1];
    if (!last || interval.start > last.end) {
      acc.push({ ...interval });
      return acc;
    }

    last.end = Math.max(last.end, interval.end);
    return acc;
  }, []);

  const candidateStarts = new Set<number>([target.startMinutes, 9 * 60]);
  merged.forEach((interval) => {
    candidateStarts.add(interval.end);
    candidateStarts.add(interval.start - target.durationMinutes);
  });

  const isAvailable = (startMinute: number): boolean => {
    if (startMinute < 0) return false;
    if (startMinute + target.durationMinutes > MINUTES_IN_DAY) return false;

    return !merged.some(
      (interval) => startMinute < interval.end && startMinute + target.durationMinutes > interval.start,
    );
  };

  const candidates = Array.from(candidateStarts)
    .map((value) => Math.max(0, Math.min(value, MINUTES_IN_DAY - target.durationMinutes)))
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .filter(isAvailable)
    .sort((a, b) => {
      const leftDistance = Math.abs(a - target.startMinutes);
      const rightDistance = Math.abs(b - target.startMinutes);
      if (leftDistance === rightDistance) return a - b;
      return leftDistance - rightDistance;
    });

  const bestStart = candidates[0];
  if (bestStart === undefined) return null;

  return {
    start: minutesToTime(bestStart),
    end: minutesToTime(bestStart + target.durationMinutes),
  };
};

const suggestNewSlotForDay = (slots: TimeSlot[]): TimeSlot | null => {
  if (slots.length === 0) {
    return { start: '09:00', end: '10:00' };
  }

  const parsed = parseDaySlots(slots).filter((slot) => slot.durationMinutes > 0);
  const suggestedStart = parsed.length > 0
    ? Math.max(...parsed.map((slot) => slot.endMinutes + MINIMUM_SLOT_GAP_MINUTES), 9 * 60)
    : 9 * 60;
  const target: ParsedSlot = {
    index: -1,
    start: minutesToTime(suggestedStart),
    end: minutesToTime(Math.min(suggestedStart + 60, MINUTES_IN_DAY - 1)),
    startMinutes: suggestedStart,
    endMinutes: Math.min(suggestedStart + 60, MINUTES_IN_DAY),
    durationMinutes: 60,
  };

  return findNearestAvailableSlot(target, parsed);
};

const validateAvailabilityRealtime = (availability: WeeklyAvailability): ValidationResult => {
  const slotIssues: Record<string, SlotIssue> = {};

  const pushIssue = (day: string, slotIndex: number, message: string, suggestion?: TimeSlot | null) => {
    const key = issueKey(day, slotIndex);
    const current = slotIssues[key] ?? { messages: [], suggestion: null };

    if (!current.messages.includes(message)) {
      current.messages.push(message);
    }

    if (!current.suggestion && suggestion) {
      current.suggestion = suggestion;
    }

    slotIssues[key] = current;
  };

  DAYS_OF_WEEK.forEach((day) => {
    const daySlots = getDaySlots(availability, day);
    const parsed = parseDaySlots(daySlots);

    parsed.forEach((slot) => {
      if (slot.startMinutes < 0 || slot.endMinutes < 0) {
        pushIssue(day, slot.index, 'Please enter a valid time.');
        return;
      }

      if (slot.endMinutes <= slot.startMinutes) {
        const suggestionEnd = Math.min(slot.startMinutes + 60, MINUTES_IN_DAY - 1);
        const suggestion = suggestionEnd > slot.startMinutes
          ? { start: slot.start, end: minutesToTime(suggestionEnd) }
          : null;
        pushIssue(day, slot.index, 'End time must be later than start time.', suggestion);
        return;
      }

      if (slot.durationMinutes > MAX_SLOT_DURATION_MINUTES) {
        pushIssue(day, slot.index, 'A single slot cannot exceed 24 hours.');
      }
    });

    const validSlots = parsed.filter(
      (slot) => slot.startMinutes >= 0 && slot.endMinutes > slot.startMinutes && slot.durationMinutes <= MAX_SLOT_DURATION_MINUTES,
    );

    const sortedSlots = [...validSlots].sort((a, b) => a.startMinutes - b.startMinutes);

    for (let i = 1; i < sortedSlots.length; i += 1) {
      const previous = sortedSlots[i - 1];
      const current = sortedSlots[i];

      if (current.startMinutes < previous.endMinutes) {
        continue;
      }

      const gapMinutes = current.startMinutes - previous.endMinutes;
      if (gapMinutes >= MINIMUM_SLOT_GAP_MINUTES) {
        continue;
      }

      const requiredStart = minutesToTime(previous.endMinutes + MINIMUM_SLOT_GAP_MINUTES);
      const currentSuggestion = findNearestAvailableSlot(
        current,
        validSlots.filter((slot) => slot.index !== current.index),
      );

      pushIssue(day, previous.index, `Needs at least a 1-hour gap before ${current.start}-${current.end}.`);
      pushIssue(day, current.index, `Must start at least 1 hour after ${previous.end} (earliest ${requiredStart}).`, currentSuggestion);
    }

    for (let i = 0; i < validSlots.length; i += 1) {
      for (let j = i + 1; j < validSlots.length; j += 1) {
        const left = validSlots[i];
        const right = validSlots[j];

        if (!intervalsOverlap(left, right)) continue;

        const isDuplicate = left.start === right.start && left.end === right.end;
        const leftSuggestion = findNearestAvailableSlot(
          left,
          validSlots.filter((slot) => slot.index !== left.index),
        );
        const rightSuggestion = findNearestAvailableSlot(
          right,
          validSlots.filter((slot) => slot.index !== right.index),
        );

        if (isDuplicate) {
          pushIssue(day, left.index, `Duplicate slot detected (${formatTimeRange({ start: left.start, end: left.end })}).`, leftSuggestion);
          pushIssue(day, right.index, `Duplicate slot detected (${formatTimeRange({ start: right.start, end: right.end })}).`, rightSuggestion);
        } else {
          pushIssue(day, left.index, `Overlaps with ${right.start}-${right.end}.`, leftSuggestion);
          pushIssue(day, right.index, `Overlaps with ${left.start}-${left.end}.`, rightSuggestion);
        }
      }
    }
  });

  const keys = Object.keys(slotIssues);
  const hasErrors = keys.length > 0;
  const firstError = hasErrors ? slotIssues[keys[0]].messages[0] : null;

  return {
    slotIssues,
    hasErrors,
    firstError,
  };
};

export default function AvailabilityPage() {
  const protectionStatus = useOnboardingProtection(3);
  const { user, setAuth } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [availability, setAvailability] = useState<WeeklyAvailability>(getDefaultWeeklyAvailability());

  useEffect(() => {
    if (user?.availability) {
      setAvailability(normalizeWeeklyAvailability(user.availability));
    }
  }, [user]);

  const daysOfWeek = [...DAYS_OF_WEEK];
  const validation = useMemo(() => validateAvailabilityRealtime(availability), [availability]);

  const addSlot = (day: string) => {
    setAvailability(prev => {
      const currentSlots = getDaySlots(prev, day);
      const suggestion = suggestNewSlotForDay(currentSlots);
      if (!suggestion) return prev;

      return {
        ...prev,
        [day]: [...currentSlots, suggestion]
      };
    });
  };

  const removeSlot = (day: string, index: number) => {
    setAvailability(prev => ({
      ...prev,
      [day]: getDaySlots(prev, day).filter((_, i) => i !== index)
    }));
  };

  const updateSlot = (day: string, index: number, field: 'start' | 'end', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: getDaySlots(prev, day).map((slot, i) => i === index ? { ...slot, [field]: value } : slot)
    }));
  };

  const toggleDay = (day: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: getDaySlots(prev, day).length > 0 ? [] : [{ start: '09:00', end: '10:00' }]
    }));
  };

  const copyToAll = (sourceDay: string) => {
    const sourceSchedule = getDaySlots(availability, sourceDay);
    setAvailability(prev => {
      const next = { ...prev };
      daysOfWeek.forEach(day => {
        if (day !== sourceDay && getDaySlots(prev, day).length > 0) {
          next[day] = [...sourceSchedule];
        }
      });
      return next;
    });
  };

  const applySuggestion = (day: string, slotIndex: number, suggestion: TimeSlot) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: getDaySlots(prev, day).map((slot, index) => (index === slotIndex ? suggestion : slot)),
    }));
  };

  const formatTo12h = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleSubmit = async () => {
    if (validation.hasErrors) {
      setSubmitError(validation.firstError || 'Please fix the highlighted slots before continuing.');
      return;
    }

    setIsLoading(true);
    setSubmitError(null);

    try {
      const response = await apiClient.post<ApiResponse>('/onboarding/availability', { availability });
      if (response.success) {
        if (user) {
          setAuth({ ...user, onboarding_stage: 4, availability: availability as WeeklyAvailability }, localStorage.getItem('token') || '');
        }
        router.push(onboardingPagePath(4));
      } else {
        setSubmitError(toBackendAvailabilityError(response.error));
      }
    } catch {
      setSubmitError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (user) {
      setAuth({ ...user, onboarding_stage: 2 }, localStorage.getItem('token') || '');
    }
    router.push(onboardingPagePath(2));
  };

  if (protectionStatus.isLoading || !protectionStatus.isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[780px] flex flex-col items-center">
      <div className="w-full bg-white rounded-2xl p-8 border border-[#f0f1f3] shadow-[0_32px_64px_rgba(0,0,0,0.04)]">
        <div className="mb-10 text-left flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-[#191c1e] mb-2 tracking-tight">Set your availability</h2>
            <p className="text-[#757686] text-[13px] font-medium">Define your working hours and multiple shifts</p>
          </div>
        </div>

        <div className="space-y-3">
          {submitError && (
            <div className="bg-[#ffdad6] text-[#93000a] p-3.5 rounded-xl text-[13px] font-semibold flex items-center gap-3 border border-[#ba1a1a]/10 mb-6 animate-in slide-in-from-top-2 duration-300">
              <span className="material-symbols-outlined text-lg">error</span>
              {submitError}
            </div>
          )}

          {validation.hasErrors && (
            <div className="bg-[#fff4e5] text-[#663c00] p-3.5 rounded-xl text-[13px] font-semibold flex items-center gap-3 border border-[#f9d9a3] mb-6">
              <span className="material-symbols-outlined text-lg">warning</span>
              Fix the highlighted slots to continue.
            </div>
          )}

          {daysOfWeek.map((day) => {
            const slots = getDaySlots(availability, day);
            const isActive = slots.length > 0;

            return (
              <div 
                key={day} 
                className={`transition-all duration-500 ease-out p-4 rounded-xl mb-3 last:mb-0 ${
                  isActive 
                  ? 'bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-[#f0f1f3]' 
                  : 'bg-transparent border border-transparent'
                }`}
              >
                <div className="flex items-start gap-6">
                  {/* 1. Day Toggle & Name */}
                  <div className="flex items-center gap-3.5 w-[140px] shrink-0 pt-1.5">
                     <button 
                        onClick={() => toggleDay(day)}
                        className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${isActive ? 'bg-[#1D82F5]' : 'bg-[#e1e2e4]'}`}
                        aria-label={`Toggle ${day}`}
                     >
                        <div className={`absolute top-0.5 w-[14px] h-[14px] rounded-full bg-white transition-all shadow-md ${isActive ? 'left-5' : 'left-0.5'}`} />
                     </button>
                     <span className={`text-[14px] font-bold tracking-tight ${isActive ? 'text-[#191c1e]' : 'text-[#c5c5d7]'}`}>{day}</span>
                  </div>

                  {/* 2. Content Area */}
                  <div className="flex-1">
                     {isActive ? (
                       <div className="space-y-4">
                         {slots.map((slot, index) => {
                           const slotIssue = validation.slotIssues[issueKey(day, index)];
                           const hasSlotError = Boolean(slotIssue);

                           return (
                           <div key={index} className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-400">
                           <div className="flex items-center gap-3">
                             {/* Custom Dual Pill Input */}
                             <div className="flex items-center gap-0">
                               <div className={`relative flex items-center h-10 w-[150px] bg-[#f8f9fb] rounded-l-xl border border-r-0 focus-within:z-10 focus-within:ring-1 group/input ${hasSlotError ? 'border-[#ba1a1a] focus-within:border-[#ba1a1a] focus-within:ring-[#ba1a1a]/20' : 'border-[#eceef0] focus-within:border-[#1D82F5] focus-within:ring-[#1D82F5]/20'}`}>
                                  <span className="material-symbols-outlined text-[16px] text-[#A3ADB8] ml-3 pointer-events-none">schedule</span>
                                  <input 
                                    type="time"
                                    className="bg-transparent h-full w-full text-[13px] font-bold border-0 focus:ring-0 pl-2 pr-3 text-[#191c1e]"
                                    value={slot.start}
                                    onChange={(e) => updateSlot(day, index, 'start', e.target.value)}
                                  />
                               </div>
                               
                               <div className="flex items-center justify-center w-8 h-10 bg-[#f8f9fb] border-y border-[#eceef0] pointer-events-none">
                                  <span className="material-symbols-outlined text-[16px] text-[#A3ADB8]">arrow_forward</span>
                                </div>

                               <div className={`relative flex items-center h-10 w-[150px] bg-[#f8f9fb] rounded-r-xl border border-l-0 focus-within:z-10 focus-within:ring-1 group/input ${hasSlotError ? 'border-[#ba1a1a] focus-within:border-[#ba1a1a] focus-within:ring-[#ba1a1a]/20' : 'border-[#eceef0] focus-within:border-[#1D82F5] focus-within:ring-[#1D82F5]/20'}`}>
                                  <input 
                                    type="time"
                                    className="bg-transparent h-full w-full text-[13px] font-bold border-0 focus:ring-0 pl-9 pr-3 text-[#191c1e]"
                                    value={slot.end}
                                    onChange={(e) => updateSlot(day, index, 'end', e.target.value)}
                                  />
                               </div>
                             </div>
                             
                             {/* Individual Action (Remove) */}
                             <button 
                                onClick={() => removeSlot(day, index)}
                                className="w-9 h-9 flex items-center justify-center text-[#c5c5d7] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/20 rounded-xl transition-all"
                                title="Remove this shift"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                             </button>
                           </div>
                           {slotIssue && (
                             <div className="flex flex-wrap items-center gap-2 pl-1">
                               <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">error</span>
                               <div className="text-[12px] font-semibold text-[#ba1a1a]">
                                 {slotIssue.messages.join(' ')}
                               </div>
                               {slotIssue.suggestion && (
                                 <button
                                   type="button"
                                   onClick={() => applySuggestion(day, index, slotIssue.suggestion as TimeSlot)}
                                   className="text-[11px] font-bold text-[#1D82F5] hover:text-[#0b66c2]"
                                 >
                                   Apply {formatTo12h(slotIssue.suggestion.start)}-{formatTo12h(slotIssue.suggestion.end)}
                                 </button>
                               )}
                             </div>
                           )}
                           </div>
                           );
                         })}

                         {/* Under-Inputs Actions */}
                         <div className="flex items-center gap-5 pt-0.5">
                            <button 
                               onClick={() => addSlot(day)}
                               className="text-[#1D82F5] hover:text-[#0b66c2] text-[12px] font-bold flex items-center gap-1.5 transition-colors group/add"
                            >
                              <span className="material-symbols-outlined text-[16px] font-bold group-hover/add:scale-110 transition-transform">add</span>
                              ADD SHIFT
                            </button>
                            
                            <button 
                               onClick={() => copyToAll(day)}
                               className="text-[#757686] hover:text-[#191c1e] text-[11px] font-bold flex items-center gap-1.25 transition-colors"
                               title="Apply this schedule to all days"
                            >
                              <span className="material-symbols-outlined text-[14px]">content_copy</span>
                              COPY SCHEDULE
                            </button>
                         </div>
                       </div>
                     ) : (
                       <div className="h-10 flex items-center">
                         <span className="text-[12px] font-medium text-[#c5c5d7] select-none">Unavailable for bookings</span>
                       </div>
                     )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-[#f0f1f3] flex items-center justify-between">
          <button 
            type="button"
            className="text-[13px] font-bold text-[#757686] hover:text-[#191c1e] transition-colors flex items-center gap-1.5 group"
            onClick={handleBack}
          >
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
            Back
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isLoading || validation.hasErrors}
            className="bg-[#191c1e] hover:bg-[#2d2e3e] text-white px-10 h-12 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-black/10 disabled:opacity-70 disabled:cursor-not-allowed min-w-[160px] group"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="text-sm">Continue</span>
                <span className="material-symbols-outlined text-lg group-hover:translate-x-2 transition-transform">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
