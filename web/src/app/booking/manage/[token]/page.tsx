'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { bookingsApi, PublicBookingDetails } from '@/lib/api/bookings';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ManageBookingPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  
  const [booking, setBooking] = useState<PublicBookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid management link. Please check your email.');
      setIsLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        const response = await bookingsApi.getManagement(token);
        if (response.success && response.data) {
          setBooking(response.data);
        } else {
          setError(response.error?.message || 'Booking not found or link expired.');
        }
      } catch (err) {
        setError('Failed to load booking details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-[#5C6EFF]/15 border-t-[#5C6EFF] animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 animate-pulse">Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[32px] p-8 sm:p-10 shadow-[0_20px_70px_rgba(17,24,39,0.08)] text-center border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 mx-auto">
            <span className="material-symbols-outlined text-[32px]">warning</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-4 bg-[#5C6EFF] text-white font-bold rounded-2xl hover:bg-[#4a59e6] transition-all active:scale-[0.98] shadow-lg shadow-indigo-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const isCancelled = booking.status === 'cancelled';

  return (
    <div className="min-h-screen bg-[#f3f4f6] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5C6EFF] rounded-xl flex items-center justify-center text-white font-black text-xl">S</div>
            <span className="font-black text-xl text-slate-900 tracking-tight">Schedulr</span>
          </div>
          <div className="px-4 py-1.5 bg-white rounded-full border border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-widest shadow-sm">
            Booking Management
          </div>
        </div>

        {/* Status Banner */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-start gap-4 animate-in slide-in-from-top-4 duration-500">
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-red-500 flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined">cancel</span>
            </div>
            <div>
              <h3 className="font-bold text-red-900">This booking is cancelled</h3>
              <p className="text-sm text-red-700 mt-1 opacity-80">This appointment is no longer on your schedule. You can book a new one if needed.</p>
            </div>
          </div>
        )}

        {/* Booking Details Card */}
        <div className={cn(
          "bg-white rounded-[32px] p-8 sm:p-10 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all",
          isCancelled && "opacity-60 grayscale-[0.5]"
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-50">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center text-[#5C6EFF] shadow-inner">
                <span className="material-symbols-outlined text-[32px]">event</span>
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{booking.title}</h1>
                <p className="text-slate-500 font-medium">with <span className="text-slate-900 font-bold">{booking.host_name}</span></p>
              </div>
            </div>
            <div className="px-5 py-2.5 bg-[#5C6EFF]/5 rounded-2xl border border-[#5C6EFF]/10">
              <p className="text-[10px] font-black text-[#5C6EFF] uppercase tracking-widest mb-0.5">Duration</p>
              <p className="text-sm font-bold text-slate-900">{booking.event_type.duration} Minutes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <span className="material-symbols-outlined text-xl">calendar_today</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                  <p className="text-sm font-bold text-slate-900">{format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <span className="material-symbols-outlined text-xl">schedule</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</p>
                  <p className="text-sm font-bold text-slate-900">
                    {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">Timezone: {booking.guest_name ? 'Local' : 'UTC'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <span className="material-symbols-outlined text-xl">location_on</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                  <p className="text-sm font-bold text-slate-900">{booking.location || 'Online / To be determined'}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <span className="material-symbols-outlined text-xl">person</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendee</p>
                  <p className="text-sm font-bold text-slate-900">{booking.guest_name}</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">{booking.guest_email}</p>
                </div>
              </div>
            </div>
          </div>

          {booking.description && (
            <div className="mb-10 bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Notes / Description</p>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">{booking.description}</p>
            </div>
          )}

          {!isCancelled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => router.push(`/booking/manage/${token}/reschedule`)}
                className="group flex items-center justify-center gap-3 py-4 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-2xl hover:border-[#5C6EFF]/30 hover:bg-[#5C6EFF]/5 transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-slate-400 group-hover:text-[#5C6EFF] transition-colors">event_repeat</span>
                Reschedule Meeting
              </button>
              <button
                onClick={() => router.push(`/booking/manage/${token}/cancel`)}
                className="group flex items-center justify-center gap-3 py-4 bg-white border-2 border-red-100 text-red-500 font-bold rounded-2xl hover:bg-red-50 hover:border-red-200 transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined opacity-60 group-hover:opacity-100 transition-opacity">cancel</span>
                Cancel Meeting
              </button>
            </div>
          )}
        </div>

        {/* Help Footer */}
        <div className="text-center pt-8">
          <p className="text-sm font-medium text-slate-400 mb-2 tracking-tight">Need assistance with this booking?</p>
          <a 
            href={`mailto:${booking.guest_email}`} 
            className="text-sm font-bold text-[#5C6EFF] hover:underline transition-all"
          >
            Contact the host directly
          </a>
        </div>
      </div>
    </div>
  );
}
