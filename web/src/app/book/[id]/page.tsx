'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { formatBookingDateLabel, projectBookingSlots, projectSelectedTimeToHost } from '@/lib/bookings/timezone';
import { ProfessionalTimezoneSelector } from '@/components/timezone/ProfessionalTimezoneSelector';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/apiClient';
import { EventType } from '@/lib/types/event';
import { validateEmail as validateEmailFormat } from '@/lib/utils/email-validation';
import BookingSkeleton from '@/components/skeletons/BookingSkeleton';

type PublicHost = {
  id: number;
  full_name: string;
  username?: string | null;
  avatar_url?: string | null;
  timezone: string;
  default_buffer_time?: number | null;
  plan_type?: string;
};

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

type PublicBookingResponse = {
  event_type: EventType;
  host: PublicHost;
  availability: Record<string, Array<{ start: string; end: string }>>;
  available_slots: BookingSlot[];
  booked_times: Array<{ start_time: string; end_time: string; event_id: number; title: string }>;
  event_duration: number;
  timezone: string;
};

type BookingConfirmation = {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
};

type BookingRequestResponse = {
  type: 'seamless' | 'verify';
  booking?: BookingConfirmation;
  booking_request_id?: number;
  verification_required?: boolean;
  guest: { name: string; email: string };
};

type BookingVerificationResponse = {
  booking: BookingConfirmation;
  guest: { name: string; email: string };
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

function getParamsValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}



export default function BookEventPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventTypeId = getParamsValue(params.id);
  const { user } = useAuthStore();
  const getDateStringInTz = formatBookingDateLabel;

  const getCalendarDateString = (year: number, month: number, day: number) => {
    const date = new Date(Date.UTC(year, month, day));
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    });
    return formatter.format(date).replace(/,/g, '');
  };

  const getPrettyDateLabel = (dateStr: string | null) => {
    if (!dateStr) return 'Select a date';
    const parts = dateStr.split(' ');
    if (parts.length < 4) return dateStr;
    const weekdayMap: Record<string, string> = {
      Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
      Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday'
    };
    const monthMap: Record<string, string> = {
      Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
      May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
      Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December'
    };
    const weekday = weekdayMap[parts[0]] || parts[0];
    const month = monthMap[parts[1]] || parts[1];
    return `${weekday}, ${month} ${parts[2]}, ${parts[3]}`;
  };
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [host, setHost] = useState<PublicHost | null>(null);
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([]);
  const [hostTimezone, setHostTimezone] = useState<string>('UTC');
  const [bookedTimes, setBookedTimes] = useState<Array<{ start_time: string; end_time: string; event_id: number; title: string }>>([]);
  const [eventDuration, setEventDuration] = useState(0);
  const [timezone, setTimezone] = useState(() => typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ProjectedBookingSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; slot?: string }>({});
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [bookingRequestId, setBookingRequestId] = useState<number | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [emailValidationError, setEmailValidationError] = useState<string | null>(null);
  const [lastValidatedEmail, setLastValidatedEmail] = useState<string | null>(null);

  useEffect(() => {
    const pendingRequestId = searchParams.get('booking_request_id');
    if (!pendingRequestId) return;

    const parsedRequestId = Number(pendingRequestId);
    if (!Number.isNaN(parsedRequestId)) {
      setBookingRequestId(parsedRequestId);
    }
  }, [searchParams]);
  
  useEffect(() => {
    if (user) {
      setGuestName((current) => current || user.full_name || '');
      setGuestEmail((current) => current || user.email || '');
    }
  }, [user]);

  const fetchEventType = useCallback(async () => {
    if (!eventTypeId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<PublicBookingResponse>(`/public/event_types/${eventTypeId}`);

      if (response.success && response.data) {
        setEventType(response.data.event_type);
        setHost(response.data.host);
        setAvailableSlots(response.data.available_slots || []);
        setHostTimezone(response.data.host.timezone || response.data.timezone || 'UTC');
        setBookedTimes(response.data.booked_times || []);
        setEventDuration(response.data.event_duration || 0);
      } else {
        setEventType(null);
        setHost(null);
        setAvailableSlots([]);
      }
    } catch (fetchError) {
      console.error('Failed to fetch booking page', fetchError);
      setEventType(null);
      setHost(null);
      setAvailableSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [eventTypeId]);

  useEffect(() => {
    fetchEventType();
  }, [fetchEventType]);

  const validateEmail = async (emailToValidate: string) => {
    const formatCheck = validateEmailFormat(emailToValidate);
    if (!formatCheck.isValid) {
      setEmailValidationError(formatCheck.error || 'Invalid email format');
      return false;
    }

    if (emailToValidate === lastValidatedEmail && !emailValidationError) {
      return true;
    }

    // SKIP validation for free plans
    if (host?.plan_type === 'free') {
      return true;
    }

    setIsValidatingEmail(true);
    setEmailValidationError(null);

    try {
      const response = await apiClient.post<{ valid: boolean; message: string }>(
        '/public/bookings/validate_email',
        { email: emailToValidate, event_type_id: eventTypeId }
      );

      if (response.success && response.data) {
        if (!response.data.valid) {
          setEmailValidationError(response.data.message);
          setLastValidatedEmail(emailToValidate);
          return false;
        }
        setLastValidatedEmail(emailToValidate);
        setEmailValidationError(null);
        return true;
      }
      return true; // Fallback to allow submission if API fails, though backend will still check
    } catch (err) {
      console.error('Email validation failed', err);
      return true;
    } finally {
      setIsValidatingEmail(false);
    }
  };

  const handleEmailBlur = () => {
    const email = guestEmail.trim();
    if (email) {
      validateEmail(email);
    }
  };

  const projectedSlots = useMemo(
    () => projectBookingSlots(availableSlots, hostTimezone, timezone),
    [availableSlots, hostTimezone, timezone],
  );

  useEffect(() => {
    if (projectedSlots.length === 0) {
      setSelectedSlot(null);
      setSelectedDate(null);
      return;
    }

    const currentSelection = selectedSlot
      ? projectedSlots.find((slot) => slot.host_start_time === selectedSlot.host_start_time)
      : null;
    const nextSelection = currentSelection || projectedSlots[0];

    setSelectedSlot(nextSelection);
    setSelectedDate(nextSelection.date);
  }, [projectedSlots]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && projectedSlots.length > 0) {
      console.debug('[booking] timezone projection', {
        hostTimezone,
        selectedTimezone: timezone,
        sampleSlots: projectedSlots.slice(0, 3).map((slot) => ({
          hostStartTime: slot.host_start_time,
          selectedStartTime: slot.start_time,
          label: slot.label,
          date: slot.date,
        })),
      });
    }
  }, [hostTimezone, projectedSlots, timezone]);

  useEffect(() => {
    if (selectedSlot) {
      const slotDate = new Date(selectedSlot.start_time);
      if (!isNaN(slotDate.getTime())) {
        setCurrentDate(slotDate);
      }
    }
  }, [selectedSlot]);

  const configuredBufferMinutes =
    eventType?.buffer_before ??
    eventType?.buffer_after ??
    eventType?.buffer_time ??
    host?.default_buffer_time ??
    0;

  if (isLoading) {
    return <BookingSkeleton />;
  }

  if (!eventType || !host) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-[#f0f1f3] bg-white p-8 text-center shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F7FF] text-[#5C6EFF]">
            <span className="material-symbols-outlined text-[28px]">event_busy</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#191c1e]">Booking page unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#757686]">
            The booking link could not be loaded or is no longer active.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-[#5C6EFF] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#4a59e6]"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-[#5C6EFF] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#4a59e6]"
              >
                Continue to Login
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const bookingSlots = projectedSlots;
  const selectedDaySlots = selectedDate
    ? bookingSlots.filter((slot) => slot.date === selectedDate)
    : [];

  const slotsMessage = selectedDate
    ? (selectedDaySlots.length === 0 ? 'No availability for this date' : null)
    : (bookingSlots.length === 0 ? 'No slots available' : null);

  const selectedDateLabel = getPrettyDateLabel(selectedDate);

  const handleSubmit = async () => {
    const nextErrors: { name?: string; email?: string; slot?: string } = {};

    if (!guestName.trim()) nextErrors.name = 'Name is required';
    if (!guestEmail.trim()) nextErrors.email = 'Email is required';
    if (!selectedSlot) nextErrors.slot = 'Choose an available time';

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !selectedSlot) {
      return;
    }

    // Strict validation before submission
    const isEmailValid = await validateEmail(guestEmail.trim());
    if (!isEmailValid) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setVerificationMessage(null);

    try {
      const hostStartTime = projectSelectedTimeToHost(selectedSlot.start_time, hostTimezone);

      const response = await apiClient.post<BookingRequestResponse>(
        `/public/event_types/${eventType.id}/bookings`,
        {
          booking: {
            guest_name: guestName.trim(),
            guest_email: guestEmail.trim(),
            notes: guestNotes.trim(),
            start_time: hostStartTime,
            timezone: hostTimezone,
          },
          idempotency_key: `book_${eventType.id}_${guestEmail.trim()}_${new Date(hostStartTime).getTime()}`,
        }
      );

      if (response.success && response.data) {
        if (response.data.type === 'seamless' && response.data.booking) {
          setConfirmation(response.data.booking);
        } else if (response.data.type === 'verify' && response.data.booking_request_id) {
          setBookingRequestId(response.data.booking_request_id);
          setVerificationCode('');
          setVerificationMessage(`We sent a verification code to ${response.data.guest.email}. Enter it below to confirm the booking.`);
        }
      } else {
        setError(response.error?.message || 'Unable to confirm booking');
      }
    } catch (submitError: any) {
      console.error('Booking submission failed', submitError);
      setError(submitError?.message || 'Unable to confirm booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyBooking = async () => {
    if (!bookingRequestId) {
      setError('Please request a verification code first.');
      return;
    }

    if (!verificationCode.trim()) {
      setError('Verification code is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.post<BookingVerificationResponse>(
        `/public/event_types/${eventType.id}/bookings/verify`,
        {
          booking: {
            booking_request_id: bookingRequestId,
            verification_code: verificationCode.trim(),
          },
        }
      );

      if (response.success && response.data) {
        setConfirmation(response.data.booking);
        setVerificationMessage(null);
      } else {
        setError(response.error?.message || 'Unable to verify booking');
      }
    } catch (verifyError: any) {
      console.error('Booking verification failed', verifyError);
      setError(verifyError?.message || 'Unable to verify booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookAnotherTime = async () => {
    setConfirmation(null);
    setSelectedSlot(null);
    setSelectedDate(null);
    setFieldErrors({});
    setError(null);
    setVerificationMessage(null);
    setBookingRequestId(null);
    setVerificationCode('');
    setGuestNotes('');
    await fetchEventType();
  };

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstWeekdayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstWeekday = getFirstWeekdayOfMonth(currentYear, currentMonth);

  const calendarCells: Array<{ dayNumber: number | null; dateKey: string | null }> = [];

  for (let i = 0; i < firstWeekday; i++) {
    calendarCells.push({ dayNumber: null, dateKey: null });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push({ dayNumber: day, dateKey: null });
  }

  if (confirmation) {
    const confirmedDate = new Date(confirmation.start_time);

    return (
      <div className="min-h-screen bg-[#f8f9fb] px-4 py-8 sm:py-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          <div className="w-full rounded-[28px] border border-white/70 bg-white p-6 sm:p-10 shadow-[0_20px_70px_rgba(17,24,39,0.08)]">
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#5C6EFF]">
                <span className="material-symbols-outlined text-[28px]">check</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#191c1e] sm:text-3xl">Booking confirmed</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#757686]">
                Your appointment is booked. A confirmation has been prepared for {guestName.trim()}.
              </p>
            </div>

            <div className="mt-8 grid gap-4 rounded-2xl border border-[#f0f1f3] bg-[#f8f9fb] p-5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757686]">Session</p>
                <p className="mt-2 text-base font-bold text-[#191c1e]">{confirmation.title}</p>
                <p className="mt-1 text-sm text-[#757686]">
                  {confirmedDate.toLocaleString([], {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: timezone || 'UTC',
                  })}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757686]">Guest</p>
                <p className="mt-2 text-base font-bold text-[#191c1e]">{guestName.trim()}</p>
                <p className="mt-1 text-sm text-[#757686]">{guestEmail.trim()}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-[#f0f1f3] bg-white px-5 py-3 text-sm font-bold text-[#191c1e] transition-colors hover:bg-[#f8f9fb]"
              >
                Return to login
              </Link>
              <button
                type="button"
                onClick={handleBookAnotherTime}
                className="inline-flex items-center justify-center rounded-xl bg-[#5C6EFF] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#4a59e6]"
              >
                Book another time
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body">
      <main className="flex min-h-screen flex-col lg:flex-row">
        {/* LEFT PANEL: Host Info & Meeting Details */}
        <section className="w-full lg:w-[40%] bg-surface-container-lowest border-b lg:border-b-0 lg:border-r border-surface-container-highest p-8 lg:p-16 flex flex-col">
          {/* Branding */}
          <div className="mb-12 lg:mb-16">
            <span className="text-xl font-extrabold tracking-tight text-primary">Schedulr</span>
          </div>
          
          {/* Host Profile */}
          <div className="flex flex-col gap-6 mb-12">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-container">
              {host.avatar_url ? (
                <img src={host.avatar_url} alt={host.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary bg-primary-fixed">
                  {host.full_name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-on-background leading-tight mb-1">{host.full_name}</h2>
              <p className="text-on-surface-variant font-medium text-lg">
                {host.username ? `@${host.username}` : 'Host'}
              </p>
              <p className="text-on-surface-variant text-sm mt-2">Buffer time: {String(configuredBufferMinutes)} minutes</p>
            </div>
          </div>

          {/* Meeting Info */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-on-background">{eventType.title}</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-on-surface-variant font-medium">
                <span className="material-symbols-outlined text-primary">schedule</span>
                <span className="text-body-md">{eventType.duration} min</span>
              </div>
              {eventType.location && (
                <div className="flex items-center gap-3 text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-primary">videocam</span>
                  <span className="text-body-md">{eventType.location}</span>
                </div>
              )}
            </div>
            {eventType.description && (
              <p className="text-on-surface-variant leading-relaxed max-w-sm mt-4">
                {eventType.description}
              </p>
            )}
          </div>
        </section>

        {/* RIGHT PANEL: Booking Interaction */}

        <section className="w-full lg:w-[60%] bg-surface-container-low p-6 lg:p-16 flex items-center justify-center">


          {/* Booking Card */}
          <div className="w-full max-w-[720px] bg-surface-container-lowest rounded-xl shadow-[0_16px_48px_rgba(17,24,39,0.06)] p-6 lg:p-12">
            <div className="mb-10 space-y-1.5">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Meeting Timezone</label>
              <ProfessionalTimezoneSelector
                value={timezone}
                onChange={setTimezone}
                placeholder="Type city, country, or abbreviation..."
                className="text-sm"
                variant="compact"
              />
                {host && hostTimezone !== timezone && (
                  <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between animate-in slide-in-from-top-2 duration-500">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Time Difference</p>
                      <p className="text-xs font-bold text-on-surface">
                        Host is in <span className="text-primary">{hostTimezone.split('/').pop()?.replace(/_/g, ' ')}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl">compare_arrows</span>
                      <span className="text-sm font-black text-primary">
                        {(() => {
                          try {
                            const now = new Date();
                            const getOffsetMinutes = (tz: string) => {
                              const parts = new Intl.DateTimeFormat('en-US', {
                                timeZone: tz,
                                timeZoneName: 'shortOffset'
                              }).formatToParts(now);
                              const offsetStr = parts.find(p => p.type === 'timeZoneName')?.value || '';
                              const match = offsetStr.match(/([+-])(\d+):?(\d+)?/);
                              if (!match) return 0;
                              const [_, sign, hours, minutes] = match;
                              const totalMinutes = (parseInt(hours) * 60) + (parseInt(minutes || '0'));
                              return sign === '+' ? totalMinutes : -totalMinutes;
                            };
                            
                            const hostOffset = getOffsetMinutes(hostTimezone);
                            const guestOffset = getOffsetMinutes(timezone);
                            const diff = (hostOffset - guestOffset) / 60;
                            
                            if (diff === 0) return 'Same time';
                            const absDiff = Math.abs(diff);
                            const h = Math.floor(absDiff);
                            const m = Math.round((absDiff - h) * 60);
                            const diffStr = m > 0 ? `${h}h ${m}m` : `${h}h`;
                            return `${diffStr} ${diff > 0 ? 'ahead' : 'behind'}`;
                          } catch (e) { 
                            console.error('Offset calc error:', e);
                            return 'Different zone'; 
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              {/* Calendar View */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-bold text-on-background">
                    {MONTHS[currentMonth]} {currentYear}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-2 hover:bg-surface-container transition-colors rounded-lg"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant">chevron_left</span>
                    </button>
                    <button 
                      type="button"
                      onClick={handleNextMonth}
                      className="p-2 hover:bg-surface-container transition-colors rounded-lg"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center mb-2">
                  <span className="text-[10px] font-bold text-outline uppercase">Sun</span>
                  <span className="text-[10px] font-bold text-outline uppercase">Mon</span>
                  <span className="text-[10px] font-bold text-outline uppercase">Tue</span>
                  <span className="text-[10px] font-bold text-outline uppercase">Wed</span>
                  <span className="text-[10px] font-bold text-outline uppercase">Thu</span>
                  <span className="text-[10px] font-bold text-outline uppercase">Fri</span>
                  <span className="text-[10px] font-bold text-outline uppercase">Sat</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((cell, index) => {
                    if (cell.dayNumber === null) {
                      return <div key={`empty-${index}`} className="aspect-square flex items-center justify-center text-outline-variant text-sm" />
                    }

                    const cellDateString = getCalendarDateString(currentYear, currentMonth, cell.dayNumber);
                    const isAvailable = bookingSlots.some((slot) => slot.date === cellDateString);
                    const isSelected = selectedDate === cellDateString;
                    return (
                      <button
                        key={`${currentYear}-${currentMonth}-${cell.dayNumber}`}
                        type="button"
                        onClick={() => {
                          setSelectedDate(cellDateString);
                          const slotForDay = bookingSlots.find((slot) => slot.date === cellDateString);
                          setSelectedSlot(slotForDay || null);
                        }}
                        className={`aspect-square flex items-center justify-center transition-colors rounded-lg text-sm font-bold ${
                          isSelected
                            ? 'bg-primary text-white'
                            : isAvailable
                            ? 'text-on-background hover:bg-surface-container bg-transparent shadow-sm'
                            : 'text-outline-variant hover:bg-surface-container/50 bg-transparent'
                        }`}
                      >
                        {cell.dayNumber}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="flex flex-col">
                <div className="mb-6 flex flex-col gap-1">
                  <span className="text-lg font-extrabold text-on-background block tracking-tight">{selectedDateLabel}</span>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                    <span className="material-symbols-outlined text-xs">info</span>
                    <span>All times shown in {timezone}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[280px] pr-2">
                  {selectedDaySlots.length > 0 ? (
                    selectedDaySlots.map((slot) => {
                      const isSlotSelected = selectedSlot?.start_time === slot.start_time;
                      return (
                        <button
                          key={slot.start_time}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          disabled={!slot.available}
                          className={`w-full py-2.5 px-3 rounded-lg font-semibold transition-all text-center text-sm ${
                            !slot.available 
                              ? 'border border-outline/20 text-outline/40 bg-surface-container/20 cursor-not-allowed'
                              : isSlotSelected 
                              ? 'border border-primary bg-primary/10 text-primary shadow-sm'
                              : 'border border-primary/30 text-primary hover:border-primary hover:bg-primary/5 bg-white'
                          }`}
                        >
                          {slot.label}
                        </button>
                      );
                    })
                  ) : slotsMessage ? (
                    <div className="text-sm font-bold text-outline-variant text-center py-4">
                      {slotsMessage}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Registration Form */}
            <div className="mt-12 pt-12 border-t border-surface-container-highest flex flex-col gap-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text"
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      setFieldErrors(curr => ({ ...curr, name: undefined }));
                      setBookingRequestId(null);
                      setVerificationMessage(null);
                      setVerificationCode('');
                    }}
                    className={`w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 text-on-background placeholder:text-outline/50 transition-all ${
                      fieldErrors.name ? 'ring-2 ring-error' : ''
                    }`}
                    placeholder="Jane Doe" 
                  />
                  {fieldErrors.name && <p className="text-xs text-error mt-1 font-semibold">{fieldErrors.name}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <input 
                      type="email"
                      value={guestEmail}
                      onBlur={handleEmailBlur}
                      onChange={(e) => {
                        setGuestEmail(e.target.value);
                        setFieldErrors(curr => ({ ...curr, email: undefined }));
                        setEmailValidationError(null);
                        setBookingRequestId(null);
                        setVerificationMessage(null);
                        setVerificationCode('');
                      }}
                      className={`w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 text-on-background placeholder:text-outline/50 transition-all ${
                        fieldErrors.email || emailValidationError ? 'ring-2 ring-error' : ''
                      }`}
                      placeholder="jane@example.com" 
                    />
                    {isValidatingEmail && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {(fieldErrors.email || emailValidationError) && (
                    <p className="text-xs text-error mt-1 font-semibold">
                      {fieldErrors.email || emailValidationError}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Any specific topics?</label>
                <textarea 
                  value={guestNotes}
                  onChange={(e) => {
                    setGuestNotes(e.target.value);
                    setBookingRequestId(null);
                    setVerificationMessage(null);
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 text-on-background placeholder:text-outline/50 transition-all resize-none" 
                  placeholder="Anything I should know before we meet?" 
                  rows={3}
                />
              </div>

              {verificationMessage && (
                <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
                  {verificationMessage}
                </div>
              )}

              {bookingRequestId && !confirmation && (
                <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Verification Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\s+/g, ''))}
                      className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 text-on-background placeholder:text-outline/50 transition-all tracking-[0.35em] font-semibold"
                      placeholder="123456"
                    />
                    <p className="text-xs font-medium text-outline-variant">
                      Enter the 6-digit code from the email we sent to {guestEmail.trim()}.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyBooking}
                    disabled={isSubmitting || bookingSlots.length === 0}
                    className="w-full py-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Verifying...' : 'Verify and Confirm Booking'}
                  </button>
                </div>
              )}

              {fieldErrors.slot && <p className="text-sm text-error font-semibold">{fieldErrors.slot}</p>}
              {error && <p className="text-sm text-error font-semibold">{error}</p>}

              <button 
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isValidatingEmail || !!emailValidationError || bookingSlots.length === 0}
                className="w-full py-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidatingEmail ? 'Verifying Email...' : (bookingRequestId ? (isSubmitting ? 'Sending...' : 'Resend Code') : (isSubmitting ? 'Processing...' : 'Book Appointment'))}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}