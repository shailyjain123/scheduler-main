import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard, SkeletonButton, GlassSkeleton } from "@/components/ui/skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="w-full flex flex-col gap-10 animate-in fade-in duration-1000">
      {/* Header Info: Lightweight */}
      <div className="flex flex-col gap-3 px-1">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-80 rounded-lg opacity-40" />
      </div>

      {/* Stats Grid: Softer & More Minimal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} className="bg-white/50 border-white/40 shadow-none">
            <div className="flex justify-between items-start mb-6">
              <Skeleton className="h-3 w-24 rounded-full opacity-30" />
              <SkeletonAvatar size={32} className="rounded-xl opacity-20" />
            </div>
            <Skeleton className="h-8 w-16 rounded-xl mb-3" />
            <SkeletonText lines={1} width="60%" className="opacity-30" />
          </SkeletonCard>
        ))}
      </div>

      {/* Main Grid: Chart + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SkeletonCard className="h-[440px] flex flex-col gap-8 bg-white/40 shadow-none">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 rounded-lg" />
                <Skeleton className="h-3 w-64 rounded-lg opacity-30" />
              </div>
              <SkeletonButton className="w-32 opacity-30" />
            </div>
            
            {/* Minimal Chart: Fewer bars, softer animation */}
            <div className="flex-1 flex items-end justify-between gap-6 px-4 pt-10">
               {[40, 65, 30, 85, 45, 70].map((height, idx) => (
                 <div key={idx} className="flex-1 flex flex-col justify-end items-center gap-4">
                    <Skeleton 
                      className="w-full rounded-t-xl opacity-20" 
                      style={{ 
                        height: `${height}%`,
                        animationDelay: `${idx * 0.15}s`
                      }} 
                    />
                    <Skeleton className="h-1.5 w-8 rounded-full opacity-10" />
                 </div>
               ))}
            </div>
          </SkeletonCard>
        </div>

        {/* Timeline Placeholder */}
        <SkeletonCard className="h-full bg-white/40 shadow-none">
          <div className="space-y-2 mb-10">
            <Skeleton className="h-5 w-24 rounded-lg" />
            <Skeleton className="h-3 w-40 rounded-lg opacity-30" />
          </div>
          <div className="space-y-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <SkeletonAvatar size={40} className="opacity-20" />
                <div className="flex-1 space-y-3 pt-1">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3.5 w-28 rounded-lg opacity-40" />
                    <Skeleton className="h-2.5 w-10 rounded-lg opacity-20" />
                  </div>
                  <SkeletonText lines={1} width="80%" className="opacity-20" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>

      {/* Upcoming Section: Simplified Cards */}
      <div className="space-y-8">
        <div className="flex justify-between items-end px-1">
          <div className="space-y-3">
            <Skeleton className="h-7 w-40 rounded-xl" />
            <Skeleton className="h-3.5 w-72 rounded-lg opacity-30" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} className="bg-white/40 shadow-none border-slate-100/50">
              <div className="flex justify-between items-start mb-8">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-32 rounded-lg" />
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-16 rounded-md opacity-20" />
                    <Skeleton className="h-3 w-12 rounded-md opacity-20" />
                  </div>
                </div>
                <SkeletonAvatar size={44} className="rounded-2xl opacity-20" />
              </div>
              
              <div className="space-y-4 pt-2">
                <Skeleton className="h-3.5 w-[90%] rounded-lg opacity-20" />
                <Skeleton className="h-3.5 w-[70%] rounded-lg opacity-20" />
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50/50 flex justify-between items-center">
                <div className="flex -space-x-2">
                  {[1,2,3].map(j => <SkeletonAvatar key={j} size={24} className="border-2 border-white opacity-40" />)}
                </div>
                <SkeletonButton className="h-8 w-20 rounded-xl opacity-30" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}
