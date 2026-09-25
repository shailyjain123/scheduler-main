import { useState } from 'react';
import { EventType } from '@/lib/types/event';
import { apiClient } from '@/services/apiClient';

interface EventTypeCardProps {
  eventType: EventType;
  onEdit: (et: EventType) => void;
  onDelete: (id: number) => void;
}

export function EventTypeCard({ eventType, onEdit, onDelete }: EventTypeCardProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [isActive, setIsActive] = useState(eventType.is_active !== false);
  const slug = eventType.title.toLowerCase().replace(/\s+/g, '-');
  const linkPath = `schedulr.io/alex/${slug}`;
  const fullLink = `https://${linkPath}`;

  const handleCopyLink = () => {
    const link = `${window.location.origin}/book/${eventType.id}`;
    navigator.clipboard.writeText(link);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  const toggleActive = async () => {
    const nextValue = !isActive;
    setIsActive(nextValue);
    try {
      await apiClient.patch(`/event_types/${eventType.id}`, { 
        event_type: { is_active: nextValue } 
      });
    } catch (err) {
      console.error('Failed to toggle active state', err);
      setIsActive(!nextValue); // Revert on error
    }
  };

  return (
    <div className="group bg-white rounded-2xl p-5 border border-[#f0f1f3] shadow-sm hover:shadow-xl hover:shadow-[#5C6EFF]/5 transition-all duration-300">
      <div className="flex justify-between items-start mb-5">
        <div 
          className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500`}
          style={{ 
            backgroundColor: '#5C6EFF1a',
            color: '#5C6EFF'
          }}
        >
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            {eventType.duration <= 30 ? 'timer' : 'calendar_today'}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Active Toggle Switch */}
          <button 
            type="button"
            onClick={toggleActive}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-[#5C6EFF]' : 'bg-slate-200'}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>

          <div className="flex gap-1 opacity-10 sm:group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => eventType.id && onDelete(eventType.id)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#757686] hover:bg-red-50 hover:text-red-500 transition-all font-bold"
              title="Delete"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#1a1b1e] group-hover:text-[#5C6EFF] transition-colors">{eventType.title}</h3>
          <div className="flex items-center gap-3 text-[11px] text-[#757686] font-bold mt-1">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              {eventType.duration} min
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {eventType.location}
            </span>
            {eventType.kind === 'group' && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="flex items-center gap-1 text-indigo-600">
                  <span className="material-symbols-outlined text-[14px]">groups</span>
                  Group ({eventType.max_participants})
                </span>
              </>
            )}
          </div>
        </div>

        {/* Stats Grid - Dynamic Values */}
        <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-100">
           <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Bookings</span>
              <span className="text-base font-bold text-slate-900 leading-none">{eventType.bookings_count ?? 0}</span>
           </div>
           <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Cancel</span>
              <span className="text-base font-bold text-slate-900 leading-none">{eventType.canceled_count ?? 0}</span>
           </div>
           <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Upcoming</span>
              <span className="text-base font-bold text-slate-900 leading-none">{eventType.upcoming_count ?? 0}</span>
           </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-0.5">
           <div
             className="flex items-center gap-2 text-[12px] text-[#454655] bg-[#f8f9fb] px-2.5 py-1.5 rounded-lg border border-slate-100 flex-1 min-w-0"
             title={fullLink}
           >
             <span className="material-symbols-outlined text-[16px] text-slate-400">link</span>
             <span className="truncate font-medium" title={fullLink}>{linkPath}</span>
           </div>
           
           <div className="flex items-center gap-1 shrink-0">
             <button 
               onClick={handleCopyLink}
               className={`p-2 rounded-lg transition-all ${isCopying ? 'text-green-500 bg-green-50' : 'text-slate-400 hover:bg-slate-50 hover:text-[#5C6EFF]'}`}
               title="Copy Link"
             >
               <span className="material-symbols-outlined text-[20px]">{isCopying ? 'check' : 'content_copy'}</span>
             </button>
             <button 
               onClick={() => onEdit(eventType)}
               className="px-4 py-2 text-[12px] font-bold text-[#5C6EFF] hover:bg-[#EEF0FF] rounded-lg transition-all"
             >
               Edit
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
