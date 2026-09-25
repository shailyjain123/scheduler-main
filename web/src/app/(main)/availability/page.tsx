'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSchedules, useUpdateSchedule, useCreateSchedule } from '@/lib/hooks/use-schedules';
import ScheduleEditor from '@/components/availability/schedule-editor';
import DateOverrides from '@/components/availability/date-overrides';
import QuickBlock from '@/components/availability/quick-block';
import ConflictWarningModal from '@/components/availability/conflict-warning-modal';
import { Schedule, AvailabilitySlot, DateOverride } from '@/lib/types/schedules';
import AvailabilitySkeleton from '@/components/skeletons/AvailabilitySkeleton';
import { schedulesApi } from '@/lib/api/schedules';
import { hasOverlappingSlotRanges, isInvalidSlotRange } from '@/lib/utils/availability-validation';
import { useRouter } from 'next/navigation';
import ProfessionalTimezoneSelector from '@/components/timezone/ProfessionalTimezoneSelector';
import { useAuthStore } from '@/store/authStore';

const normalizeSlots = (slots: AvailabilitySlot[]) =>
  [...slots]
    .map((slot) => ({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      id: slot.id,
      is_active: slot.is_active,
      timezone: slot.timezone,
    }))
    .sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      if (a.start_time !== b.start_time) return a.start_time.localeCompare(b.start_time);
      return a.end_time.localeCompare(b.end_time);
    });

const slotsEqual = (left: AvailabilitySlot[], right: AvailabilitySlot[]) =>
  JSON.stringify(normalizeSlots(left)) === JSON.stringify(normalizeSlots(right));

const hasInvalidRanges = (slots: AvailabilitySlot[]) => slots.some((slot) => isInvalidSlotRange(slot));

const sortSlots = (slots: AvailabilitySlot[]) =>
  [...slots].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    if (a.start_time !== b.start_time) return a.start_time.localeCompare(b.start_time);
    return a.end_time.localeCompare(b.end_time);
  });

const toFriendlyError = (message: string) => {
  const lower = message.toLowerCase();
  if (
    lower.includes('pg::checkviolation') ||
    lower.includes('check violation') ||
    lower.includes('must be after') ||
    lower.includes('end time') ||
    lower.includes('end_time')
  ) {
    return 'Invalid Range: End time must be after Start time.';
  }

  if (lower.includes('overlapping schedule block') || lower.includes('overlap')) {
    return 'Overlapping intervals are not allowed within the same day.';
  }

  if (lower.includes('scheduled meeting') || lower.includes('scheduled event')) {
    return 'Cannot block this range because scheduled meetings already exist.';
  }

  return message;
};

function AvailabilityTimeline({ slots, overrides }: { slots: AvailabilitySlot[], overrides: DateOverride[] }) {
  const [dayIndex, setDayIndex] = useState(() => new Date().getDay());
  const [hoveredInterval, setHoveredInterval] = useState<{ start: number, end: number, x: number } | null>(null);
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayLabelToIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const resolvedTimezone = useMemo(
    () => slots.find((slot) => slot.timezone)?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [slots]
  );

  useEffect(() => {
    const timezoneWeekday = new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTimezone,
      weekday: 'short',
    }).format(new Date()).slice(0, 3);

    setDayIndex(dayLabelToIndex[timezoneWeekday] ?? 0);
  }, [resolvedTimezone]);

  const toMinutes = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    return (h * 60) + m;
  };

  const formatMinutesTo12h = (minutes: number) => {
    const hours24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  const getTimezoneDateStringForDay = (selectedDayIndex: number) => {
    const now = new Date();
    const nowParts = new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    }).formatToParts(now);

    const year = Number(nowParts.find((part) => part.type === 'year')?.value || '1970');
    const month = Number(nowParts.find((part) => part.type === 'month')?.value || '01');
    const day = Number(nowParts.find((part) => part.type === 'day')?.value || '01');
    const weekday = nowParts.find((part) => part.type === 'weekday')?.value?.slice(0, 3) || 'Mon';
    const currentDayIndex = dayLabelToIndex[weekday] ?? 0;

    const diff = selectedDayIndex - currentDayIndex;
    const tzDate = new Date(Date.UTC(year, month - 1, day));
    tzDate.setUTCDate(tzDate.getUTCDate() + diff);

    const outYear = tzDate.getUTCFullYear();
    const outMonth = String(tzDate.getUTCMonth() + 1).padStart(2, '0');
    const outDay = String(tzDate.getUTCDate()).padStart(2, '0');
    return `${outYear}-${outMonth}-${outDay}`;
  };

  const formatInterval = (start: number, end: number) => `${formatMinutesTo12h(start)} – ${formatMinutesTo12h(end)}`;

  const dayIntervals = useMemo(() => {
    let intervals = slots
      .filter((slot) => slot.day_of_week === dayIndex && slot.end_time > slot.start_time)
      .map(s => ({ start: toMinutes(s.start_time), end: toMinutes(s.end_time) }));

    const dateStr = getTimezoneDateStringForDay(dayIndex);

    const dayOverrides = overrides.filter(o => o.date === dateStr);

    if (dayOverrides.some(o => o.is_unavailable && !o.start_time)) {
      return [];
    }

    dayOverrides.forEach(o => {
      if (o.is_unavailable && o.start_time && o.end_time) {
        const start = toMinutes(o.start_time);
        const end = toMinutes(o.end_time);
        
        const next: {start: number, end: number}[] = [];
        intervals.forEach(i => {
          if (end <= i.start || start >= i.end) {
            next.push(i);
          } else {
            if (start > i.start) next.push({ start: i.start, end: start });
            if (end < i.end) next.push({ start: end, end: i.end });
          }
        });
        intervals = next;
      }
    });

    return intervals.sort((a, b) => a.start - b.start);
  }, [slots, overrides, dayIndex, resolvedTimezone]);

  return (
    <section className="bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <h4 className="text-sm font-bold text-slate-900">Visual Timeline (This Week)</h4>
        <div className="flex flex-wrap items-center gap-1">
          {dayLabels.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setDayIndex(idx)}
              className={`px-2.5 py-1.5 rounded text-[10px] font-bold transition-all ${dayIndex === idx ? 'bg-[#EEF0FF] text-[#4a59e6] shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="relative h-10 rounded-lg bg-slate-200/70 overflow-hidden">
          {dayIntervals.map((interval, idx) => {
            const left = (interval.start / 1440) * 100;
            const width = ((interval.end - interval.start) / 1440) * 100;

            return (
              <div
                key={`${interval.start}-${interval.end}-${idx}`}
                className="absolute top-0 bottom-0 bg-[#5C6EFF]"
                style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                onMouseEnter={() => setHoveredInterval({ start: interval.start, end: interval.end, x: left + (width / 2) })}
                onMouseLeave={() => setHoveredInterval(null)}
              />
            );
          })}
        </div>

        {hoveredInterval && (
          <div
            className="absolute top-0 -translate-y-[115%] -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-lg pointer-events-none whitespace-nowrap z-10"
            style={{ left: `${Math.max(4, Math.min(96, hoveredInterval.x))}%` }}
          >
            {formatInterval(hoveredInterval.start, hoveredInterval.end)}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-slate-500">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
      <p className="text-[11px] text-slate-500 mt-2">
        Showing availability for {dayLabels[dayIndex]}, including overrides for this week.
      </p>
    </section>
  );
}

export default function AvailabilityPage() {
  const userTimezone = useAuthStore((state) => state.user?.timezone);
  const { schedules, isLoading, isFetching, isFetched, refetch } = useSchedules();
  const { updateSchedule, isLoading: isUpdating } = useUpdateSchedule();
  const { createSchedule, isLoading: isCreating } = useCreateSchedule();

  const [activeTab, setActiveTab] = useState<'working_hours' | 'overrides'>('working_hours');
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [draftSlots, setDraftSlots] = useState<AvailabilitySlot[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const mutationLockRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);
  
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictsCount, setConflictsCount] = useState(0);
  const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false);
  const router = useRouter();

  // We only want to block the UI if it's a MANUAL update or creation.
  const isManualPending = isMutating || isCreating || isUpdating;
  const pending = isManualPending;
  const hasRangeConflict = useMemo(() => hasInvalidRanges(draftSlots), [draftSlots]);
  const hasOverlapConflict = useMemo(() => hasOverlappingSlotRanges(draftSlots), [draftSlots]);
  const hasSlotConflicts = hasRangeConflict || hasOverlapConflict;
  const hasUnsavedSlotChanges = useMemo(
    () => !slotsEqual(draftSlots, activeSchedule?.availability_slots || []),
    [draftSlots, activeSchedule]
  );
  const resolvedTimezone = useMemo(
    () => draftSlots.find((slot) => slot.timezone)?.timezone || activeSchedule?.availability_slots.find((slot) => slot.timezone)?.timezone || userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [draftSlots, activeSchedule, userTimezone]
  );

  const handleTimezoneChange = (newTz: string) => {
    // Rebase: keep wall-clock times but update the timezone metadata
    setDraftSlots(prev => prev.map(slot => ({ ...slot, timezone: newTz })));
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2600);
  };

  const runWithMutationLock = async <T,>(fn: () => Promise<T>, pendingMessage = 'Saving changes...'): Promise<T | null> => {
    if (mutationLockRef.current) {
      showToast(pendingMessage);
      return null;
    }

    mutationLockRef.current = true;
    setIsMutating(true);
    try {
      return await fn();
    } finally {
      mutationLockRef.current = false;
      setIsMutating(false);
    }
  };

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (isFetched && !isFetching) {
      setHasLoadedFromServer(true);
    }
  }, [isFetched, isFetching]);

  useEffect(() => {
    if (!hasLoadedFromServer) return;

    if (schedules.length === 0) {
      setActiveSchedule(null);
      setDraftSlots([]);
      return;
    }

    const selected = activeSchedule
      ? schedules.find((schedule) => schedule.id === activeSchedule.id) || schedules.find((schedule) => schedule.is_default) || schedules[0]
      : schedules.find((schedule) => schedule.is_default) || schedules[0];

    if (!selected) return;

    const scheduleChanged = !activeSchedule || activeSchedule.id !== selected.id;
    const serverSlotsChanged = !activeSchedule || !slotsEqual(activeSchedule.availability_slots || [], selected.availability_slots || []);

    setActiveSchedule(selected);
    if (scheduleChanged || (!hasUnsavedSlotChanges && serverSlotsChanged)) {
      setDraftSlots(sortSlots(selected.availability_slots || []));
    }
  }, [schedules, activeSchedule, hasUnsavedSlotChanges, hasLoadedFromServer]);

  const handleUpdateSlots = (newSlots: AvailabilitySlot[]) => {
    setDraftSlots(sortSlots(newSlots));
  };

  const handleSaveWorkingHours = async () => {
    if (!activeSchedule) return;

    try {
      const currentDraftSlots = draftSlots;

      const updated = await runWithMutationLock(
        () =>
          updateSchedule({
            id: activeSchedule.id,
            data: {
              availability_slots: currentDraftSlots,
            },
          }),
        'Saving changes...'
      );

      if (!updated) return;

      setActiveSchedule(updated);
      setDraftSlots(sortSlots(updated.availability_slots || []));
      showToast('Working hours saved');
    } catch (err) {
      showToast(toFriendlyError(err instanceof Error ? err.message : 'Failed to save working hours'));
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const created = await runWithMutationLock(
        () => createSchedule({ name: 'Default Schedule', is_default: true }),
        'Schedule creation in progress...'
      );
      if (!created) return;
      setActiveSchedule(created);
      setDraftSlots(sortSlots(created.availability_slots || []));
      showToast('Default schedule created');
    } catch (err) {
      showToast(toFriendlyError(err instanceof Error ? err.message : 'Failed to create schedule'));
    }
  };

  const handleAddOverride = async (override: DateOverride) => {
    if (!activeSchedule) return;

    try {
      const conflictRes = await schedulesApi.checkConflicts(override.date, override.start_time, override.end_time);
      if (conflictRes.conflicts_count > 0) {
        setConflictsCount(conflictRes.conflicts_count);
        setShowConflictModal(true);
        return;
      }

      const overrideWithTz = {
        ...override,
        timezone: userTimezone || 'UTC'
      };

      await performAddOverride(overrideWithTz);
    } catch (err) {
      showToast(toFriendlyError(err instanceof Error ? err.message : 'Failed to add override'));
      throw err;
    }
  };

  const performAddOverride = async (override: DateOverride) => {
    if (!activeSchedule) return;
    
    const updated = await runWithMutationLock(
      () =>
        updateSchedule({
          id: activeSchedule.id,
          data: {
            date_overrides: [...(activeSchedule.date_overrides || []), override],
          },
        }),
      'Override update in progress...'
    );
    if (!updated) return;
    setActiveSchedule(updated);
    setDraftSlots(sortSlots(updated.availability_slots || draftSlots));
    showToast('Override added');
  };

  const handleModalCancel = () => {
    setShowConflictModal(false);
  };

  const handleModalGoToMeetings = () => {
    router.push('/meetings');
  };

  const handleDeleteOverride = async (id?: number) => {
    if (!activeSchedule || !id) return;

    try {
      const updated = await runWithMutationLock(
        () =>
          updateSchedule({
            id: activeSchedule.id,
            data: {
              date_overrides: (activeSchedule.date_overrides || []).filter((item) => item.id !== id),
            },
          }),
        'Override update in progress...'
      );
      if (!updated) return;
      setActiveSchedule(updated);
      setDraftSlots(sortSlots(updated.availability_slots || draftSlots));
      showToast('Override removed');
    } catch (err) {
      showToast(toFriendlyError(err instanceof Error ? err.message : 'Failed to remove override'));
      throw err;
    }
  };

  const handleQuickBlock = async (from: string, to: string) => {
    if (!activeSchedule) return;

    const additions: DateOverride[] = [];
    const cursor = new Date(from);
    const end = new Date(to);
    while (cursor <= end) {
      additions.push({
        date: cursor.toISOString().slice(0, 10),
        is_unavailable: true,
        start_time: null,
        end_time: null,
        reason: 'Quick block',
        timezone: userTimezone || 'UTC'
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    try {
      const conflictChecks = await Promise.all(
        additions.map((addition) => schedulesApi.checkConflicts(addition.date))
      );

      const totalConflicts = conflictChecks.reduce((total, result) => total + result.conflicts_count, 0);
      if (totalConflicts > 0) {
        setConflictsCount(totalConflicts);
        setShowConflictModal(true);
        return;
      }

      const updated = await runWithMutationLock(
        () =>
          updateSchedule({
            id: activeSchedule.id,
            data: {
              date_overrides: [...(activeSchedule.date_overrides || []), ...additions],
            },
          }),
        'Quick block in progress...'
      );
      if (!updated) return;
      setActiveSchedule(updated);
      setDraftSlots(sortSlots(updated.availability_slots || draftSlots));
      showToast(`Blocked ${additions.length} day(s)`);
    } catch (err) {
      const message = toFriendlyError(err instanceof Error ? err.message : 'Failed to apply quick block');
      showToast(message);
      throw err;
    }
  };

  const handleApplyMondayToWeekdays = () => {
    const mondaySlots = draftSlots.filter((slot) => slot.day_of_week === 1);
    if (mondaySlots.length === 0) return;

    const weekendSlots = draftSlots.filter((slot) => slot.day_of_week === 0 || slot.day_of_week === 6);
    const weekdaySlots = [1, 2, 3, 4, 5].flatMap((day) =>
      mondaySlots.map((slot) => ({
        ...slot,
        id: day === 1 ? slot.id : undefined,
        day_of_week: day,
      }))
    );

    setDraftSlots([...weekdaySlots, ...weekendSlots]);
    showToast('Copied Monday hours to weekdays');
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  if (isLoading || !hasLoadedFromServer) {
    return <AvailabilitySkeleton />;
  }

  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <span className="material-symbols-outlined text-3xl">event_available</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">No schedules found</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">Create your first schedule to start managing your availability.</p>
        </div>
        <button
          onClick={handleCreateSchedule}
          disabled={pending}
          className="bg-[#5C6EFF] text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-[#5C6EFF]/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Creating...' : 'Create Default Schedule'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto pb-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Availability</h1>
          <p className="text-sm text-slate-500 font-medium">Configure your default working hours and date-specific overrides.</p>
        </div>
        <div className="w-full md:w-[320px]">
          <ProfessionalTimezoneSelector
            value={resolvedTimezone}
            onChange={handleTimezoneChange}
            variant="compact"
            label="Schedule Base"
          />
        </div>
      </div>

      {toastMessage && (
        <div className="fixed top-20 right-6 z-[120] bg-white border border-slate-200 rounded-lg shadow-xl px-4 py-3 text-sm font-semibold text-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
          {toastMessage}
        </div>
      )}

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setActiveTab('overrides')}
          disabled={pending}
          className="bg-[#5C6EFF] text-white text-xs font-bold px-4 h-9 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#5C6EFF]/10 active:scale-95 transition-all w-full sm:w-auto"
        >
          Date Specific
        </button>
      </div>

      <div className="mb-4 border-b border-slate-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('working_hours')}
            className={`pb-2 text-sm font-bold transition-all relative ${activeTab === 'working_hours' ? 'text-[#5C6EFF]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Working Hours
            {activeTab === 'working_hours' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5C6EFF] rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('overrides')}
            className={`pb-2 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'overrides' ? 'text-[#5C6EFF]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Overrides
            {(activeSchedule?.date_overrides?.length || 0) > 0 && (
              <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-full">
                {activeSchedule?.date_overrides?.length}
              </span>
            )}
            {activeTab === 'overrides' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5C6EFF] rounded-full" />}
          </button>
        </div>
      </div>

      {activeTab === 'working_hours' ? (
        <div className="grid grid-cols-12 gap-4 lg:gap-6 animate-in slide-in-from-left-2 duration-300">
          <div className="col-span-12 xl:col-span-8 space-y-3">
            <div className="flex items-center justify-end gap-3">
              <div className="h-9 flex items-center">
                {hasUnsavedSlotChanges && !hasSlotConflicts && (
                  <span className="text-[11px] font-semibold text-amber-600">Unsaved changes</span>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => void handleSaveWorkingHours()}
                disabled={pending || !hasUnsavedSlotChanges || hasSlotConflicts}
                className="bg-[#5C6EFF] text-white text-xs font-bold px-4 h-9 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#5C6EFF]/10 active:scale-95 transition-all"
              >
                {pending ? 'Saving...' : 'Save Working Hours'}
              </button>
            </div>
            <ScheduleEditor
              slots={draftSlots}
              onUpdate={handleUpdateSlots}
              onApplyMondayToWeekdays={handleApplyMondayToWeekdays}
              disabled={pending}
            />
          </div>
          <div className="col-span-12 xl:col-span-4 space-y-4">
            <AvailabilityTimeline slots={draftSlots} overrides={activeSchedule?.date_overrides || []} />
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
              <h5 className="text-xs font-bold text-slate-800 mb-2">Pro-Tip</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Use the <strong>Overrides</strong> tab to block off specific holidays or add one-off availability without changing your weekly routine.
              </p>
              <button 
                onClick={() => setActiveTab('overrides')}
                className="mt-3 text-[10px] font-bold uppercase text-[#5C6EFF] hover:underline"
              >
                Manage Overrides →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 lg:gap-6 animate-in slide-in-from-right-2 duration-300">
          <div className="col-span-12 xl:col-span-7 space-y-4">
            <DateOverrides
              overrides={activeSchedule?.date_overrides || []}
              onAdd={handleAddOverride}
              onDelete={handleDeleteOverride}
              disabled={pending}
              conflictingOverrideIds={activeSchedule?.date_overrides?.filter(() => {
                return false; 
              }).map(o => o.id as number) || []}
            />
          </div>
          <div className="col-span-12 xl:col-span-5 space-y-4">
            <QuickBlock onApply={handleQuickBlock} disabled={pending} />
            <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">info</span>
                <h5 className="text-xs font-bold text-amber-900 uppercase tracking-tight">Understanding Overrides</h5>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed opacity-80">
                Overrides created here take precedence over your regular working hours. If you mark a day as &quot;Unavailable&quot; here, it will block bookings even if you have working hours set for that day.
              </p>
            </div>
            <AvailabilityTimeline slots={draftSlots} overrides={activeSchedule?.date_overrides || []} />
          </div>
        </div>
      )}

      <ConflictWarningModal
        isOpen={showConflictModal}
        conflictsCount={conflictsCount}
        onCancel={handleModalCancel}
        onGoToMeetings={handleModalGoToMeetings}
      />
    </div>
  );
}
