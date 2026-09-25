'use client';

import { useRouter } from 'next/navigation';

interface UpcomingMeeting {
  id: string;
  title: string;
  relativeDate: string;
  isActive?: boolean;
}

interface UpcomingListProps {
  meetings: UpcomingMeeting[];
}

export default function UpcomingList({ meetings }: UpcomingListProps) {
  const router = useRouter();

  return (
    <div className="bg-white p-5 rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3]">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-[0.12em]">Coming Up</h4>
        <a href="/meetings" className="text-[9.5px] font-bold text-[#5C6EFF] uppercase tracking-widest hover:underline decoration-2 underline-offset-4 transition-all">View All</a>
      </div>
      
      <div className="space-y-1.5">
        {meetings.length > 0 ? (
          meetings.map((meeting) => (
            <button
              key={meeting.id}
              onClick={() => router.push('/meetings')}
              className="w-full text-left flex items-center justify-between py-2 border-b border-slate-50 last:border-0 group hover:px-1 transition-all"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full ring-4 ${meeting.isActive ? 'bg-[#5C6EFF] ring-[#5C6EFF]/10' : 'bg-slate-200 ring-transparent'}`}></div>
                <p className="text-[12px] font-bold text-slate-700 truncate tracking-tight">{meeting.title}</p>
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0 ml-3">{meeting.relativeDate}</span>
            </button>
          ))
        ) : (
          <div className="text-center py-6 opacity-40">
            <p className="text-[9px] font-bold uppercase tracking-widest">Nothing soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
