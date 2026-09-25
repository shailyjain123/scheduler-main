'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { bookingsApi, PublicBookingDetails } from '@/lib/api/bookings';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function CancelBookingPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  
  const [booking, setBooking] = useState<PublicBookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid management link.');
      setIsLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        const response = await bookingsApi.getManagement(token);
        if (response.success && response.data) {
          setBooking(response.data);
        } else {
          setError(response.error?.message || 'Booking not found.');
        }
      } catch (err) {
        setError('Failed to load booking details.');
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
      const response = await bookingsApi.cancelManagement(token, reason);
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.error?.message || 'Failed to cancel booking.');
      }
    } catch (err) {
      setError('An error occurred while cancelling your booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <div className="h-10 w-10 border-4 border-[#5C6EFF]/15 border-t-[#5C6EFF] animate-spin rounded-full" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-[0_20px_70px_rgba(17,24,39,0.08)] text-center border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[28px] bg-red-50 text-red-500 mx-auto shadow-inner">
            <span className="material-symbols-outlined text-[40px]">cancel</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Booking Cancelled</h1>
          <p className="text-slate-500 mb-10 leading-relaxed font-medium">
            Your appointment has been successfully removed. Your host <strong>{booking?.host_name}</strong> has been notified.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[32px] p-10 text-center shadow-lg border border-slate-100">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 mx-auto">
            <span className="material-symbols-outlined text-[32px]">warning</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
          <p className="text-slate-500 mb-8">{error || 'Unable to load your booking.'}</p>
          <button onClick={() => router.push('/')} className="w-full py-4 bg-[#5C6EFF] text-white font-bold rounded-2xl">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-[40px] p-8 sm:p-10 shadow-[0_20px_70px_rgba(17,24,39,0.06)] border border-slate-100">
        <div className="mb-10 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 mb-6">
            <span className="material-symbols-outlined text-[32px]">event_busy</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Cancel your meeting?</h1>
          <p className="text-slate-500 font-medium">
            Please confirm you want to cancel with <strong>{booking.host_name}</strong>. This action cannot be undone.
          </p>
        </div>

        <div className="bg-slate-50 rounded-[28px] p-8 mb-8 border border-slate-100/50">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200/50">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-[#5C6EFF] shadow-sm">
              <span className="material-symbols-outlined text-xl">calendar_today</span>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">{booking.title}</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {format(new Date(booking.start_time), 'MMM d, yyyy')} • {format(new Date(booking.start_time), 'h:mm a')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Reason for cancellation (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Let the host know why you're cancelling..."
              className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-[#5C6EFF]/30 focus:outline-none transition-all text-sm font-medium min-h-[100px] resize-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
            ) : null}
            Cancel Meeting
          </button>
        </div>
        
        {error && (
          <p className="mt-6 text-center text-sm font-bold text-red-500 bg-red-50 py-3 rounded-2xl border border-red-100 animate-in shake-1">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
