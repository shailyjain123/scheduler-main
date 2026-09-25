'use client';

import { useRouter } from 'next/navigation';
import { EventTypeForm } from '@/components/events/event-type-form';

export default function CreateEventTypePage() {
  const router = useRouter();

  return (
    <div className="py-2">
      <EventTypeForm 
        onCancel={() => router.push('/events')} 
        onSuccess={() => router.push('/events')} 
      />
    </div>
  );
}
