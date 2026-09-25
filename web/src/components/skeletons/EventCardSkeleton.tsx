import { Skeleton, SkeletonAvatar, SkeletonCard, SkeletonButton, GlassSkeleton } from "@/components/ui/skeleton";

export function EventCardSkeleton() {
  return (
    <div className="relative group animate-in fade-in zoom-in-95 duration-500">
      {/* Subtle glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/5 to-transparent rounded-[32px] blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <SkeletonCard className="bg-white/80 backdrop-blur-md border-white/40 h-full flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-3 flex-1">
              <Skeleton className="h-6 w-3/4 rounded-xl" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20 rounded-md bg-primary/10" />
                <Skeleton className="h-4 w-16 rounded-md opacity-40" />
              </div>
            </div>
            <SkeletonAvatar size={44} className="rounded-2xl shadow-sm bg-slate-50" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-md opacity-20" />
                <Skeleton className="h-3 w-16 rounded-md opacity-50" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-md opacity-20" />
                <Skeleton className="h-3 w-20 rounded-md opacity-50" />
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50/50 border border-slate-100/50">
               <Skeleton className="h-3 w-3 rounded-full bg-emerald-400 opacity-40" />
               <Skeleton className="h-3 w-40 rounded-md opacity-50" />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <SkeletonAvatar key={i} size={28} className="border-2 border-white bg-slate-100" />
            ))}
            <div className="h-7 w-7 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center">
               <Skeleton className="h-2 w-3 rounded-full opacity-30" />
            </div>
          </div>
          <div className="flex gap-2">
             <SkeletonButton className="h-9 w-20 rounded-xl" />
             <SkeletonButton className="h-9 w-9 rounded-xl opacity-40" />
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}

export default function EventTypeListSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[...Array(count)].map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
