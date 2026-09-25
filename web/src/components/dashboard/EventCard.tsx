'use client';

import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  title: string;
  duration: number | string;
  location: string;
}

/**
 * EventCard component
 * Displays a single event type in the dashboard with its duration and location.
 */
export default function EventCard({ event }: { event: Event }) {
  const router = useRouter();

  const getIcon = (location: string) => {
    const loc = location.toLowerCase();
    if (loc.includes('zoom')) return 'videocam';
    if (loc.includes('google') || loc.includes('meet')) return 'video_chat';
    if (loc.includes('slack') || loc.includes('forum')) return 'forum';
    return 'location_on';
  };

  const getIconColor = (location: string) => {
    const loc = location.toLowerCase();
    if (loc.includes('zoom')) return 'text-[#2D8CFF]';
    if (loc.includes('google') || loc.includes('meet')) return 'text-[#00AC47]';
    if (loc.includes('slack')) return 'text-[#E01E5A]';
    return 'text-[#5C6EFF]';
  };

  const handleCopyLink = async () => {
    if (!event?.id) return;
    await navigator.clipboard.writeText(`${window.location.origin}/book/${event.id}`);
  };

  return (
    <div
      onClick={() => router.push('/events')}
      className="group bg-white p-4 rounded-2xl border border-[#f0f1f3] hover:border-[#5C6EFF]/30 hover:shadow-[0_20px_40px_rgba(92,110,255,0.06)] transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[140px]"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#5C6EFF]/5 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />
      
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className={`w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center ${getIconColor(event.location)} border border-[#f0f1f3] group-hover:bg-white transition-colors`}>
            <span className="material-symbols-outlined text-lg">{getIcon(event.location)}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push('/events');
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#757686] hover:bg-[#f8f9fb] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">more_vert</span>
          </button>
        </div>
        
        <h3 className="text-[15px] font-bold text-[#191c1e] mb-1 line-clamp-1">{event.title}</h3>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 text-[10px] font-bold text-[#757686] uppercase tracking-wider">
            <span className="material-symbols-outlined text-[13px]">schedule</span>
            {event.duration} min
          </div>
          <div className="w-0.5 h-0.5 rounded-full bg-[#e1e2e4]" />
          <div className="flex items-center gap-1 text-[10px] font-bold text-[#757686] uppercase tracking-wider">
            <span className="material-symbols-outlined text-[13px]">link</span>
            {event.location}
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between pt-3.5 border-t border-[#f8f9fb]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopyLink();
          }}
          className="text-[10px] font-bold text-[#5C6EFF] uppercase tracking-[0.12em] hover:opacity-80 transition-opacity flex items-center gap-1.5"
        >
          Copy Link
          <span className="material-symbols-outlined text-[13px]">content_copy</span>
        </button>
        
        <div className="w-5 h-5 rounded-lg bg-[#f8f9fb] hidden group-hover:flex items-center justify-center text-[#5C6EFF] animate-in slide-in-from-right-2 duration-300">
           <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
        </div>
      </div>
    </div>
  );
}
