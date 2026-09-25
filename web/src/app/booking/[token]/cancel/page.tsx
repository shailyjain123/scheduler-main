'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { bookingsApi, PublicBookingDetails } from '@/lib/api/bookings';
import { format } from 'date-fns';

export default function CancelBookingPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<PublicBookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchBooking = async () => {
      try {
        const response = await bookingsApi.getPublicBooking(token);
        if (response.success && response.data) {
          setBooking(response.data);
        } else {
          setError(response.error?.message || 'Booking not found');
        }
      } catch (err) {
        setError('Failed to load booking details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [token]);

  const handleCancel = async () => {
    if (!token) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await bookingsApi.cancelPublicBooking(token);
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.error?.message || 'Failed to cancel booking');
      }
    } catch (err) {
      setError('An error occurred while cancelling your booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-[#5C6EFF]/15 border-t-[#5C6EFF] animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading booking</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[32px] p-8 sm:p-10 shadow-[0_20px_70px_rgba(17,24,39,0.08)] text-center border border-slate-100">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 mx-auto">
            <span className="material-symbols-outlined text-[32px]">cancel</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Booking Cancelled</h1>
          <p className="text-slate-500 mb-8">
            Your appointment has been successfully cancelled. The host has been notified.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3.5 bg-slate-100 text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[32px] p-8 sm:p-10 shadow-[0_20px_70px_rgba(17,24,39,0.08)] text-center border border-slate-100">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 mx-auto">
            <span className="material-symbols-outlined text-[32px]">warning</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
          <p className="text-slate-500 mb-8">{error || 'Unable to load your booking details.'}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3.5 bg-[#5C6EFF] text-white font-bold rounded-xl hover:bg-[#4a59e6] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-[32px] p-8 sm:p-10 shadow-[0_20px_70px_rgba(17,24,39,0.08)] border border-slate-100">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">Cancel your booking?</h1>
          <p className="text-slate-500 text-center text-sm">
            Please confirm you want to cancel your meeting with <strong>{booking.host_name}</strong>.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-4">{booking.title}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="material-symbols-outlined text-slate-400 text-lg">calendar_today</span>
              {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="material-symbols-outlined text-slate-400 text-lg">schedule</span>
              {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
            </div>
            {booking.location && (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="material-symbols-outlined text-slate-400 text-lg">location_on</span>
                {booking.location}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Keep Booking
          </button>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 py-3.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
            ) : null}
            Cancel Meeting
          </button>
        </div>
        
        {error && (
          <p className="mt-4 text-center text-sm font-medium text-red-500 bg-red-50 py-2 rounded-lg">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
