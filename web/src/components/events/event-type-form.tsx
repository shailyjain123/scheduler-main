'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';
import { EventType } from '@/lib/types/event';
import { useFieldErrors } from '@/hooks/useFieldErrors';
import { ApiResponse } from '@/lib/api/client';
import { useSchedules } from '@/lib/hooks/use-schedules';
import ScheduleEditor from '@/components/availability/schedule-editor';
import { AvailabilitySlot } from '@/lib/types/schedules';
import { cn } from '@/lib/utils';
import { useLocationDefaults } from '@/lib/hooks/use-location-defaults';
import { useAuthStore } from '@/store/authStore';

interface EventTypeFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  initialData?: EventType | null;
}

export function EventTypeForm({ onCancel, onSuccess, initialData }: EventTypeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fieldErrors, setFieldError, setFieldErrors, captureApiErrors } = useFieldErrors<EventType>();
  const { user } = useAuthStore();
  const { data: locationDefaults, getLabel } = useLocationDefaults();

  const [formData, setFormData] = useState<EventType>({
    title: '',
    duration: 30,
    location: 'Zoom',
    description: '',
    is_active: true,
    kind: 'one_on_one',
  });

  const connectedIntegrations = Array.isArray(user?.integrations?.connected)
    ? new Set(user.integrations.connected.map(i => i.toString()))
    : new Set();

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        is_active: initialData.is_active ?? true,
      } as EventType);
      setSlots(initialData.availability?.slots || []);
    } else {
      const defaultSchedule = schedules.find(s => s.is_default) || schedules[0];
      if (defaultSchedule && defaultSchedule.availability_slots) {
        setSlots(defaultSchedule.availability_slots.map(s => ({ ...s, id: undefined })));
      }

      // Set dynamic default location for new event types
      if (locationDefaults?.recommended_default) {
        setFormData(prev => ({ ...prev, location: getLabel(locationDefaults.recommended_default.type) }));
      }
    }
  }, [initialData, schedules, locationDefaults]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!formData.title.trim()) {
      setFieldError('title', 'Event title is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const submissionData = { ...formData, availability: { slots } };
      let response;
      
      if (initialData?.id) {
        response = await apiClient.patch<{ event_type: EventType }>(`/event_types/${initialData.id}`, { event_type: submissionData });
      } else {
        response = await apiClient.post<{ event_type: EventType }>('/event_types', { event_type: submissionData });
      }

      if (response.success) {
        onSuccess();
      } else {
        captureApiErrors(response);
        setError(response.error?.message || 'Failed to save event type');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyMondayToWeekdays = () => {
    const mondaySlots = slots.filter((s) => s.day_of_week === 1);
    if (mondaySlots.length === 0) return;
    
    // Keep weekend slots (0 and 6)
    const weekendSlots = slots.filter((s) => s.day_of_week === 0 || s.day_of_week === 6);
    
    // Create new weekday slots based on Monday
    const weekdaySlots: AvailabilitySlot[] = [];
    for (let day = 1; day <= 5; day++) {
      mondaySlots.forEach((ms) => {
        weekdaySlots.push({ ...ms, day_of_week: day, id: undefined });
      });
    }
    
    setSlots([...weekendSlots, ...weekdaySlots]);
  };

  return (
    <div className="w-full bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="px-10 pt-10 pb-6">
        <h2 className="text-3xl font-black text-[#111827] tracking-tight mb-2">
          {initialData ? 'Edit Event Type' : 'Create New Event Type'}
        </h2>
        <p className="text-slate-500 font-medium">Configure how guests book time with you.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-10 space-y-12">
        <form id="event-type-form" onSubmit={handleSubmit} className="space-y-10">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[13px] font-bold flex items-center gap-3 border border-red-100">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          {/* Basic Info Section */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Event Name</label>
              <input 
                type="text"
                required
                className="w-full h-14 px-5 rounded-2xl bg-[#f8f9fb] border-2 border-transparent focus:border-[#5C6EFF]/20 focus:bg-white transition-all text-sm font-bold placeholder:text-slate-300 shadow-sm"
                placeholder="e.g. 15 Minute Meeting"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              {fieldErrors.title && <p className="text-xs text-red-50 font-bold ml-1">{fieldErrors.title}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Duration</label>
                <div className="relative group">
                  <select 
                    className="w-full h-14 px-5 rounded-2xl bg-[#f8f9fb] border-2 border-transparent focus:border-[#5C6EFF]/20 focus:bg-white text-sm font-bold appearance-none cursor-pointer transition-all shadow-sm"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:scale-110 transition-transform">expand_more</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Location</label>
                <div className="relative group">
                  <select 
                    className="w-full h-14 px-5 rounded-2xl bg-[#f8f9fb] border-2 border-transparent focus:border-[#5C6EFF]/20 focus:bg-white text-sm font-bold appearance-none cursor-pointer transition-all shadow-sm"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  >
                    {[
                      { value: 'Google Meet', key: 'google_meet' },
                      { value: 'Zoom', key: 'zoom' },
                      { value: 'Microsoft Teams', key: 'teams' },
                      { value: 'Phone Call', key: 'phone' },
                      { value: 'In-person Meeting', key: 'in_person' }
                    ].map(opt => {
                      const integrationStatus = locationDefaults?.integrations[opt.key];
                      const isConnected = integrationStatus?.connected ?? (opt.key === 'phone' || opt.key === 'in_person' || connectedIntegrations.has(opt.key));
                      const suffix = (opt.key !== 'phone' && opt.key !== 'in_person') && !isConnected ? ' (Connect first)' : (isConnected && opt.key !== 'phone' && opt.key !== 'in_person' ? ' (Connected)' : '');
                      
                      return (
                        <option key={opt.value} value={opt.value}>
                          {opt.value}{suffix}
                        </option>
                      );
                    })}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:scale-110 transition-transform">expand_more</span>
                </div>
              </div>
            </div>

            {/* Meeting Type Selection */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700 ml-1">Meeting Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, kind: 'one_on_one' })}
                  className={cn(
                    "flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all group",
                    formData.kind === 'one_on_one' || !formData.kind
                      ? "bg-indigo-50/50 border-[#5C6EFF] shadow-md shadow-indigo-500/5"
                      : "bg-[#f8f9fb] border-transparent hover:border-slate-200"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                    formData.kind === 'one_on_one' || !formData.kind
                      ? "bg-[#5C6EFF] text-white rotate-3"
                      : "bg-white text-slate-400 group-hover:rotate-3"
                  )}>
                    <span className="material-symbols-outlined text-2xl">person</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-900">1:1 Meeting</p>
                    <p className="text-[11px] font-bold text-slate-400">One person can book</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, kind: 'group' })}
                  className={cn(
                    "flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all group",
                    formData.kind === 'group'
                      ? "bg-indigo-50/50 border-[#5C6EFF] shadow-md shadow-indigo-500/5"
                      : "bg-[#f8f9fb] border-transparent hover:border-slate-200"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                    formData.kind === 'group'
                      ? "bg-[#5C6EFF] text-white rotate-3"
                      : "bg-white text-slate-400 group-hover:rotate-3"
                  )}>
                    <span className="material-symbols-outlined text-2xl">group</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-900">Group Meeting</p>
                    <p className="text-[11px] font-bold text-slate-400">Multiple people can book</p>
                  </div>
                </button>
              </div>
            </div>


            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Description</label>
              <textarea 
                className="w-full h-32 p-5 rounded-2xl bg-[#f8f9fb] border-2 border-transparent focus:border-[#5C6EFF]/20 focus:bg-white transition-all text-sm font-bold placeholder:text-slate-300 resize-none shadow-sm"
                placeholder="Write a summary and any details your invitee should know before the meeting."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Working Hours Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-[#111827] tracking-tight">Working Hours</h3>
              <p className="text-xs font-bold text-[#5C6EFF] uppercase tracking-wider">Recurring Schedule</p>
            </div>
            <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-2">
              <ScheduleEditor 
                slots={slots} 
                onUpdate={setSlots}
                onApplyMondayToWeekdays={handleApplyMondayToWeekdays}
              />
            </div>
          </div>

        </form>
      </div>

      {/* Sticky Footer */}
      <div className="px-10 py-8 bg-[#f8f9fb] border-t border-slate-100 flex items-center justify-between gap-4">
        <button 
          type="button"
          onClick={onCancel}
          className="px-8 h-14 rounded-2xl text-sm font-bold text-slate-500 hover:text-slate-900 transition-all hover:bg-slate-100/50"
        >
          Discard Changes
        </button>
        <button 
          type="submit"
          form="event-type-form"
          disabled={isLoading}
          className="px-10 h-14 bg-gradient-to-br from-[#5C6EFF] to-[#A78BFA] text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-3"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{initialData ? 'Update Event Type' : 'Create Event Type'}</span>
          )}
        </button>
      </div>
    </div>
  );
}
