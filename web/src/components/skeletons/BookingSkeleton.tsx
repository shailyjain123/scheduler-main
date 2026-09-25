import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton, GlassSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function BookingSkeleton() {
  return (
    <div className="min-h-screen bg-[#fcfdfe] flex flex-col lg:flex-row animate-in fade-in duration-1000">
      {/* Sidebar: Host Info - Minimalist & Premium */}
      <aside className="w-full lg:w-[420px] bg-white border-b lg:border-b-0 lg:border-r border-slate-100 p-8 lg:p-16 flex flex-col h-full">
        <div className="mb-16">
           <Skeleton className="h-6 w-24 rounded-lg bg-slate-100 opacity-40" />
        </div>
        
        <div className="space-y-12">
          <div className="space-y-6">
            <SkeletonAvatar size={88} className="rounded-[32px] opacity-10 bg-slate-50" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4 rounded-xl" />
              <Skeleton className="h-4 w-1/2 rounded-lg opacity-30" />
            </div>
          </div>

          <div className="space-y-6 pt-8 border-t border-slate-100/50">
            <Skeleton className="h-5 w-48 rounded-lg opacity-40" />
            <div className="space-y-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-5 rounded-lg opacity-10" />
                  <Skeleton className="h-3.5 w-40 rounded-md opacity-30" />
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-[24px] bg-slate-50/30 border border-slate-100/30 space-y-4">
             <Skeleton className="h-2 w-24 rounded-full opacity-20 uppercase tracking-widest text-[9px] font-black" />
             <SkeletonText lines={2} width="100%" className="opacity-20" />
          </div>
        </div>
      </aside>

      {/* Main Area: Calendar & Slots */}
      <main className="flex-1 p-6 lg:p-16 flex items-center justify-center">
        <div className="w-full max-w-[840px] bg-white rounded-[40px] shadow-[0_32px_80px_rgba(17,24,39,0.04)] border border-slate-100 overflow-hidden flex flex-col">
          {/* Top Bar: Timezone Selector Placeholder */}
          <div className="p-8 border-b border-slate-50 bg-slate-50/20 flex justify-between items-center">
            <div className="space-y-2">
               <Skeleton className="h-2 w-28 rounded-full opacity-20 uppercase tracking-widest text-[9px] font-black" />
               <Skeleton className="h-7 w-56 rounded-xl" />
            </div>
            <SkeletonButton className="h-9 w-28 rounded-xl opacity-20" />
          </div>

          <div className="flex flex-col md:grid md:grid-cols-2">
            {/* Left: Calendar View Placeholder */}
            <div className="p-10 border-r border-slate-50 bg-white">
              <div className="flex items-center justify-between mb-10">
                <Skeleton className="h-6 w-32 rounded-xl" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-xl opacity-10" />
                  <Skeleton className="h-8 w-8 rounded-xl opacity-10" />
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-3 mb-8">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <span key={i} className="text-[9px] font-black text-slate-200 text-center tracking-widest opacity-50">{d}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-3">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="aspect-square flex items-center justify-center p-1">
                    <Skeleton 
                      className={cn(
                        "w-full h-full rounded-xl",
                        i > 5 && i < 25 ? "opacity-30" : "opacity-5"
                      )} 
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Time Slot Selection Placeholder */}
            <div className="p-10 flex flex-col h-full bg-[#fcfdfe]">
              <div className="mb-10 space-y-3">
                <Skeleton className="h-6 w-40 rounded-xl" />
                <Skeleton className="h-3.5 w-28 rounded-lg opacity-20" />
              </div>
              
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[360px] pr-2 no-scrollbar">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton 
                    key={i} 
                    className="w-full h-14 rounded-2xl bg-white border border-slate-100/50 shadow-sm opacity-60"
                  />
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-slate-100/50">
                 <SkeletonButton className="w-full h-14 rounded-2xl opacity-20" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
