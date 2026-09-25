import { Skeleton, SkeletonCard, GlassSkeleton, SkeletonText, SkeletonButton } from "@/components/ui/skeleton";

export function ChartSkeleton({ height = "420px", title = "Activity" }: { height?: string; title?: string }) {
  return (
    <SkeletonCard className="flex flex-col gap-8 bg-white/60 relative overflow-hidden" style={{ height }}>
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36 rounded-lg" />
          <Skeleton className="h-3 w-56 rounded-lg opacity-50" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-xl bg-slate-50" />
          <Skeleton className="h-8 w-24 rounded-xl bg-slate-50" />
        </div>
      </div>

      <div className="flex-1 w-full flex items-end justify-between gap-4 px-2 pt-10 relative">
        {/* Horizontal Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.03] py-10">
          {[1, 2, 3, 4].map(j => <div key={j} className="h-px bg-slate-900 w-full" />)}
        </div>

        {/* Dynamic Column Placeholders */}
        {[65, 40, 80, 55, 95, 60, 85, 50, 75, 45, 90, 70].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-3">
             <GlassSkeleton 
               className="w-full rounded-t-xl" 
               style={{ 
                 height: `${h}%`, 
                 animationDelay: `${i * 0.08}s`,
                 background: `rgba(92, 110, 255, ${0.05 + (h/200)})`
               }} 
             />
             <Skeleton className="h-2 w-full rounded-full opacity-20" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

export function PieChartSkeleton({ height = "420px" }: { height?: string }) {
  return (
    <SkeletonCard className="flex flex-col gap-10 bg-white/60" style={{ height }}>
      <div className="space-y-2">
        <Skeleton className="h-6 w-40 rounded-lg" />
        <Skeleton className="h-3 w-56 rounded-lg opacity-50" />
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        {/* Glow effect */}
        <div className="absolute h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        
        <div className="relative h-64 w-64">
           {/* Segment placeholders using rounded borders */}
           <div className="absolute inset-0 rounded-full border-[28px] border-slate-50" />
           <div className="absolute inset-0 rounded-full border-[28px] border-primary/10 border-t-transparent border-l-transparent -rotate-12" />
           <div className="absolute inset-0 rounded-full border-[28px] border-primary/20 border-b-transparent border-r-transparent rotate-45" />
           
           <div className="absolute inset-[28px] flex flex-col items-center justify-center bg-white rounded-full shadow-inner border border-slate-50">
              <Skeleton className="h-6 w-16 rounded-lg mb-1" />
              <Skeleton className="h-3 w-12 rounded-lg opacity-40" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-xl border border-slate-50/50 bg-white/30">
            <div className="flex items-center gap-3">
              <Skeleton className={`h-3 w-3 rounded-full ${i % 2 === 0 ? 'bg-primary/40' : 'bg-indigo-300'}`} />
              <Skeleton className="h-3 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-3 w-8 rounded-lg opacity-60" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}
