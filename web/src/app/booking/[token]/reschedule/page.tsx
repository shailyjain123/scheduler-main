'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { bookingsApi, PublicBookingDetails } from '@/lib/api/bookings';
import { projectBookingSlots, projectSelectedTimeToHost, formatBookingDateLabel } from '@/lib/bookings/timezone';
import { ProfessionalTimezoneSelector } from '@/components/timezone/ProfessionalTimezoneSelector';
import { apiClient } from '@/services/apiClient';
import { format } from 'date-fns';

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

  // 1. Fetch Booking and then Availability
  useEffect(() => {
    if (!token) return;

    const init = async () => {
      try {
        // Fetch current booking
        const bookingRes = await bookingsApi.getPublicBooking(token);
        if (!bookingRes.success || !bookingRes.data) {
          setError(bookingRes.error?.message || 'Booking not found');
          setIsLoading(false);
          return;
        }
        
        const b = bookingRes.data;
        setBooking(b);
        
        // Fetch host availability for this event type
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
      const response = await bookingsApi.reschedulePublicBooking(token, {
        start_time: hostStartTime,
        timezone: hostTimezone
      });

      if (response.success) {
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
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-[#5C6EFF]/15 border-t-[#5C6EFF] animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Preparing reschedule flow</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[32px] p-8 sm:p-10 shadow-[0_20px_70px_rgba(17,24,39,0.08)] text-center border border-slate-100">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-500 mx-auto">
            <span className="material-symbols-outlined text-[32px]">event_available</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Rescheduled!</h1>
          <p className="text-slate-500 mb-8">
            Your appointment has been moved to the new time. A new confirmation email is on its way.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[32px] p-8 sm:p-10 shadow-[0_20px_70px_rgba(17,24,39,0.08)] text-center border border-slate-100">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
            <span className="material-symbols-outlined text-[28px]">warning</span>
          </div>
          <h1 className="text-2xl font-bold text-[#191c1e]">Reschedule unavailable</h1>
          <p className="mt-3 text-sm text-[#757686] mb-8">{error || 'This booking cannot be rescheduled at this time.'}</p>
          <button onClick={() => router.push('/')} className="w-full py-3.5 bg-[#5C6EFF] text-white font-bold rounded-xl hover:bg-[#4a59e6] transition-colors">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col lg:flex-row">
      {/* Sidebar: Current Booking Info */}
      <aside className="w-full lg:w-[400px] bg-white border-b lg:border-b-0 lg:border-r border-slate-100 p-8 lg:p-12">
        <div className="mb-10">
          <span className="text-xl font-black tracking-tight text-[#5C6EFF]">Schedulr</span>
        </div>
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Reschedule Meeting</h1>
          <p className="text-slate-500 text-sm">Select a new time for your appointment with <strong>{booking.host_name}</strong>.</p>
        </div>

        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Current Time</p>
            <div className="flex items-center gap-3 text-sm font-bold text-slate-600 line-through opacity-60 mb-1">
              <span className="material-symbols-outlined text-base">calendar_today</span>
              {format(new Date(booking.start_time), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-3 text-sm font-bold text-slate-600 line-through opacity-60">
              <span className="material-symbols-outlined text-base">schedule</span>
              {format(new Date(booking.start_time), 'h:mm a')}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">{booking.title}</h3>
            <div className="flex items-center gap-3 text-slate-600 text-sm">
              <span className="material-symbols-outlined text-[#5C6EFF] text-xl">schedule</span>
              {booking.event_type.duration} min
            </div>
            {booking.location && (
              <div className="flex items-center gap-3 text-slate-600 text-sm">
                <span className="material-symbols-outlined text-[#5C6EFF] text-xl">videocam</span>
                {booking.location}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main: Calendar & Slots */}
      <main className="flex-1 p-6 lg:p-16 flex items-center justify-center">
        <div className="w-full max-w-[800px] bg-white rounded-3xl shadow-[0_20px_70px_rgba(17,24,39,0.06)] border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Your Timezone</label>
            <ProfessionalTimezoneSelector value={timezone} onChange={setTimezone} variant="compact" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Calendar */}
            <div className="p-8 border-r border-slate-50">
              <div className="flex items-center justify-between mb-8">
                <span className="font-bold text-slate-900">{MONTHS[currentMonth]} {currentYear}</span>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={`${d}-${i}`} className="text-[10px] font-bold text-slate-300 uppercase">
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((day, i) => {
                  if (day === null) return <div key={`e-${i}`} className="aspect-square" />;
                  const dStr = getCalendarDateString(currentYear, currentMonth, day);
                  const isAvail = projectedSlots.some(s => s.date === dStr);
                  const isSel = selectedDate === dStr;
                  return (
                    <button
                      key={dStr}
                      onClick={() => { setSelectedDate(dStr); const first = projectedSlots.find(s => s.date === dStr); if (first) setSelectedSlot(first); }}
                      className={`aspect-square rounded-xl text-sm font-bold transition-all ${
                        isSel ? 'bg-[#5C6EFF] text-white shadow-lg shadow-blue-100' :
                        isAvail ? 'text-slate-900 hover:bg-slate-100 border border-slate-100' :
                        'text-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slots */}
            <div className="p-8 flex flex-col h-full">
              <div className="mb-6">
                <span className="text-lg font-bold text-slate-900 block">{selectedDate ? format(new Date(selectedDate), 'EEEE, MMM d') : 'Select a date'}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {selectedDaySlots.length > 0 ? (
                  selectedDaySlots.map(slot => (
                    <button
                      key={slot.start_time}
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full py-3 px-4 rounded-xl text-sm font-bold border transition-all ${
                        selectedSlot?.start_time === slot.start_time 
                          ? 'border-[#5C6EFF] bg-blue-50 text-[#5C6EFF]' 
                          : 'border-slate-100 hover:border-[#5C6EFF] text-slate-600'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium py-12">
                    {selectedDate ? 'No times available' : 'Pick a date to see times'}
                  </div>
                )}
              </div>

              {selectedSlot && (
                <div className="mt-8 pt-6 border-t border-slate-50">
                  <button
                    onClick={handleReschedule}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-[#5C6EFF] text-white font-bold rounded-2xl hover:bg-[#4a59e6] transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />}
                    Confirm New Time
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
