'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useModalStore } from '@/store/modalStore';
import { useAuthStore } from '@/store/authStore';
import { useEvents } from '@/lib/hooks/use-events';
import { apiClient } from '@/services/apiClient';
import { useToastStore } from '@/store/toastStore';
import { useQueryClient } from '@tanstack/react-query';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getPhoneValidationError, phoneSchema } from '@/lib/utils/validation';
import PhoneInputField from '@/components/ui/phone-input';
import { useLocationDefaults } from '@/lib/hooks/use-location-defaults';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Invitee = { name: string; email: string; avatar?: string };
type LocationOption = {
  value: string;
  integrationKey?: string;
  integrationLabel?: string;
};
type RawAttendee = { 
  full_name?: string; 
  name?: string; 
  email: string; 
  user_id?: number; 
  avatar_url?: string; 
  image_url?: string;
  avatar?: string;
};

const pad2 = (value: number) => value.toString().padStart(2, '0');

const formatDateInputLocal = (value: Date) => {
  const year = value.getFullYear();
  const month = pad2(value.getMonth() + 1);
  const day = pad2(value.getDate());
  return `${year}-${month}-${day}`;
};

const formatTimeInputLocal = (value: Date) => {
  const hours = pad2(value.getHours());
  const minutes = pad2(value.getMinutes());
  return `${hours}:${minutes}`;
};

const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_INPUT_RE = /^\d{2}:\d{2}$/;
const CONTACT_EVENTS_QUERY_KEY = ['contact-events'];

const safeDateInputValue = (value: unknown, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return DATE_INPUT_RE.test(normalized) ? normalized : fallback;
};

const safeTimeInputValue = (value: unknown, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return TIME_INPUT_RE.test(normalized) ? normalized : fallback;
};

export default function CreateEventModal() {
  const { 
    isCreateEventModalOpen, 
    isEditMode, 
    editingEvent, 
    createEventPrefill,
    createEventDefaultInvitee,
    closeCreateEventModal 
  } = useModalStore();
  const { user, token } = useAuthStore();
  const { events, mutate: refreshEvents } = useEvents();
  const pushToast = useToastStore((state) => state.pushToast);
  const queryClient = useQueryClient();
  const { data: locationDefaults, isLoading: isLoadingDefaults, getLabel } = useLocationDefaults();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('60');
  const [location, setLocation] = useState('Zoom');
  const [date, setDate] = useState(formatDateInputLocal(new Date()));
  const [time, setTime] = useState(formatTimeInputLocal(new Date()));
  const [guests, setGuests] = useState<Invitee[]>([]);
  const [guestInput, setGuestInput] = useState('');
  const [debouncedGuestInput, setDebouncedGuestInput] = useState('');
  const [remoteInvitees, setRemoteInvitees] = useState<Invitee[]>([]);
  const [isInviteeSearchLoading, setIsInviteeSearchLoading] = useState(false);
  const [isInviteeDropdownOpen, setIsInviteeDropdownOpen] = useState(false);
  const [activeInviteeIndex, setActiveInviteeIndex] = useState(0);
  const [inviteePhone, setInviteePhone] = useState('');
  const [inviteePhoneError, setInviteePhoneError] = useState('');
  const [inPersonLocation, setInPersonLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationGuardMessage, setLocationGuardMessage] = useState<string | null>(null);
  const [actionableIntegrationKey, setActionableIntegrationKey] = useState<string | null>(null);
  const inviteesInputRef = useRef<HTMLInputElement>(null);
  const inviteeComboboxRef = useRef<HTMLDivElement>(null);

  const isPhoneValid = useMemo(() => {
    if (location !== 'Phone Call') return true;
    return phoneSchema.safeParse(inviteePhone).success;
  }, [inviteePhone, location]);

  const integrationConnectConfig: Record<string, { provider: string; label: string }> = useMemo(
    () => ({
      google_meet: { provider: 'google', label: 'Google Meet' },
      zoom: { provider: 'zoom', label: 'Zoom' },
      teams: { provider: 'microsoft', label: 'Microsoft Teams' },
      outlook: { provider: 'microsoft', label: 'Outlook' },
      slack: { provider: 'slack', label: 'Slack' },
    }),
    []
  );

  const connectedIntegrations = useMemo(() => {
    const connected = Array.isArray(user?.integrations?.connected)
      ? user.integrations.connected
      : [];

    return new Set(connected.map((integration) => integration.toString()));
  }, [user?.integrations]);

  const locationOptions: LocationOption[] = useMemo(() => [
    { value: 'Google Meet', integrationKey: 'google_meet', integrationLabel: 'Google Meet' },
    { value: 'Zoom', integrationKey: 'zoom', integrationLabel: 'Zoom Video' },
    { value: 'Microsoft Teams', integrationKey: 'teams', integrationLabel: 'Microsoft Teams' },
    { value: 'Phone Call' },
    { value: 'In-person Meeting' },
  ], []);

  const integrationRequirementByLocation = useMemo(() => {
    return locationOptions.reduce((acc, option) => {
      if (option.integrationKey) {
        acc[option.value] = option;
      }
      return acc;
    }, {} as Record<string, LocationOption>);
  }, [locationOptions]);

  const handleLocationChange = (nextLocation: string) => {
    const requirement = integrationRequirementByLocation[nextLocation];

    if (requirement?.integrationKey && !connectedIntegrations.has(requirement.integrationKey)) {
      setLocationGuardMessage(`Connect ${requirement.integrationLabel || requirement.value} integration first, then select this location.`);
      setActionableIntegrationKey(requirement.integrationKey);
      return;
    }

    setLocation(nextLocation);
    setLocationGuardMessage(null);
    setActionableIntegrationKey(null);
    setError(null);
  };

  const connectIntegration = (integrationKey: string) => {
    const config = integrationConnectConfig[integrationKey];
    if (!config) return;

    const currentToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!currentToken) {
      setError('Session expired. Please login again before connecting integrations.');
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) {
      setError('Environment is missing NEXT_PUBLIC_API_URL.');
      return;
    }
    const url = `${apiBase}/api/v1/auth/${config.provider}/authorize?origin=meetings&token=${encodeURIComponent(currentToken)}&integration=${encodeURIComponent(integrationKey)}`;
    window.location.href = url;
  };

  useEffect(() => {
    if (!isCreateEventModalOpen) return;

    if (isEditMode && editingEvent) {
      const start = new Date(editingEvent.start_time);
      const end = new Date(editingEvent.end_time);
      const dur = Math.round((end.getTime() - start.getTime()) / 60000);
      const now = new Date();
      const safeDate = Number.isNaN(start.getTime()) ? formatDateInputLocal(now) : formatDateInputLocal(start);
      const safeTime = Number.isNaN(start.getTime()) ? formatTimeInputLocal(now) : formatTimeInputLocal(start);

      setTitle(editingEvent.title || '');
      setDescription(editingEvent.description || '');
      setDuration(dur.toString());
      setDate(safeDate);
      setTime(safeTime);
      
      const rawLocation = editingEvent.location || 'Zoom';
      const isPredefined = locationOptions.some(o => o.value === rawLocation);
      
      if (isPredefined) {
        setLocation(rawLocation);
      } else if (rawLocation.includes('+')) {
        setLocation('Phone Call');
        setInviteePhone(rawLocation.trim());
      } else {
        setLocation('In-person Meeting');
        setInPersonLocation(rawLocation);
      }

      const attendees = (editingEvent.attendees || []).map((a: RawAttendee) => ({
        name: a.name || a.full_name || a.email.split('@')[0],
        email: a.email
      }));
      setGuests(attendees.filter(a => a.email.toLowerCase() !== user?.email?.toLowerCase()));
      setError(null);
      setLocationGuardMessage(null);
      setActionableIntegrationKey(null);
      return;
    }

    setTitle('');
    setDescription('');
    setDuration('60');
    
    // Set default location based on connected integrations
    if (locationDefaults?.recommended_default) {
      setLocation(getLabel(locationDefaults.recommended_default.type));
    } else {
      setLocation('Zoom');
    }
    
    setGuests(createEventDefaultInvitee ? [createEventDefaultInvitee] : []);
    setGuestInput('');
    setDebouncedGuestInput('');
    setRemoteInvitees([]);
    setIsInviteeDropdownOpen(false);
    setActiveInviteeIndex(0);
    setInviteePhone('');
    setInviteePhoneError('');
    setInPersonLocation('');
    setLocationSuggestions([]);
    setError(null);
    setLocationGuardMessage(null);
    setActionableIntegrationKey(null);

    if (createEventPrefill) {
      const now = new Date();
      setDate(safeDateInputValue(createEventPrefill.date, formatDateInputLocal(now)));
      setTime(safeTimeInputValue(createEventPrefill.time, formatTimeInputLocal(now)));
      return;
    }

    const now = new Date();
    setDate(formatDateInputLocal(now));
    setTime(formatTimeInputLocal(now));
  }, [
    isCreateEventModalOpen,
    isEditMode,
    editingEvent,
    createEventPrefill,
    createEventDefaultInvitee,
    user?.email,
    locationOptions,
    locationDefaults
  ]);


  useEffect(() => {
    if (!isCreateEventModalOpen) return;

    const query = inPersonLocation.trim();
    if (location !== 'Offline (In-person meeting)' || query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    let cancelled = false;
    const fetchSuggestions = async () => {
      setIsSearchingLocation(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (!cancelled && Array.isArray(data)) {
          const uniqueSuggestions = Array.from(
            new Set(
              data
                .map((item: { display_name: string }) => item.display_name)
                .filter(Boolean)
            )
          );
          setLocationSuggestions(uniqueSuggestions);
        }
      } catch {
        if (!cancelled) {
          setLocationSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearchingLocation(false);
        }
      }
    };

    const timer = window.setTimeout(fetchSuggestions, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [inPersonLocation, location, isCreateEventModalOpen]);

  const knownInvitees = useMemo(() => {
    const unique = new Map<string, { name: string; email: string }>();

    if (user?.email) {
      unique.set(user.email.toLowerCase(), {
        name: user.full_name || user.email.split('@')[0],
        email: user.email,
      });
    }

    (events || []).forEach((event: { attendees?: RawAttendee[] }) => {
      (event.attendees || []).forEach((attendee: RawAttendee) => {
        if (!attendee?.email) return;
        const key = attendee.email.toLowerCase();
        if (!unique.has(key)) {
          unique.set(key, {
            name: attendee.name || attendee.full_name || attendee.email.split('@')[0],
            email: attendee.email,
          });
        }
      });
    });

    return Array.from(unique.values());
  }, [events, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedGuestInput(guestInput.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [guestInput]);

  useEffect(() => {
    const query = debouncedGuestInput;

    if (!isInviteeDropdownOpen || query.length < 3) {
      setRemoteInvitees([]);
      setIsInviteeSearchLoading(false);
      return;
    }

    let cancelled = false;

    const fetchUsers = async () => {
      setIsInviteeSearchLoading(true);

      try {
        const response = await apiClient.get<{ users: RawAttendee[] }>(`/users?q=${encodeURIComponent(query)}&limit=12`);

        if (cancelled) return;

        const fetched = response?.success ? (response?.data?.users || []) : [];
        const normalized: Invitee[] = fetched
          .filter((u: RawAttendee) => u?.email)
          .map((u: RawAttendee) => ({
            name: (u.name || u.full_name || '').toString() || (u.email ? u.email.split('@')[0] : 'Unknown'),
            email: (u.email || '').toString(),
            avatar: u.avatar_url || u.image_url || undefined,
          }));


        setRemoteInvitees(normalized);
      } catch {
        if (!cancelled) {
          setRemoteInvitees([]);
        }
      } finally {
        if (!cancelled) {
          setIsInviteeSearchLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      cancelled = true;
    };
  }, [debouncedGuestInput, isInviteeDropdownOpen]);

  const selectedGuestEmails = useMemo(
    () => new Set(guests.map((g) => g.email.toLowerCase())),
    [guests]
  );

  const inviteeSuggestions = useMemo(() => {
    const query = debouncedGuestInput.toLowerCase();
    if (query.length < 3) return [];

    const mergedMap = new Map<string, Invitee>();
    [...knownInvitees, ...remoteInvitees].forEach((invitee) => {
      if (!invitee?.email) return;
      const emailKey = invitee.email.toLowerCase();
      if (selectedGuestEmails.has(emailKey)) return;

      if (
        invitee.name.toLowerCase().includes(query) ||
        invitee.email.toLowerCase().includes(query)
      ) {
        mergedMap.set(emailKey, invitee);
      }
    });

    return Array.from(mergedMap.values()).slice(0, 8);
  }, [debouncedGuestInput, knownInvitees, remoteInvitees, selectedGuestEmails]);

  useEffect(() => {
    setActiveInviteeIndex(0);
  }, [inviteeSuggestions.length, debouncedGuestInput]);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const addGuest = (invitee: Invitee) => {
    const normalized = invitee.email.toLowerCase();
    if (selectedGuestEmails.has(normalized)) return;

    setGuests((prev) => [...prev, invitee]);
    setGuestInput('');
    setDebouncedGuestInput('');
    setIsInviteeDropdownOpen(false);
    setActiveInviteeIndex(0);
    setError(null);
  };

  const addManualEmailGuest = (rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;

    if (!isValidEmail(value)) {
      setError('Please enter a valid email or choose from suggestions');
      return;
    }

    addGuest({
      name: value.split('@')[0],
      email: value,
    });
  };

  const commitGuestFromInput = (rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;

    const suggestion = knownInvitees.find(
      (item) => item.email.toLowerCase() === value.toLowerCase() || item.name.toLowerCase() === value.toLowerCase()
    );

    if (suggestion) {
      addGuest(suggestion);
      return;
    }

    addManualEmailGuest(value);
  };

  const removeGuest = (email: string) => {
    setGuests(prev => prev.filter(g => g.email !== email));
  };

  const handleInviteeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isInviteeDropdownOpen) setIsInviteeDropdownOpen(true);
      if (inviteeSuggestions.length > 0) {
        setActiveInviteeIndex((prev) => (prev + 1) % inviteeSuggestions.length);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isInviteeDropdownOpen) setIsInviteeDropdownOpen(true);
      if (inviteeSuggestions.length > 0) {
        setActiveInviteeIndex((prev) => (prev - 1 + inviteeSuggestions.length) % inviteeSuggestions.length);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();

      if (isInviteeDropdownOpen && inviteeSuggestions[activeInviteeIndex]) {
        addGuest(inviteeSuggestions[activeInviteeIndex]);
      } else {
        commitGuestFromInput(guestInput);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsInviteeDropdownOpen(false);
      return;
    }

    if (e.key === 'Backspace' && !guestInput.trim() && guests.length > 0) {
      removeGuest(guests[guests.length - 1].email);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const start = lowerText.indexOf(lowerQuery);

    if (start === -1) return text;

    const end = start + lowerQuery.length;

    return (
      <>
        {text.slice(0, start)}
        <mark className="bg-[#EEF0FF] text-[#3649db] px-0.5 rounded-sm">{text.slice(start, end)}</mark>
        {text.slice(end)}
      </>
    );
  };

  const handleSaveEvent = async () => {
    if (!title.trim()) {
      setError('Please enter an event name');
      return;
    }

    if (location === 'Offline (In-person meeting)' && !inPersonLocation.trim()) {
      setError('Please add a valid in-person location');
      return;
    }

    const locationRequirement = integrationRequirementByLocation[location];
    if (locationRequirement?.integrationKey && !connectedIntegrations.has(locationRequirement.integrationKey)) {
      setError(`Please connect ${locationRequirement.integrationLabel || locationRequirement.value} before creating this event.`);
      return;
    }

    if (location === 'Phone Call' && !inviteePhone.trim()) {
      setError('Please add invitee phone number for phone call meetings');
      return;
    }

    if (location === 'Phone Call') {
      const phoneError = getPhoneValidationError(inviteePhone);
      if (phoneError) {
        setError(phoneError);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const startTimeStr = `${date}T${time}:00`;
      const start_time = new Date(startTimeStr);
      const end_time = new Date(start_time.getTime() + parseInt(duration) * 60000);
      const eventTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const formatLocalDateTime = (value: Date) => {
        const yyyy = value.getFullYear();
        const mm = `${value.getMonth() + 1}`.padStart(2, '0');
        const dd = `${value.getDate()}`.padStart(2, '0');
        const hh = `${value.getHours()}`.padStart(2, '0');
        const min = `${value.getMinutes()}`.padStart(2, '0');
        const sec = `${value.getSeconds()}`.padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}`;
      };

      const finalLocation = location === 'Offline (In-person meeting)' ? inPersonLocation.trim() : location;
      const payload = {
        event: {
          title,
          description: description.trim(),
          location: location === 'Phone Call' ? inviteePhone.trim() : finalLocation,
          start_time: start_time.toISOString(),
          end_time: end_time.toISOString(),
          metadata: {
            attendees: guests,
            event_timezone: eventTimezone,
            event_local_start: formatLocalDateTime(start_time),
            event_local_end: formatLocalDateTime(end_time),
          }
        }
      };

      let response;
      if (isEditMode && editingEvent) {
        response = await apiClient.patch(`/events/${editingEvent.id}`, payload);
      } else {
        response = await apiClient.post('/events', {
          event: {
            ...payload.event,
            status: 'scheduled'
          }
        });
      }
      
      if (response.success) {
        const createdOrUpdatedEvent = response.data as Record<string, unknown> | undefined;

        if (createdOrUpdatedEvent && !isEditMode) {
          queryClient.setQueryData(CONTACT_EVENTS_QUERY_KEY, (current: unknown) => {
            const existing = Array.isArray(current) ? current as Array<Record<string, unknown>> : [];
            const nextId = createdOrUpdatedEvent.id;
            const deduped = existing.filter((eventItem) => eventItem?.id !== nextId);
            return [createdOrUpdatedEvent, ...deduped];
          });
        }

        await Promise.all([
          refreshEvents(),
          queryClient.invalidateQueries({ queryKey: CONTACT_EVENTS_QUERY_KEY }),
          queryClient.refetchQueries({ queryKey: CONTACT_EVENTS_QUERY_KEY, type: 'active' }),
        ]);
        pushToast(isEditMode ? 'Event updated' : 'Event created', 'success');
        closeCreateEventModal();
      } else {
        throw new Error(response.error?.message || 'Failed to save event');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isCreateEventModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer"
        onClick={closeCreateEventModal}
      />
      
      <div className="relative bg-white w-full max-w-lg rounded-[24px] shadow-2xl shadow-slate-900/20 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-5 pb-1">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Create New Event</h3>
          <button 
            onClick={closeCreateEventModal}
            className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors group"
          >
            <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-slate-900 transition-colors">close</span>
          </button>
        </div>

        <div className="p-5 pt-1 space-y-4 overflow-y-auto max-h-[80vh] thin-scrollbar">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold border border-red-100 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          {actionableIntegrationKey && integrationConnectConfig[actionableIntegrationKey] && (
            <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-[11px] font-bold border border-amber-200 flex items-center justify-between gap-3 animate-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-base">link</span>
                <span className="truncate">
                  {connectedIntegrations.has(actionableIntegrationKey)
                    ? `${integrationConnectConfig[actionableIntegrationKey].label} needs re-authorization.`
                    : `${integrationConnectConfig[actionableIntegrationKey].label} is not connected.`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => connectIntegration(actionableIntegrationKey)}
                className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white px-3 h-7 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors"
              >
                {connectedIntegrations.has(actionableIntegrationKey) ? 'Reconnect' : 'Connect'}
              </button>
            </div>
          )}

          <div>
            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Event Name</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Discovery Call"
              className="w-full bg-[#f8f9fb] border-none rounded-lg h-10 px-4 text-[13px] font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#5C6EFF]/10 outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add an optional meeting description"
              rows={4}
              className="w-full bg-[#f8f9fb] border-none rounded-lg px-4 py-3 text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#5C6EFF]/10 outline-none transition-all resize-y min-h-[96px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Duration</label>
              <div className="relative group">
                <select 
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-[#f8f9fb] border-none rounded-lg h-10 pl-4 pr-10 text-[13px] font-bold text-slate-900 appearance-none focus:ring-2 focus:ring-[#5C6EFF]/10 outline-none transition-all cursor-pointer"
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">expand_more</span>
              </div>
            </div>
            <div>
              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Location</label>
              <div className="relative group">
                <select 
                   value={location}
                   onChange={(e) => handleLocationChange(e.target.value)}
                   className="w-full bg-[#f8f9fb] border-none rounded-lg h-10 pl-10 pr-10 text-[13px] font-bold text-slate-900 appearance-none focus:ring-2 focus:ring-[#5C6EFF]/10 outline-none transition-all cursor-pointer"
                >
                  {locationOptions.map((option) => {
                    const integrationStatus = option.integrationKey ? locationDefaults?.integrations[option.integrationKey] : null;
                    const isConnected = integrationStatus?.connected ?? (option.integrationKey ? connectedIntegrations.has(option.integrationKey) : true);
                    const suffix = option.integrationKey && !isConnected ? ' (Connect first)' : (isConnected && option.integrationKey ? ' (Connected)' : '');

                    return (
                      <option key={option.value} value={option.value}>
                        {option.value}{suffix}
                      </option>
                    );
                  })}
                </select>
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 font-bold text-[18px]">videocam</span>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">expand_more</span>
              </div>
              {locationGuardMessage && (
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-[9px] font-bold text-amber-700">{locationGuardMessage}</p>
                  {actionableIntegrationKey && integrationConnectConfig[actionableIntegrationKey] && (
                    <button
                      type="button"
                      onClick={() => connectIntegration(actionableIntegrationKey)}
                      className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-[#5C6EFF] hover:text-[#4454d6]"
                    >
                      Connect
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {location === 'In-person Meeting' && (
            <div>
              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Add Location (Required)</label>
              <input
                type="text"
                value={inPersonLocation}
                onChange={(e) => setInPersonLocation(e.target.value)}
                placeholder="Search address or venue"
                className="w-full bg-[#f8f9fb] border-none rounded-lg h-10 px-4 text-[13px] font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#5C6EFF]/10 outline-none transition-all"
                list="in-person-location-suggestions"
              />
              <datalist id="in-person-location-suggestions">
                {locationSuggestions.map((suggestion, idx) => (
                  <option key={`${suggestion}-${idx}`} value={suggestion} />
                ))}
              </datalist>
              {isSearchingLocation && (
                <p className="text-[9px] font-bold text-slate-400 mt-1">Searching locations...</p>
              )}
            </div>
          )}

          {location === 'Phone Call' && (
            <div>
              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Invitee Phone Number (Required)</label>
              <PhoneInputField
                value={inviteePhone}
                onChange={(val) => {
                  setInviteePhone(val);
                  const error = getPhoneValidationError(val);
                  setInviteePhoneError(error || '');
                }}
                error={inviteePhoneError}
                disabled={isSubmitting}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Date</label>
              <div className="relative group">
                <input 
                  type="date" 
                  value={date || ''}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#f8f9fb] border-none rounded-lg h-10 pl-10 pr-4 text-[13px] font-bold text-slate-900 focus:ring-2 focus:ring-[#5C6EFF]/10 transition-all outline-none cursor-pointer [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" 
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] group-focus-within:text-[#5C6EFF] transition-colors pointer-events-none">calendar_today</span>
              </div>
            </div>
            <div>
              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Time</label>
              <div className="relative group">
                <input 
                  type="time" 
                  value={time || ''}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-[#f8f9fb] border-none rounded-lg h-10 pl-10 pr-4 text-[13px] font-bold text-slate-900 focus:ring-2 focus:ring-[#5C6EFF]/10 transition-all outline-none cursor-pointer [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" 
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] group-focus-within:text-[#5C6EFF] transition-colors pointer-events-none">schedule</span>
              </div>
            </div>
          </div>

          <div className="pb-1">
            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Invitees</label>
            <div
              ref={inviteeComboboxRef}
              onClick={() => inviteesInputRef.current?.focus()}
              className="relative min-h-[44px] bg-[#f8f9fb] border border-transparent focus-within:border-[#5C6EFF]/20 rounded-lg p-2 flex flex-wrap gap-2 transition-all cursor-text"
              role="combobox"
              aria-expanded={isInviteeDropdownOpen}
              aria-haspopup="listbox"
              aria-controls="invitee-suggestions-list"
            >
              {guests.map(guest => (
                <div key={guest.email} className="bg-white border border-slate-200 rounded-lg pr-1 pl-1.5 h-7 flex items-center space-x-2 shadow-sm animate-in zoom-in-95 duration-200">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[7px] font-bold text-slate-400 border border-white">
                      {guest.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 leading-none">{guest.name}</span>
                  </div>
                  <button 
                    onClick={() => removeGuest(guest.email)}
                    className="w-5 h-5 flex items-center justify-center hover:bg-red-50 rounded-md transition-colors group/x"
                  >
                    <span className="material-symbols-outlined text-[10px] text-slate-400 group-hover:text-red-500">close</span>
                  </button>
                </div>
              ))}
              <input 
                ref={inviteesInputRef}
                type="text" 
                placeholder="Add invitee (email or name)"
                value={guestInput}
                onChange={(e) => {
                  setGuestInput(e.target.value);
                  setIsInviteeDropdownOpen(true);
                }}
                onFocus={() => setIsInviteeDropdownOpen(true)}
                onKeyDown={handleInviteeInputKeyDown}
                onBlur={() => {
                  window.setTimeout(() => setIsInviteeDropdownOpen(false), 120);
                }}
                className="bg-transparent border-none focus:ring-0 text-[10px] font-bold text-slate-700 flex-1 min-w-[220px] h-7 px-1 placeholder:text-slate-400 outline-none relative z-[1]"
                aria-autocomplete="list"
                aria-controls="invitee-suggestions-list"
                aria-activedescendant={
                  isInviteeDropdownOpen && inviteeSuggestions[activeInviteeIndex]
                    ? `invitee-option-${activeInviteeIndex}`
                    : undefined
                }
              />

              {isInviteeDropdownOpen && (
                <div
                  id="invitee-suggestions-list"
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-[120] bg-white border border-[#e6e8ef] rounded-xl shadow-[0_14px_30px_rgba(17,24,39,0.12)] max-h-56 overflow-y-auto thin-scrollbar animate-in fade-in zoom-in-95 duration-150"
                >
                  {debouncedGuestInput.length < 3 ? (
                    <div className="px-3.5 py-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]">Type at least 3 characters</p>
                    </div>
                  ) : isInviteeSearchLoading ? (
                    <div className="px-3.5 py-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]">Searching users...</p>
                    </div>
                  ) : inviteeSuggestions.length > 0 ? (
                    inviteeSuggestions.map((invitee, idx) => {
                      const isActive = idx === activeInviteeIndex;
                      return (
                        <button
                          id={`invitee-option-${idx}`}
                          key={invitee.email}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          className={cn(
                            "w-full text-left px-3.5 py-2.5 border-b border-slate-100/70 last:border-b-0 transition-colors",
                            isActive ? "bg-[#EEF0FF]" : "hover:bg-slate-50"
                          )}
                          onMouseEnter={() => setActiveInviteeIndex(idx)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addGuest(invitee);
                          }}
                        >
                          <p className="text-[11px] font-bold text-slate-900 leading-tight">
                            {highlightMatch(invitee.name, debouncedGuestInput)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-tight">
                            {highlightMatch(invitee.email, debouncedGuestInput)}
                          </p>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3.5 py-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]">No results found</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">Press Enter to add a valid email manually.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {guests.length === 0 && (
                <p className="text-[7px] text-slate-400 mt-1.5 ml-0.5 font-bold opacity-60 uppercase tracking-widest">No invitees added • Press enter to add</p>
            )}
          </div>
        </div>

        <div className="p-5 pt-3 bg-slate-50 flex items-center justify-end space-x-4 border-t border-slate-100">
          <button 
            onClick={closeCreateEventModal}
            disabled={isSubmitting}
            className="text-[9px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors px-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveEvent}
            disabled={isSubmitting || !isPhoneValid}
            className="bg-[#5C6EFF] hover:bg-[#4a59e6] text-white px-6 h-9 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-xl shadow-[#5C6EFF]/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Event')}
          </button>
        </div>
      </div>
    </div>
  );
}

