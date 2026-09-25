import { Skeleton, GlassSkeleton, SkeletonAvatar, SkeletonCard, SkeletonButton } from "@/components/ui/skeleton";

export default function CalendarSkeleton() {
  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-1000 h-full">
      {/* Calendar Toolbar Placeholder: Light and Clean */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 p-5 rounded-[24px] border border-white/40 shadow-none">
        <div className="flex items-center gap-4">
          <SkeletonButton className="h-10 w-24 rounded-xl opacity-40" />
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/30 rounded-xl">
            <Skeleton className="h-8 w-10 rounded-lg bg-white opacity-40" />
            <Skeleton className="h-8 w-10 rounded-lg bg-white opacity-40" />
          </div>
          <Skeleton className="h-6 w-40 rounded-lg ml-2 opacity-40" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonButton className="h-10 w-28 rounded-xl opacity-30" />
          <SkeletonButton className="h-10 w-24 rounded-xl opacity-40" />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
        {/* Main Calendar Grid Placeholder */}
        <div className="flex-1 bg-white/40 rounded-[32px] border border-slate-100/50 shadow-none flex flex-col overflow-hidden relative">
          
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-slate-100/50">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => (
              <div key={i} className="py-5 flex flex-col items-center gap-2.5 border-r last:border-0 border-slate-100/30">
                <span className="text-[9px] font-black text-slate-300 tracking-[0.2em]">{day}</span>
                <Skeleton className={i === 2 ? "h-8 w-8 rounded-full opacity-40" : "h-8 w-8 rounded-full opacity-10"} />
              </div>
            ))}
          </div>

          {/* Grid Content: Preserving structure but lighter */}
          <div className="flex-1 grid grid-cols-7 relative overflow-hidden bg-[#fcfdfe]/50">
            {/* Background Time Grid Lines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col py-0 px-0">
               {Array.from({ length: 8 }).map((_, i) => (
                 <div key={i} className="flex items-center gap-4 w-full h-[100px] border-b border-slate-100/20 px-4">
                    <Skeleton className="h-2 w-6 opacity-5" />
                    <div className="h-px flex-1 bg-slate-100/10" />
                 </div>
               ))}
            </div>

            {/* Subtle Event Placeholders */}
            {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => (
              <div key={dayIdx} className="border-r last:border-0 border-slate-100/30 relative h-full">
                {dayIdx % 2 === 0 && (
                  <Skeleton 
                    className="absolute left-1.5 right-1.5 rounded-xl opacity-10 border border-white" 
                    style={{ 
                      top: `${15 + (dayIdx * 10)}%`, 
                      height: dayIdx === 2 ? '120px' : '80px',
                    }} 
                  />
                )}
                
                {dayIdx === 3 && (
                  <Skeleton 
                    className="absolute left-1.5 right-1.5 rounded-xl opacity-10 border border-white" 
                    style={{ 
                      top: '45%', 
                      height: '100px',
                    }} 
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Simplified */}
        <div className="w-full lg:w-72 flex flex-col gap-6">
          <SkeletonCard className="bg-white/40 shadow-none">
             <div className="space-y-6">
                <Skeleton className="h-5 w-24 rounded-lg" />
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-3 flex-1">
                        <Skeleton className="h-4 w-4 rounded-md opacity-20" />
                        <Skeleton className="h-3.5 w-3/4 rounded-lg opacity-30" />
                      </div>
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                    </div>
                  ))}
                </div>
             </div>
          </SkeletonCard>

          <SkeletonCard className="bg-white/40 flex-1 shadow-none">
             <div className="space-y-6">
                <Skeleton className="h-5 w-32 rounded-lg" />
                <div className="space-y-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <SkeletonAvatar size={40} className="rounded-2xl opacity-10" />
                      <div className="flex-1 space-y-3 pt-1">
                        <Skeleton className="h-3.5 w-full rounded-lg opacity-30" />
                        <div className="flex gap-2">
                           <Skeleton className="h-2.5 w-12 rounded-md opacity-20" />
                           <Skeleton className="h-2.5 w-10 rounded-md opacity-10" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}
