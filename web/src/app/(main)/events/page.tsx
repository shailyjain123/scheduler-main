'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/services/apiClient';
import { EventType } from '@/lib/types/event';
import { EventTypeCard } from '@/components/events/event-type-card';
import EventTypeListSkeleton from '@/components/skeletons/EventCardSkeleton';
export default function EventsPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchEventTypes = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<{ event_types: EventType[] }>('/event_types');
      if (response.success && response.data) {
        setEventTypes(response.data.event_types);
      }
    } catch (err) {
      console.error('Failed to fetch event types', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEventTypes();
  }, []);

  const handleEdit = (et: EventType) => {
    router.push(`/event-types/${et.id}/edit`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event type?')) return;

    try {
      const response = await apiClient.delete(`/event_types/${id}`);
      if (response.success) {
        setEventTypes(prev => prev.filter(et => et.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete event type', err);
    }
  };

  const handleCreate = () => {
    router.push('/event-types/create');
  };


  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors text-[13px] font-semibold shadow-sm">
            Sort by <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
          </button>
          <button
            onClick={handleCreate}
            className="bg-[#5C6EFF] hover:bg-[#3649db] text-white px-6 h-11 rounded-xl font-bold text-[13px] uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-[#5C6EFF]/20"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Event Type
          </button>
        </div>
      </div>
      {isLoading ? (
        <EventTypeListSkeleton count={4} />
      ) : eventTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-dashed border-[#e1e2e4]">
          <div className="w-24 h-24 rounded-full bg-[#f0f2ff] flex items-center justify-center mb-8 border border-[#e8ebff]">
            <span className="material-symbols-outlined text-4xl text-[#5C6EFF] animate-bounce">rocket_launch</span>
          </div>
          <h2 className="text-2xl font-bold text-[#1a1b1e] mb-2 tracking-tight">No event types yet</h2>
          <p className="text-[#757686] font-medium text-[15px] max-w-[320px] text-center mb-10 leading-relaxed">
            Start by creating your first booking link. We&apos;ll handle the timezones and overlap logic for you.
          </p>
          <button
            onClick={handleCreate}
            className="text-[#5C6EFF] font-bold text-[13px] uppercase tracking-widest border-b-2 border-[#5C6EFF]/20 hover:border-[#5C6EFF] pb-1 transition-all"
          >
            Setup your first link
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {eventTypes
            .map(et => (
              <EventTypeCard
                key={et.id}
                eventType={et}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
        </div>
      )}
    </div>
  );
}
