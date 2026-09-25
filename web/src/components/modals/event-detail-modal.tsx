'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useModalStore } from '@/store/modalStore';
import { useAuthStore } from '@/store/authStore';
import { useMeetings } from '@/lib/hooks/use-meetings';
import { apiClient } from '@/services/apiClient';
import { format } from 'date-fns';
import { formatInTimezone } from '@/lib/date-utils';
import { useQueryClient } from '@tanstack/react-query';
import { mutate as globalMutate } from 'swr';

export default function EventDetailModal() {
  const { user } = useAuthStore();
  const { 
    isEventDetailOpen, 
    selectedEvent, 
    closeEventDetail, 
    openEditEventModal,
    openConfirmation 
  } = useModalStore();
  const { mutate } = useMeetings();
  const queryClient = useQueryClient();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isEventDetailOpen && selectedEvent) {
      setActionError(null);
      setCopyStatus(null);
    }
  }, [isEventDetailOpen, selectedEvent]);

  const normalizeExternalUrl = (value: string): string | null => {
    const raw = value.trim();
    if (!raw) return null;

    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^meet\.google\.com\//i.test(raw)) return `https://${raw}`;
    if (/^zoom\.us\//i.test(raw)) return `https://${raw}`;
    if (/^teams\.microsoft\.com\//i.test(raw)) return `https://${raw}`;
    if (/^slack:\/\//i.test(raw)) return raw;

    return null;
  };

  const locationPresentation = useMemo(() => {
    const raw = (selectedEvent?.location || '').trim();
    const link = ((selectedEvent as { meeting_link?: string })?.meeting_link || '').trim();
    const lower = raw.toLowerCase();

    const resolvedExternalUrl = (() => {
      const normalizedMeetingLink = normalizeExternalUrl(link);
      if (normalizedMeetingLink) return normalizedMeetingLink;

      const normalizedRaw = normalizeExternalUrl(raw);
      if (normalizedRaw) return normalizedRaw;

      if (lower.includes('google meet') || lower.includes('meet.google.com')) return 'https://meet.google.com/';
      if (lower.includes('zoom')) return 'https://zoom.us/';
      if (lower.includes('teams') || lower.includes('microsoft teams')) return 'https://teams.microsoft.com/';
      if (lower.includes('slack')) return 'https://app.slack.com/client';

      return null;
    })();

    if (!raw) {
      return {
        title: 'No Location',
        value: 'Add a location by editing',
        icon: 'location_off',
        isLink: false,
        href: null,
      };
    }

    if (lower.includes('google meet')) {
      return {
        title: 'Google Meet',
        value: link || raw,
        icon: 'videocam',
        isLink: true,
        href: resolvedExternalUrl,
        canCopy: !!resolvedExternalUrl,
        copyValue: resolvedExternalUrl,
      };
    }
    if (lower.includes('zoom')) {
      return {
        title: 'Zoom',
        value: link || raw,
        icon: 'videocam',
        isLink: true,
        href: resolvedExternalUrl,
        canCopy: !!resolvedExternalUrl,
        copyValue: resolvedExternalUrl,
      };
    }
    if (lower.includes('teams') || lower.includes('microsoft teams')) {
      return { title: 'Microsoft Teams', value: link || raw, icon: 'groups', isLink: true, href: resolvedExternalUrl, canCopy: false, copyValue: '' };
    }
    if (lower.includes('slack')) {
      return { title: 'Slack', value: link || raw, icon: 'chat', isLink: true, href: resolvedExternalUrl, canCopy: false, copyValue: '' };
    }
    if (lower.includes('phone')) return { title: 'Phone Call', value: raw, icon: 'call', isLink: false, href: null, canCopy: false, copyValue: '' };
    if (lower.includes('offline') || lower.includes('in-person')) return { title: 'In-person', value: raw, icon: 'location_on', isLink: false, href: null, canCopy: false, copyValue: '' };

    return {
      title: 'Location',
      value: raw,
      icon: 'place',
      isLink: !!resolvedExternalUrl,
      href: resolvedExternalUrl,
      canCopy: false,
      copyValue: '',
    };
  }, [selectedEvent]);

  const copyMeetingLink = async () => {
    if (!locationPresentation.canCopy || !locationPresentation.copyValue) return;

    try {
      await navigator.clipboard.writeText(locationPresentation.copyValue);
      setCopyStatus('Meeting link copied');
      window.setTimeout(() => setCopyStatus(null), 1800);
    } catch {
      setCopyStatus('Unable to copy link');
      window.setTimeout(() => setCopyStatus(null), 1800);
    }
  };

  const isHost = user?.id === selectedEvent?.user_id;
  const organizerEmail = selectedEvent?.organizer?.email || '';
  const organizerName = selectedEvent?.organizer?.name || organizerEmail.split('@')[0] || 'Organizer';
  const organizerInitial = organizerName.charAt(0).toUpperCase();
  const organizerAvatar = selectedEvent?.organizer?.avatar_url;
  const isCancelledEvent = selectedEvent?.status === 'cancelled';
  const isCompletedEvent = selectedEvent?.status === 'completed';
  const isPastEvent = new Date(selectedEvent?.end_time || '').getTime() <= Date.now();
  const isFutureEvent = !isPastEvent;
  const isRescheduledEvent = !!selectedEvent?.rescheduled || !!selectedEvent?.previous_start_time;
  const canTakePastActions = selectedEvent?.status === 'scheduled' && isPastEvent && !isRescheduledEvent;
  const canTakeFutureActions = selectedEvent?.status === 'scheduled' && isFutureEvent && !isRescheduledEvent;
  const canRestoreFutureCancelled = selectedEvent?.status === 'cancelled' && isFutureEvent;
  const statusLabel = (status?: string) => {
    if (!status) return 'Scheduled';
    if (status === 'no-shows') return 'No-show';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  const statusChipClass = (() => {
    if (isCancelledEvent) return 'bg-rose-50 rounded-full border border-rose-100/50';
    if (isCompletedEvent) return 'bg-sky-50 rounded-full border border-sky-100/50';
    if (selectedEvent?.status === 'no-shows') return 'bg-amber-50 rounded-full border border-amber-100/50';
    return 'bg-[#EEF0FF] rounded-full border border-indigo-100/50';
  })();

  if (!isEventDetailOpen || !selectedEvent) return null;

  const refreshEventViews = async () => {
    await Promise.all([
      mutate(),
      globalMutate((key) => typeof key === 'string' && key.startsWith('/events')),
      globalMutate((key) => typeof key === 'string' && key.startsWith('/dashboard/stats')),
      queryClient.invalidateQueries({ queryKey: ['contact-events'] }),
    ]);
  };

  const handleReschedule = () => {
    if (isCancelledEvent || isCompletedEvent || isRescheduledEvent) return;
    openEditEventModal(selectedEvent);
    closeEventDetail();
  };

  const performStatusUpdate = async (nextStatus: 'completed' | 'cancelled' | 'scheduled') => {
    setIsProcessing(true);
    try {
      const resp = await apiClient.patch(`/events/${selectedEvent.id}`, { event: { status: nextStatus } });
      if (!resp.success) throw new Error(resp.error?.message);
      await refreshEventViews();
      closeEventDetail();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateStatus = (nextStatus: 'completed' | 'cancelled' | 'scheduled') => {
    const isRestore = nextStatus === 'scheduled';
    openConfirmation({
      title: nextStatus === 'completed' ? 'Mark as Done?' : isRestore ? 'Restore Call?' : 'Cancel Call?',
      message: nextStatus === 'completed'
        ? 'This will mark the call as completed.'
        : isRestore
        ? 'This will reactivate the call and set it back to scheduled.'
        : 'This will cancel the call and notify attendees.',
      confirmLabel: nextStatus === 'completed' ? 'Mark as Done' : isRestore ? 'Restore' : 'Cancel',
      variant: isRestore ? 'info' : nextStatus === 'completed' ? 'info' : 'danger',
      onConfirm: () => {
        void performStatusUpdate(nextStatus);
      },
    });
  };

  const handlePastCancelAction = () => {
    openConfirmation({
      title: 'Do you want to reschedule?',
      message: 'Do you want to reschedule?',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      variant: 'warning',
      onConfirm: handleReschedule,
      onCancel: () => {
        void performStatusUpdate('cancelled');
      },
    });
  };

  const handleDelete = () => {
    openConfirmation({
      title: 'Delete Meeting?',
      message: 'This will permanently remove the meeting from your calendar. This action cannot be undone.',
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const resp = await apiClient.delete(`/events/${selectedEvent.id}`);
          if (!resp.success) throw new Error(resp.error?.message);
          await mutate();
          closeEventDetail();
        } catch (err) {
          setActionError(err instanceof Error ? err.message : 'Deletion failed');
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] cursor-pointer" onClick={closeEventDetail} />
      
      <div className="relative w-full max-w-[420px] bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Top Header */}
          <div className="p-6 pb-2 flex items-center justify-between">
           <div className="flex items-center space-x-2">
             <div className={`flex items-center space-x-2 px-3 py-1 ${statusChipClass} ${isRescheduledEvent && !isCancelledEvent && !isCompletedEvent ? 'bg-amber-50 border-amber-100/50' : ''}`}>
               <span className="material-symbols-outlined text-[14px]" style={{color: isCancelledEvent ? '#dc2626' : isCompletedEvent ? '#0284c7' : isRescheduledEvent ? '#b45309' : '#3649db'}}>event</span>
               <span className={"text-[9px] font-bold uppercase tracking-widest " + (isCancelledEvent ? 'text-rose-600' : isCompletedEvent ? 'text-sky-700' : isRescheduledEvent ? 'text-amber-700' : selectedEvent?.status === 'no-shows' ? 'text-amber-700' : 'text-[#3649db]')}>{isCancelledEvent ? 'Cancelled' : isCompletedEvent ? 'Completed' : isRescheduledEvent ? 'Rescheduled' : statusLabel(selectedEvent.status)}</span>
             </div>
           </div>
           <div className="flex items-center space-x-2">
              {selectedEvent.status === 'scheduled' && isHost && (
                <button 
                  onClick={handleDelete}
                  className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-300 hover:text-rose-500 transition-colors"
                  title="Delete Meeting"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              )}
              <button 
                onClick={closeEventDetail}
                className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
           </div>
        </div>

        <div className="overflow-y-auto px-6 space-y-6 pb-8 thin-scrollbar flex-1">
          {/* Title Area */}
          <div className="space-y-4">
            <h1 className={"text-xl font-bold leading-tight tracking-tight " + (isCancelledEvent ? 'text-slate-400 line-through' : 'text-slate-900')}>{selectedEvent.title}</h1>

            <div className="flex items-center space-x-3 text-slate-500">
              <span className="material-symbols-outlined text-[20px] text-[#3649db]">schedule</span>
              <span className="text-[13px] font-bold">
                {formatInTimezone(new Date(selectedEvent.start_time), 'EEEE, MMM d • h:mm a', user?.timezone)} - {formatInTimezone(new Date(selectedEvent.end_time), 'h:mm a', user?.timezone)}
              </span>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Location</h4>
            {locationPresentation.isLink && locationPresentation.href ? (
              <div className="flex items-center justify-between p-3.5 bg-[#f8f9fb] rounded-xl border border-slate-100/50 hover:bg-white transition-colors">
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-9 h-9 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-[#3649db]">{locationPresentation.icon}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold text-slate-900 leading-tight">{locationPresentation.title}</span>
                    <span className="text-[11px] font-medium text-slate-400 truncate">{locationPresentation.value}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {locationPresentation.canCopy && (
                    <button
                      onClick={copyMeetingLink}
                      className="p-2 hover:bg-white rounded-lg text-[#3649db] transition-colors"
                      title="Copy link"
                    >
                      <span className="material-symbols-outlined text-[20px]">content_copy</span>
                    </button>
                  )}
                  <a
                    href={locationPresentation.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-white rounded-lg text-[#3649db] transition-colors"
                    title="Open link"
                  >
                    <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 bg-[#f8f9fb] rounded-xl border border-slate-100/50">
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-9 h-9 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-[#3649db]">{locationPresentation.icon}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold text-slate-900 leading-tight">{locationPresentation.title}</span>
                    <span className="text-[11px] font-medium text-slate-400 truncate">{locationPresentation.value}</span>
                  </div>
                </div>
              </div>
            )}
            {copyStatus && (
              <p className="text-[10px] font-bold text-emerald-600 pl-1">{copyStatus}</p>
            )}
          </div>

          {/* Attendees */}
          <div className="space-y-3">
             <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Attendees</h4>
             
             <div className="space-y-2">
                <div className="flex items-center space-x-3 p-2.5 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden relative">
                    {organizerAvatar ? (
                      <Image src={organizerAvatar} alt={organizerName} fill className="object-cover" />
                    ) : (
                      organizerInitial
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-slate-900 leading-none">{organizerName}</span>
                    <span className="text-[10px] font-medium text-slate-400 mt-1">{organizerEmail} • Organizer {isHost ? '(You)' : ''}</span>
                  </div>
                </div>

                {/* Others */}
                {(selectedEvent.attendees || []).map((attendee, idx) => {
                   const isMe = attendee.email.toLowerCase() === user?.email.toLowerCase();
                   return (
                     <div key={attendee.email || idx} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-colors group">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-[10px] font-bold overflow-hidden relative">
                            {attendee.avatar_url ? (
                              <Image src={attendee.avatar_url} alt={attendee.name || attendee.email} fill className="object-cover" />
                            ) : (
                              (attendee.name || attendee.email || 'A').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[12px] font-bold text-slate-900 leading-none">{attendee.name || attendee.email}</span>
                            <span className="text-[10px] font-medium text-slate-400 mt-1">{attendee.email} {isMe ? '• (You)' : ''}</span>
                          </div>
                        </div>
                     </div>
                   );
                })}

             </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Description / Notes</h4>
            <div className="p-4 bg-[#f8f9fb] rounded-2xl border border-slate-50">
              <p className="text-[12px] font-medium text-slate-600 leading-relaxed opacity-80">
                {selectedEvent.description || "No specific notes provided for this meeting."}
              </p>
            </div>
          </div>
        </div>

        {isHost && (
          <div className="p-6 pt-2 bg-white border-t border-slate-50 space-y-3">
            {actionError && (
              <div className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-bold border border-rose-100 flex items-center space-x-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{actionError}</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {canTakePastActions && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateStatus('completed')}
                    disabled={isProcessing}
                    className="h-12 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-[18px] text-[12px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                  >
                    Mark as Done
                  </button>
                  <button
                    onClick={handlePastCancelAction}
                    disabled={isProcessing}
                    className="h-12 border-2 border-rose-100 hover:border-rose-200 text-rose-500 rounded-[18px] text-[12px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                  >
                    Mark as Cancel
                  </button>
                </div>
              )}

              {canTakeFutureActions && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateStatus('cancelled')}
                    disabled={isProcessing}
                    className="h-12 border-2 border-rose-100 hover:border-rose-200 text-rose-500 rounded-[18px] text-[12px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReschedule}
                    disabled={isProcessing}
                    className="h-12 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-[18px] text-[12px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                  >
                    Reschedule
                  </button>
                </div>
              )}

              {canRestoreFutureCancelled && (
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => updateStatus('scheduled')}
                    disabled={isProcessing}
                    className="h-12 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-[18px] text-[12px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
