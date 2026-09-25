'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { bookingsApi, PublicBookingDetails } from '@/lib/api/bookings';
import { projectBookingSlots, projectSelectedTimeToHost } from '@/lib/bookings/timezone';
import { ProfessionalTimezoneSelector } from '@/components/timezone/ProfessionalTimezoneSelector';
import { apiClient } from '@/services/apiClient';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type BookingSlot = {
  date: string;
  start_time: string;
  end_time: string;
  label: string;
  available: boolean;
};

type ProjectedBookingSlot = BookingSlot & {
  host_start_time: string;
  host_end_time: string;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function RescheduleBookingPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  
  const [booking, setBooking] = useState<PublicBookingDetails | null>(null);
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([]);
  const [hostTimezone, setHostTimezone] = useState<string>('UTC');
  const [timezone, setTimezone] = useState(() => typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ProjectedBookingSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newBookingInfo, setNewBookingInfo] = useState<{ uid: string; token: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid management link.');
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        const bookingRes = await bookingsApi.getManagement(token);
        if (!bookingRes.success || !bookingRes.data) {
          setError(bookingRes.error?.message || 'Booking not found');
          setIsLoading(false);
          return;
        }
        
        const b = bookingRes.data;
        setBooking(b);
        
        const availabilityRes = await apiClient.get<any>(`/public/event_types/${b.event_type.id}`);
        if (availabilityRes.success && availabilityRes.data) {
          setAvailableSlots(availabilityRes.data.available_slots || []);
          setHostTimezone(availabilityRes.data.host.timezone || 'UTC');
        } else {
          setError('Could not load host availability');
        }
      } catch (err) {
        setError('Failed to load rescheduling data');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [token]);

  const projectedSlots = useMemo(
    () => projectBookingSlots(availableSlots, hostTimezone, timezone),
    [availableSlots, hostTimezone, timezone],
  );

  const selectedDaySlots = useMemo(() => 
    selectedDate ? projectedSlots.filter(s => s.date === selectedDate) : [],
    [selectedDate, projectedSlots]
  );

  const handleReschedule = async () => {
    if (!token || !selectedSlot) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const hostStartTime = projectSelectedTimeToHost(selectedSlot.start_time, hostTimezone);
      const response = await bookingsApi.rescheduleManagement(token, {
        start_time: hostStartTime,
        timezone: hostTimezone
      });

      if (response.success && response.data) {
        setNewBookingInfo(response.data as any);
        setSuccess(true);
      } else {
        setError(response.error?.message || 'Failed to reschedule');
      }
    } catch (err) {
      setError('An error occurred while rescheduling');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCalendarDateString = (year: number, month: number, day: number) => {
    const date = new Date(Date.UTC(year, month, day));
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
    });
    return formatter.format(date).replace(/,/g, '');
  };

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstWeekday = new Date(currentYear, currentMonth, 1).getDay();

  const calendarCells = [];
  for (let i = 0; i < firstWeekday; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-[#5C6EFF]/15 border-t-[#5C6EFF] animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 animate-pulse">Syncing Availability...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-[0_20px_70px_rgba(17,24,39,0.08)] text-center border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[28px] bg-green-50 text-green-500 mx-auto shadow-inner">
            <span className="material-symbols-outlined text-[40px]">event_available</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Rescheduled!</h1>
          <p className="text-slate-500 mb-10 leading-relaxed font-medium">
            Your appointment has been moved to the new time. A new confirmation email has been sent to your inbox.
          </p>
          <button
            onClick={() => router.push(`/booking/manage/${newBookingInfo?.token}`)}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
          >
            View New Booking
          </button>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[32px] p-10 text-center shadow-lg border border-slate-100">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
            <span className="material-symbols-outlined text-[32px]">warning</span>
          </div>
          <h1 className="text-2xl font-bold text-[#191c1e]">Reschedule unavailable</h1>
          <p className="mt-3 text-sm text-[#757686] mb-8">{error || 'This booking cannot be rescheduled.'}</p>
          <button onClick={() => router.push('/')} className="w-full py-4 bg-[#5C6EFF] text-white font-bold rounded-2xl">Return Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col lg:flex-row">
      {/* Sidebar: Current Booking Info */}
      <aside className="w-full lg:w-[450px] bg-white border-b lg:border-b-0 lg:border-r border-slate-100 p-8 lg:p-12 overflow-y-auto">
        <div className="mb-12 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5C6EFF] rounded-xl flex items-center justify-center text-white font-black text-xl">S</div>
          <span className="font-black text-xl text-slate-900 tracking-tight">Schedulr</span>
        </div>
        
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Reschedule Meeting</h1>
          <p className="text-slate-500 font-medium">Select a new time for your appointment with <strong>{booking.host_name}</strong>.</p>
        </div>

        <div className="space-y-8">
          <div className="p-8 rounded-[32px] bg-slate-50 border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined text-6xl">history</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Old Schedule</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm font-bold text-slate-400 line-through">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                {format(new Date(booking.start_time), 'EEEE, MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-slate-400 line-through">
                <span className="material-symbols-outlined text-lg">schedule</span>
                {format(new Date(booking.start_time), 'h:mm a')}
              </div>
            </div>
          </div>

          <div className="space-y-5 px-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{booking.title}</h3>
            <div className="flex items-center gap-4 text-slate-600 font-bold text-sm">
              <div className="h-8 w-8 rounded-lg bg-[#5C6EFF]/5 flex items-center justify-center text-[#5C6EFF]">
                <span className="material-symbols-outlined text-lg">timer</span>
              </div>
              {booking.event_type.duration} Minutes
            </div>
            {booking.location && (
              <div className="flex items-center gap-4 text-slate-600 font-bold text-sm">
                <div className="h-8 w-8 rounded-lg bg-[#5C6EFF]/5 flex items-center justify-center text-[#5C6EFF]">
                  <span className="material-symbols-outlined text-lg">videocam</span>
                </div>
                {booking.location}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main: Calendar & Slots */}
      <main className="flex-1 p-6 lg:p-12 xl:p-20 flex items-center justify-center bg-[#f3f4f6]">
        <div className="w-full max-w-[900px] bg-white rounded-[48px] shadow-[0_24px_80px_rgba(17,24,39,0.08)] border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Displaying slots in</p>
              <ProfessionalTimezoneSelector value={timezone} onChange={setTimezone} variant="compact" className="min-w-[280px]" />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-[#5C6EFF] uppercase tracking-widest mb-1">New Selection</p>
              <p className="text-sm font-black text-slate-900">
                {selectedSlot ? `${format(new Date(selectedSlot.date), 'MMM d')} at ${selectedSlot.label}` : 'None selected'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Calendar */}
            <div className="p-10 border-r border-slate-50">
              <div className="flex items-center justify-between mb-10">
                <span className="text-lg font-black text-slate-900 tracking-tight">{MONTHS[currentMonth]} {currentYear}</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))} className="h-10 w-10 flex items-center justify-center hover:bg-slate-50 rounded-xl text-slate-400 transition-colors border border-transparent hover:border-slate-100">
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))} className="h-10 w-10 flex items-center justify-center hover:bg-slate-50 rounded-xl text-slate-400 transition-colors border border-transparent hover:border-slate-100">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center mb-6">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={`${d}-${i}`} className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-3">
                {calendarCells.map((day, i) => {
                  if (day === null) return <div key={`e-${i}`} className="aspect-square" />;
                  const dStr = getCalendarDateString(currentYear, currentMonth, day);
                  const isAvail = projectedSlots.some(s => s.date === dStr);
                  const isSel = selectedDate === dStr;
                  const isToday = dStr === getCalendarDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                  
                  return (
                    <button
                      key={dStr}
                      onClick={() => { setSelectedDate(dStr); const first = projectedSlots.find(s => s.date === dStr); if (first) setSelectedSlot(first); }}
                      className={cn(
                        "aspect-square rounded-2xl text-sm font-black transition-all flex flex-col items-center justify-center gap-1 relative",
                        isSel ? "bg-[#5C6EFF] text-white shadow-xl shadow-indigo-100 scale-110 z-10" :
                        isAvail ? "text-slate-900 hover:bg-slate-100 border-2 border-slate-50" :
                        "text-slate-200 cursor-default"
                      )}
                    >
                      {day}
                      {isToday && !isSel && <div className="absolute bottom-2 w-1 h-1 rounded-full bg-[#5C6EFF]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slots */}
            <div className="p-10 flex flex-col h-full bg-slate-50/20">
              <div className="mb-8 pb-4 border-b border-slate-100">
                <span className="text-xl font-black text-slate-900 block tracking-tight">
                  {selectedDate ? format(new Date(selectedDate), 'EEEE, MMM d') : 'Available Times'}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[350px] pr-4 custom-scrollbar">
                {selectedDaySlots.length > 0 ? (
                  selectedDaySlots.map(slot => (
                    <button
                      key={slot.start_time}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "w-full py-4 px-6 rounded-2xl text-sm font-black border-2 transition-all flex items-center justify-between group",
                        selectedSlot?.start_time === slot.start_time 
                          ? "border-[#5C6EFF] bg-indigo-50 text-[#5C6EFF] shadow-md shadow-indigo-50" 
                          : "border-white bg-white hover:border-[#5C6EFF]/30 text-slate-600 shadow-sm"
                      )}
                    >
                      {slot.label}
                      <span className={cn(
                        "material-symbols-outlined text-lg transition-transform group-hover:translate-x-1",
                        selectedSlot?.start_time === slot.start_time ? "text-[#5C6EFF]" : "text-slate-300"
                      )}>
                        {selectedSlot?.start_time === slot.start_time ? 'check_circle' : 'arrow_forward'}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                    <span className="material-symbols-outlined text-4xl mb-3 opacity-20">event_busy</span>
                    <p className="text-sm font-bold opacity-60">
                      {selectedDate ? 'No availability found' : 'Pick a date to see times'}
                    </p>
                  </div>
                )}
              </div>

              {selectedSlot && (
                <div className="mt-10 animate-in slide-in-from-bottom-4 duration-500">
                  <button
                    onClick={handleReschedule}
                    disabled={isSubmitting}
                    className="w-full py-5 bg-[#5C6EFF] text-white font-black rounded-[24px] hover:bg-[#4a59e6] transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <div className="h-5 w-5 border-3 border-white/30 border-t-white animate-spin rounded-full" />
                    ) : (
                      <span className="material-symbols-outlined">schedule_send</span>
                    )}
                    Confirm Reschedule
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
