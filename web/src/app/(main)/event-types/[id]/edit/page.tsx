'use client';

import { useParams, useRouter } from 'next/navigation';
import { EventTypeForm } from '@/components/events/event-type-form';
import { useEventType } from '@/lib/hooks/use-event-types';
import SettingsSkeleton from '@/components/skeletons/SettingsSkeleton';

export default function EditEventTypePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { eventType, isLoading, isError } = useEventType(id);

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  if (isError || !eventType) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[13px] font-bold flex items-center gap-3 border border-red-100">
          <span className="material-symbols-outlined text-lg">error</span>
          Failed to load event type.
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button 
            onClick={() => router.push('/events')}
            className="text-[#5C6EFF] text-sm font-bold hover:underline"
          >
            Return to Events
          </button>
          <span className="text-slate-300">|</span>
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-[#5C6EFF] text-sm font-bold hover:underline"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <EventTypeForm 
        onCancel={() => router.push('/events')} 
        onSuccess={() => router.push('/events')} 
        initialData={eventType}
      />
    </div>
  );
}
