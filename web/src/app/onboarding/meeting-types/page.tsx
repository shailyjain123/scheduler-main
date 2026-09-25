'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { apiClient } from '../../../services/apiClient';
import { useRouter } from 'next/navigation';
import { useOnboardingProtection } from '../../../hooks/useOnboardingProtection';
import { onboardingPagePath } from '@/lib/routes';
import { useLocationDefaults } from '@/lib/hooks/use-location-defaults';

const MIN_EVENT_TITLE_LENGTH = 3;
const MAX_EVENT_TITLE_LENGTH = 20;

const validateEventTitle = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length < MIN_EVENT_TITLE_LENGTH) {
    return `Event Title must be at least ${MIN_EVENT_TITLE_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_EVENT_TITLE_LENGTH) {
    return `Event Title must be at most ${MAX_EVENT_TITLE_LENGTH} characters.`;
  }

  return '';
};

interface EventType {
  id?: string;
  title: string;
  duration: number | string;
  location?: string;
  description?: string;
}

export default function MeetingTypesPage() {
  const protectionStatus = useOnboardingProtection(4);
  const { user, setAuth } = useAuthStore();
  const { data: locationDefaults, getLabel } = useLocationDefaults();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingEventTypes, setExistingEventTypes] = useState<EventType[]>([]);
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>(['one-on-one']); // Default to one-on-one
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customEvent, setCustomEvent] = useState({
    title: '',
    duration: 30,
    location: 'Zoom',
    description: ''
  });

  useEffect(() => {
    if (locationDefaults?.recommended_default) {
      setCustomEvent(prev => ({
        ...prev,
        location: getLabel(locationDefaults.recommended_default.type, 'onboarding')
      }));
    }
  }, [locationDefaults, getLabel]);

  const customEventTitleError = useMemo(() => validateEventTitle(customEvent.title), [customEvent.title]);

  const inferSelectionId = (eventType: EventType): string => {
    const title = (eventType?.title || '').toString().toLowerCase();

    if (title === 'one-on-one' || title === 'one on one') return 'one-on-one';
    if (title === 'group session') return 'group-session';
    return 'custom';
  };

  useEffect(() => {
    const hydrateMeetingTypes = async () => {
      try {
        const response = await apiClient.get<{ event_types: EventType[] }>('/event_types');
        if (!(response.success && response.data?.event_types)) return;

        const fetched = response.data.event_types;
        setExistingEventTypes(fetched);

        if (fetched.length > 0) {
          const inferred = Array.from(
            new Set<string>(fetched.map((eventType: EventType) => inferSelectionId(eventType)))
          );
          setSelectedIds(inferred);

          const firstCustom = fetched.find((eventType: EventType) => inferSelectionId(eventType) === 'custom');
          if (firstCustom) {
            setCustomEvent({
              title: firstCustom.title || '',
              duration: Number(firstCustom.duration) || 30,
              location: firstCustom.location || 'Zoom',
              description: firstCustom.description || ''
            });
          }
        }
      } catch (_err) {
        console.error('Failed to hydrate meeting types:', _err);
      }
    };

    hydrateMeetingTypes();
  }, []);

  const handleSelect = (id: string, locked: boolean) => {
    if (locked) return;
    
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        // Don't deselect if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter(i => i !== id);
      }
      
      if (id === 'custom') {
        setShowCustomModal(true);
      }
      
      return [...prev, id];
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setError('Please select at least one meeting type');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const existingSelectionIds = new Set(existingEventTypes.map((eventType: EventType) => inferSelectionId(eventType)));
      const idsToCreate = selectedIds.filter((id) => !existingSelectionIds.has(id));

      if (idsToCreate.includes('custom') && customEventTitleError) {
        setError('Please fix the Event Title field before continuing.');
        setIsLoading(false);
        return;
      }

      // 1. Create missing EventType records only
      const creationPromises = idsToCreate.map(async (id) => {
        let eventData;
        const defaultLocation = locationDefaults?.recommended_default ? getLabel(locationDefaults.recommended_default.type, 'onboarding') : 'Zoom';
        
        if (id === 'custom') {
          eventData = { event_type: { ...customEvent, title: customEvent.title.trim() } };
        } else if (id === 'one-on-one') {
          eventData = { event_type: { title: 'One-on-One', duration: 30, location: defaultLocation, description: 'Private meeting' } };
        } else {
          eventData = { event_type: { title: 'Group Session', duration: 60, location: defaultLocation, description: 'Group meeting' } };
        }
        return apiClient.post('/event_types', eventData);
      });

      if (creationPromises.length > 0) {
        const results = await Promise.all(creationPromises);
        const failed = results.find(r => !r.success);
        
        if (failed) {
          setError(failed.error?.message || 'Failed to create one or more event types');
          setIsLoading(false);
          return;
        }
      }

      // 2. Mark onboarding stage as complete
      const response = await apiClient.post('/onboarding/meeting-types', { selected_types: selectedIds });
      if (response.success) {
        if (user) {
          setAuth({ ...user, onboarding_stage: 5 }, localStorage.getItem('token') || '');
        }
        router.push(onboardingPagePath(5));
      } else {
        setError(response.error?.message || 'Failed to save progress');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (user) {
      setAuth({ ...user, onboarding_stage: 3 }, localStorage.getItem('token') || '');
    }
    router.push(onboardingPagePath(3));
  };

  // Show loading screen while checking auth
  if (protectionStatus.isLoading || !protectionStatus.isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[740px] flex flex-col items-center">
      {/* Custom Event Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-[420px] bg-white rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300 border border-[#f0f1f3]">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#1a1b1e]">Custom Event</h3>
                <button onClick={() => setShowCustomModal(false)} className="w-9 h-9 rounded-full hover:bg-[#f8f9fb] flex items-center justify-center text-[#757686] transition-colors">
                   <span className="material-symbols-outlined text-xl">close</span>
                </button>
             </div>
             
             <div className="space-y-5">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-[#757686] uppercase tracking-widest ml-0.5">Event Title</label>
                   <input 
                      type="text"
                     className={`w-full h-10 px-4 rounded-xl bg-[#f8f9fb] border focus:ring-4 focus:bg-white transition-all text-[13px] font-bold ${customEventTitleError ? 'border-[#ba1a1a] focus:border-[#ba1a1a] focus:ring-[#ba1a1a]/10' : 'border-transparent focus:border-[#5C6EFF]/40 focus:ring-[#5C6EFF]/10'}`}
                      placeholder="e.g. Virtual Coffee Chat"
                      value={customEvent.title}
                       onChange={(e) => setCustomEvent({...customEvent, title: e.target.value})}
                   />
                     {customEventTitleError && (
                      <p className="text-[11px] text-[#ba1a1a] font-semibold">{customEventTitleError}</p>
                     )}
                </div>
                
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#757686] uppercase tracking-widest ml-0.5">Duration</label>
                    <select 
                      className="w-full h-10 px-3.5 rounded-xl bg-[#f8f9fb] border border-transparent focus:border-[#5C6EFF]/40 focus:bg-white text-[13px] font-bold appearance-none cursor-pointer"
                      value={customEvent.duration}
                      onChange={(e) => setCustomEvent({...customEvent, duration: parseInt(e.target.value)})}
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#757686] uppercase tracking-widest ml-0.5">Location</label>
                    <select 
                      className="w-full h-10 px-3.5 rounded-xl bg-[#f8f9fb] border border-transparent focus:border-[#5C6EFF]/40 focus:bg-white text-[13px] font-bold appearance-none cursor-pointer"
                      value={customEvent.location}
                      onChange={(e) => setCustomEvent({...customEvent, location: e.target.value})}
                    >
                      <option value="Zoom">Zoom</option>
                      <option value="Google Meet">Google Meet</option>
                      <option value="Slack">Slack</option>
                      <option value="Physical">In-person</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="button"
                  disabled={Boolean(customEventTitleError)}
                  onClick={() => setShowCustomModal(false)}
                  className="w-full h-12 bg-[#5C6EFF] hover:bg-[#3649db] text-white rounded-xl font-bold text-[13px] uppercase tracking-widest transition-all shadow-lg shadow-[#5C6EFF]/20 mt-3 active:scale-[0.98]"
                >
                  Save Configuration
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Container Card */}
      <div className="w-full bg-white rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.04)] p-8 border border-[#f0f1f3]">
        
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1a1b1e] tracking-tight mb-2">Choose your meeting types</h1>
          <p className="text-[#6b6d76] text-[15px] font-medium">Pick what applies. You can customize these later.</p>
        </div>

        {error && (
            <div className="bg-[#ffdad6] text-[#93000a] p-3.5 rounded-xl text-[13px] font-semibold flex items-center gap-3 border border-[#ba1a1a]/10 mb-6 transition-all">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-5">
          
          {/* Card 1: One-on-One */}
          <div 
            onClick={() => handleSelect('one-on-one', false)}
            className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-start ${
              selectedIds.includes('one-on-one') 
              ? 'border-[#5C6EFF] bg-white shadow-lg shadow-[#5C6EFF]/5' 
              : 'border-[#f0f1f3] bg-white hover:border-[#e1e2e4]'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl mb-5 flex items-center justify-center ${selectedIds.includes('one-on-one') ? 'bg-[#f0f2ff] text-[#5C6EFF]' : 'bg-[#f8f9fb] text-[#757686]'}`}>
              <span className="material-symbols-outlined text-xl">person</span>
            </div>
            <div className="absolute top-5 right-5">
               <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedIds.includes('one-on-one') ? 'bg-[#5C6EFF] border-[#5C6EFF]' : 'border-[#e1e2e4]'
               }`}>
                  {selectedIds.includes('one-on-one') && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
               </div>
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-lg font-bold text-[#1a1b1e]">One-on-One</h3>
              <span className="px-1.5 py-0.5 bg-[#8b9cff]/20 text-[#5C6EFF] text-[8px] font-bold uppercase tracking-wider rounded-md">Recommended</span>
            </div>
            <p className="text-[13px] text-[#757686] mb-6 font-medium">Private meetings with one guest</p>
            <div className="flex gap-2">
               <span className="px-2.5 py-1 bg-[#f8f9fb] text-[#757686] text-[10px] font-bold rounded-lg border border-[#f0f1f3]">30 min</span>
               <span className="px-2.5 py-1 bg-[#f8f9fb] text-[#757686] text-[10px] font-bold rounded-lg border border-[#f0f1f3]">Zoom</span>
            </div>
          </div>

          {/* Card 2: Group Session */}
          <div 
            onClick={() => handleSelect('group-session', false)}
            className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-start ${
              selectedIds.includes('group-session') 
              ? 'border-[#5C6EFF] bg-white shadow-lg shadow-[#5C6EFF]/5' 
              : 'border-[#f0f1f3] bg-white hover:border-[#e1e2e4]'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl mb-5 flex items-center justify-center ${selectedIds.includes('group-session') ? 'bg-[#f0f2ff] text-[#5C6EFF]' : 'bg-[#f8f9fb] text-[#757686]'}`}>
              <span className="material-symbols-outlined text-xl">groups</span>
            </div>
            <div className="absolute top-5 right-5">
               <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedIds.includes('group-session') ? 'bg-[#5C6EFF] border-[#5C6EFF]' : 'border-[#e1e2e4]'
               }`}>
                  {selectedIds.includes('group-session') && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
               </div>
            </div>
            <h3 className="text-lg font-bold text-[#1a1b1e] mb-1.5">Group Session</h3>
            <p className="text-[13px] text-[#757686] mb-6 font-medium">Multiple guests, one host</p>
            <div className="flex gap-2">
               <span className="px-2.5 py-1 bg-[#f8f9fb] text-[#757686] text-[10px] font-bold rounded-lg border border-[#f0f1f3]">60 min</span>
               <span className="px-2.5 py-1 bg-[#f8f9fb] text-[#757686] text-[10px] font-bold rounded-lg border border-[#f0f1f3]">Meet</span>
            </div>
          </div>

          {/* Card 3: Round Robin (Locked) */}
          <div className="relative p-6 rounded-2xl border-2 border-[#f0f1f3] bg-white opacity-40 transition-all cursor-not-allowed flex flex-col items-start overflow-hidden text-left">
             {/* Locked Shield */}
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <span className="material-symbols-outlined text-2xl text-[#1a1b1e]">lock</span>
            </div>
            
            <div className="w-10 h-10 rounded-xl mb-5 flex items-center justify-center bg-[#f8f9fb] text-[#757686]">
              <span className="material-symbols-outlined text-xl">swap_horiz</span>
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-lg font-bold text-[#1a1b1e]">Round Robin</h3>
            </div>
            <p className="text-[13px] text-[#757686] mb-6 font-medium leading-tight">Auto-assign available team member</p>
            <div className="flex gap-2">
               <span className="px-2.5 py-1 bg-[#f8f9fb] text-[#757686] text-[10px] font-bold rounded-lg border border-[#f0f1f3]">Future Plan</span>
            </div>
          </div>

          {/* Card 4: Custom */}
          <div 
            onClick={() => handleSelect('custom', false)}
            className={`relative p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-start ${
              selectedIds.includes('custom') 
              ? 'border-[#5C6EFF] bg-white shadow-lg shadow-[#5C6EFF]/5' 
              : 'border-[#e1e2e4] bg-white hover:border-[#c5c5d7]'
            }`}
          >
            <div className={`w-10 h-10 rounded-full mb-5 flex items-center justify-center ${selectedIds.includes('custom') ? 'bg-[#5C6EFF] text-white shadow-lg shadow-[#5C6EFF]/30' : 'bg-[#f0f2ff] text-[#5C6EFF]'}`}>
              <span className="material-symbols-outlined text-xl">add</span>
            </div>
            <div className="absolute top-5 right-5">
               <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedIds.includes('custom') ? 'bg-[#5C6EFF] border-[#5C6EFF]' : 'border-[#e1e2e4]'
               }`}>
                  {selectedIds.includes('custom') && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
               </div>
            </div>
            <h3 className="text-lg font-bold text-[#1a1b1e] mb-1.5">Custom</h3>
            <p className="text-[13px] text-[#757686] mb-6 font-medium font-medium">Build your own meeting type</p>
            <div className="flex gap-2">
               <span className="px-2.5 py-1 bg-[#f8f9fb] text-[#757686] text-[10px] font-bold rounded-lg border border-[#f0f1f3]">Flexible</span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="mt-12 pt-8 border-t border-[#f0f1f3] flex items-center justify-between">
            <button 
              type="button"
              className="text-[13px] font-bold text-[#757686] hover:text-[#191c1e] transition-colors flex items-center gap-1.5 group"
              onClick={handleBack}
            >
              <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
              Back
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isLoading || selectedIds.length === 0}
              className="bg-[#5C6EFF] hover:bg-[#3649db] text-white px-10 h-12 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-[#5C6EFF]/20 disabled:opacity-70 disabled:cursor-not-allowed min-w-[160px] group"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-sm">Continue</span>
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-2 transition-transform">arrow_forward</span>
                </>
              )}
            </button>
        </div>
      </div>
    </div>
  );
}
