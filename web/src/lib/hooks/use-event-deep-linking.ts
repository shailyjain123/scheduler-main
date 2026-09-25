'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useModalStore } from '@/store/modalStore';
import { Event } from '@/lib/types/event';
import { apiClient } from '@/services/apiClient';

export function useEventDeepLinking(meetings: Event[] | null) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openEventDetail, openEditEventModal } = useModalStore();
  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!meetings || meetings.length === 0) return;

    const eventId = searchParams.get('event');
    const action = searchParams.get('action');

    if (!eventId) return;

    // Prevent double processing in the same session
    const processingKey = `${eventId}:${action}`;
    if (processedRef.current === processingKey) return;

    const event = meetings.find((m) => m.id.toString() === eventId);
    if (!event) return;

    processedRef.current = processingKey;

    if (action === 'reschedule') {
      openEditEventModal(event);
    } else if (action === 'cancel') {
      // Open detail first so background is consistent
      openEventDetail(event);
      
      // Then trigger cancellation confirmation
      openConfirmation({
        title: 'Cancel Call?',
        message: 'This will cancel the call and notify attendees.',
        confirmLabel: 'Cancel',
        variant: 'danger',
        onConfirm: async () => {
          try {
            const resp = await apiClient.patch(`/events/${event.id}`, { 
              event: { status: 'cancelled' } 
            });
            if (resp.success) {
              window.location.reload();
            }
          } catch (err) {
            console.error('Failed to cancel event via deep link', err);
          }
        },
      });
    } else {
      openEventDetail(event);
    }

    // Clean up URL after processing
    const params = new URLSearchParams(searchParams.toString());
    params.delete('event');
    params.delete('action');
    const newQuery = params.toString();
    router.replace(`${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`, { scroll: false });

  }, [meetings, searchParams, openEventDetail, openEditEventModal, router]);
}
