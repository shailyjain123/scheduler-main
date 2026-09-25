import { Skeleton, SkeletonAvatar, SkeletonText, GlassSkeleton } from "@/components/ui/skeleton";

export default function NotificationSkeleton({ count = 8 }) {
  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="space-y-1">
          <Skeleton className="h-7 w-44 rounded-xl" />
          <Skeleton className="h-3.5 w-64 rounded-lg opacity-40" />
        </div>
        <Skeleton className="h-8 w-32 rounded-xl bg-slate-50" />
      </div>

      <div className="flex flex-col gap-4">
        {[...Array(count)].map((_, i) => (
          <div 
            key={i} 
            className="relative overflow-hidden flex items-start gap-5 p-6 rounded-[24px] border border-slate-100 bg-white/60 backdrop-blur-sm transition-all hover:bg-white"
          >
            {/* Unread indicator placeholder */}
            {i < 3 && (
              <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-primary/40" />
            )}

            <SkeletonAvatar size={48} className="rounded-2xl bg-slate-50 shadow-sm" />
            
            <div className="flex-grow min-w-0 space-y-4 pt-1">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32 rounded-lg" />
                    {i % 4 === 0 && <Skeleton className="h-4 w-16 rounded-md bg-primary/10" />}
                  </div>
                  <Skeleton className="h-3 w-20 rounded-md opacity-40" />
                </div>
                <Skeleton className="h-3 w-16 rounded-md opacity-30" />
              </div>

              <div className="space-y-2.5">
                <Skeleton className="h-4 w-[95%] rounded-lg opacity-80" />
                <Skeleton className="h-4 w-[70%] rounded-lg opacity-60" />
              </div>

              {i % 2 === 0 && (
                <div className="flex gap-2 pt-2">
                   <Skeleton className="h-8 w-24 rounded-xl bg-slate-50" />
                   <Skeleton className="h-8 w-24 rounded-xl bg-slate-50 opacity-40" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
