'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { apiClient } from '../../../services/apiClient';
import { ApiResponse } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { useOnboardingProtection } from '../../../hooks/useOnboardingProtection';
import { normalizeWeeklyAvailability } from '@/lib/availability';
import Image from 'next/image';
import { useFieldErrors } from '../../../hooks/useFieldErrors';

export default function FinalisePage() {
  const protectionStatus = useOnboardingProtection(5);
  const { user, setAuth } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [previewDate, setPreviewDate] = useState(new Date());
  const [connectedTools, setConnectedTools] = useState<string[]>([]);
  const { captureApiErrors } = useFieldErrors<{ full_name: string; username: string }>();

  useEffect(() => {
    if (user?.integrations) {
      setConnectedTools(Array.from(new Set(((user.integrations as { connected?: string[] }).connected || []).map((tool: string) => tool.toString()))));
    }
  }, [user]);

  const handleFinalize = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<Record<string, unknown>>('/onboarding/finalise');
      if (response.success) {
        const refreshUser = async () => {
          try {
            const res = await apiClient.get<ApiResponse>('/users/me');
            if (res.success && res.data) {
              setAuth((res.data as any).user, localStorage.getItem('token') || '');
            }
          } catch {
            console.error('Failed to refresh user data:');
          }
        };
        await refreshUser();
        router.push('/dashboard');
      } else {
        captureApiErrors(response);
        setError(response.error?.message || 'Failed to finalize profile');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (protectionStatus.isLoading || !protectionStatus.isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  const name = user?.full_name?.split(' ')[0] || 'there';
  const fullName = user?.full_name || 'Your Profile';
  const username = user?.username || 'user';
  const bookingUrl = `schedulr.io/${username}`;

  const currentMonthYear = previewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const weekStart = (() => {
    const start = new Date(previewDate);
    const mondayBasedDay = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayBasedDay);
    start.setHours(0, 0, 0, 0);
    return start;
  })();

  const calendarStrip = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });

  const isSameDay = (a: Date, b: Date) => (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );

  const setPreviewDay = (date: Date) => {
    setPreviewDate(new Date(date));
  };

  const shiftPreviewWeek = (offset: number) => {
    setPreviewDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + (offset * 7));
      return next;
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${bookingUrl}`);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleShare = async () => {
    const shareUrl = `https://${bookingUrl}`;
    if (navigator.share) {
      await navigator.share({
        title: `${fullName} - Booking Link`,
        text: 'Book a meeting with me',
        url: shareUrl,
      });
      return;
    }
    navigator.clipboard.writeText(shareUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const hasCalendar = connectedTools.some(i => i.includes('google'));
  const hasVideo = connectedTools.some(i => i.includes('zoom') || i.includes('google'));
  const normalizedAvailability = normalizeWeeklyAvailability(user?.availability);
  
  const getAvailabilitySummary = () => {
    const dayList = Object.keys(normalizedAvailability).filter((d) => normalizedAvailability[d].length > 0);
    if (dayList.length === 0) return 'No active slots';
    
    const firstDaySlots = normalizedAvailability[dayList[0]];
    const timeRange = firstDaySlots.length > 0 
      ? `${firstDaySlots[0].start} - ${firstDaySlots[0].end}` 
      : 'No times';
      
    if (dayList.length >= 7) return `Daily, ${timeRange}`;
    if (dayList.includes('Monday') && dayList.includes('Friday') && dayList.length === 5) return `Mon - Fri, ${timeRange}`;
    
    return `${dayList[0].substring(0,3)} - ${dayList[dayList.length-1].substring(0,3)}, ${timeRange}`;
  };

  const getPreviewSlots = () => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const previewDayName = dayNames[previewDate.getDay()];
    const daySlots = normalizedAvailability[previewDayName] || [];

    if (daySlots.length === 0) return ['No slots available'];
    return daySlots.map((s) => `${s.start} - ${s.end}`);
  };

  const scheduleSummary = getAvailabilitySummary();
  const previewSlots = getPreviewSlots();

  const handleBack = () => {
    if (user) {
      setAuth({ ...user, onboarding_stage: 4 }, localStorage.getItem('token') || '');
    }
    router.push('/onboarding/meeting-types');
  };

  return (
    <div className="w-full max-w-[780px] px-4 mb-16 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="w-full bg-white rounded-2xl shadow-[0_16px_48px_rgba(17,24,39,0.06)] p-8 border border-[#e1e2e4]">
        
        {/* 1. Header Success Section */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-10 h-10 rounded-full bg-[#f4f7ff] border-4 border-[#5C6EFF]/10 flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-[#5C6EFF] text-xl font-bold">check</span>
          </div>
          <h1 className="text-2xl font-bold text-[#191c1e] mb-3 tracking-tight">You&apos;re all set, {name}!</h1>
          <p className="text-[#757686] font-medium text-[14px] max-w-lg mx-auto leading-relaxed">
            Your scheduling assistant is ready. We&apos;ve synchronized your preferences and prepared your public booking page.
          </p>
        </div>

        {error && (
          <div className="mb-8 bg-[#ffdad6] text-[#93000a] p-4 rounded-xl text-[13px] font-bold flex items-center gap-4 border border-[#ba1a1a]/10">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        {/* 2. Middle Configuration Section (2 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          
          {/* Left: Booking Link Card */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-[#f0f1f3] flex flex-col h-full hover:border-[#5C6EFF]/10 transition-all">
            <h3 className="text-[10px] font-bold text-[#757686] uppercase tracking-[0.2em] mb-6">YOUR PERSONAL BOOKING LINK</h3>
            <div className="mt-auto">
              <div className="relative group w-full flex items-center gap-1.5 p-1 bg-[#f8f9fb] rounded-xl border border-[#f0f1f3] hover:border-[#5C6EFF]/20 transition-all">
                <div className="flex-1 px-3 overflow-hidden">
                  <span className="font-bold text-[#5C6EFF] text-[13px] truncate block">{bookingUrl}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleShare}
                    className="w-8 h-8 flex items-center justify-center text-[#757686] hover:text-[#5C6EFF] transition-colors rounded-lg hover:bg-white/50"
                  >
                    <span className="material-symbols-outlined text-base">share</span>
                  </button>
                  <button 
                    onClick={handleCopy}
                    className={`h-8 px-3 font-bold text-[10px] rounded-lg transition-all shadow-sm flex items-center gap-1.5 ${
                      copySuccess ? 'bg-[#22C55E] text-white' : 'bg-[#5C6EFF] text-white hover:bg-[#4a59e6]'
                    }`}
                  >
                    {copySuccess ? 'Copied' : (
                      <>
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <p className="mt-6 text-[10px] font-medium text-[#757686] leading-relaxed opacity-80">
                Share this link in your email signature or social profiles to let people book meetings instantly.
              </p>
            </div>
          </div>

          {/* Right: Configuration Status Card */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-[#f0f1f3] flex flex-col h-full hover:border-[#5C6EFF]/10 transition-all">
            <h3 className="text-[10px] font-bold text-[#757686] uppercase tracking-[0.2em] mb-6">CONFIGURATION STATUS</h3>
            <div className="space-y-4 mt-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#f0f1f3] flex items-center justify-center text-[#5C6EFF] shadow-sm">
                        <span className="material-symbols-outlined text-lg">calendar_today</span>
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-[#191c1e]">Calendar</h4>
                        <p className="text-[9px] font-bold text-[#757686] truncate max-w-[100px]">{user?.email || 'Not connected'}</p>
                      </div>
                  </div>
                  <div className={`text-[8px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-[0.1em] ${hasCalendar ? 'bg-[#22C55E]/5 text-[#22C55E] border-[#22C55E]/10' : 'bg-[#EF4444]/5 text-[#EF4444] border-[#EF4444]/10'}`}>
                      {hasCalendar ? 'CONNECTED' : 'EXPIRED'}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#f0f1f3] flex items-center justify-center text-[#5C6EFF] shadow-sm">
                        <span className="material-symbols-outlined text-lg">videocam</span>
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-[#191c1e]">Video</h4>
                        <p className="text-[9px] font-bold text-[#757686]">{hasVideo ? 'Tools Active' : 'Not setup'}</p>
                      </div>
                  </div>
                  <div className={`text-[8px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-[0.1em] ${hasVideo ? 'bg-[#22C55E]/5 text-[#22C55E] border-[#22C55E]/10' : 'bg-[#EF4444]/5 text-[#EF4444] border-[#EF4444]/10'}`}>
                      {hasVideo ? 'ACTIVE' : 'MISSING'}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#f0f1f3] flex items-center justify-center text-[#5C6EFF] shadow-sm">
                        <span className="material-symbols-outlined text-lg">schedule</span>
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-[#191c1e]">Schedule</h4>
                        <p className="text-[9px] font-bold text-[#757686]">{scheduleSummary}</p>
                      </div>
                  </div>
                  <div className="text-[8px] font-bold px-2 py-0.5 rounded-md border border-[#5C6EFF]/10 bg-[#5C6EFF]/5 text-[#5C6EFF] uppercase tracking-[0.1em]">
                      ACTIVE
                  </div>
                </div>
            </div>
          </div>
        </div>

        {/* 3. Large Public Preview Card */}
        <div className="bg-[#fcfdfe] rounded-2xl p-8 shadow-[0_12px_40px_rgba(0,0,0,0.03)] border border-[#f0f1f3] relative overflow-hidden group/preview hover:border-[#5C6EFF]/10 transition-all">
          <h3 className="text-[10px] font-bold text-[#757686] uppercase tracking-[0.2em] mb-8">PUBLIC PAGE PREVIEW</h3>
          
          <div className="flex flex-col lg:flex-row gap-10 items-start">
            {/* Left Column: Profile */}
            <div className="flex-shrink-0 flex flex-col items-center lg:items-start pt-2 w-full lg:w-auto">
                <div className="w-24 h-24 rounded-2xl bg-white ring-4 ring-white shadow-xl overflow-hidden border border-[#f0f1f3]/50 mb-6 flex items-center justify-center relative">
                  {user?.avatar_url ? (
                      <Image 
                        src={user.avatar_url} 
                        alt="Profile" 
                        fill
                        style={{ objectFit: 'cover' }}
                        className="transition-transform group-hover/preview:scale-105" 
                        unoptimized // External avatar URLs
                      />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#757686] bg-gradient-to-br from-[#f8f9fb] to-[#e7e8ea]">
                        <span className="material-symbols-outlined text-4xl font-light">person</span>
                      </div>
                  )}
                </div>
                <h4 className="text-xl font-bold text-[#191c1e] tracking-tight mb-1 text-center lg:text-left">{fullName}</h4>
                <p className="text-[12px] font-bold text-[#757686] opacity-60 text-center lg:text-left">@{username}</p>
            </div>

            {/* Right Column: Calendar Mockup */}
            <div className="flex-1 w-full bg-white rounded-2xl border border-[#f0f1f3] shadow-sm p-6">
                <div className="flex items-center justify-between mb-8">
                  <h5 className="text-[15px] font-bold text-[#191c1e]">{currentMonthYear}</h5>
                  <div className="flex items-center gap-3">
                      <button onClick={() => shiftPreviewWeek(-1)} className="material-symbols-outlined text-[#757686] text-lg hover:opacity-100 transition-opacity">chevron_left</button>
                      <button onClick={() => shiftPreviewWeek(1)} className="material-symbols-outlined text-[#757686] text-lg hover:opacity-100 transition-opacity">chevron_right</button>
                  </div>
                </div>

                {/* Weeks grid mockup */}
                <div className="grid grid-cols-7 gap-y-4 text-center mb-8">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                      <span key={day} className="text-[9px] font-bold text-[#757686] tracking-widest">{day}</span>
                  ))}
                  {calendarStrip.map((date, i) => (
                    <span key={i} className="flex items-center justify-center">
                      <button
                        onClick={() => setPreviewDay(date)}
                        className={`w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center transition-all ${
                        isSameDay(date, previewDate)
                        ? 'bg-[#5C6EFF] text-white shadow-lg shadow-[#5C6EFF]/20' 
                        : 'text-[#191c1e] hover:bg-[#f0f1f3]'
                      }`}>
                        {date.getDate()}
                      </button>
                    </span>
                  ))}
                </div>

                {/* Time Slots Mockup */}
                <div className="max-w-[300px] mx-auto space-y-2">
                  {previewSlots.map((slot, i) => (
                      <div key={i} className="w-full h-11 rounded-lg border border-[#f0f1f3] bg-[#f8f9fb] flex items-center justify-center text-[13px] font-bold text-[#191c1e] hover:border-[#5C6EFF]/20 hover:scale-[1.01] transition-all cursor-pointer">
                        {slot}
                      </div>
                  ))}
                </div>
            </div>
          </div>
        </div>

        {/* 4. Final Footer Actions */}
        <div className="mt-12 pt-8 border-t border-[#f0f1f3] flex items-center justify-between">
          <button 
            type="button"
            onClick={handleBack}
            className="text-[13px] font-bold text-[#757686] hover:text-[#191c1e] transition-colors flex items-center gap-1.5 group"
          >
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
            Back
          </button>
          <button 
            onClick={handleFinalize}
            disabled={isLoading}
            className="h-12 bg-[#191c1e] hover:bg-[#2d2e3e] text-white font-bold rounded-xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base px-10 min-w-[220px] group/btn"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Go to Dashboard
                <span className="material-symbols-outlined text-[20px] group-hover/btn:translate-x-1 transition-transform">arrow_right_alt</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
