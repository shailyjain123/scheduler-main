import { Skeleton, Shimmer } from "@/components/ui/skeleton";

export function IntegrationCardSkeleton() {
  return (
    <div className="p-5 rounded-[1.5rem] border border-slate-100 bg-white flex flex-col gap-4 relative overflow-hidden h-full">
      <div className="flex items-start justify-between">
        <Skeleton className="w-11 h-11 rounded-xl" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <div className="pt-2 space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>

      <div className="pt-3">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      
      <Shimmer className="absolute inset-0 opacity-[0.03] pointer-events-none" />
    </div>
  );
}

export default function IntegrationsSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1020px] mx-auto">
      {[1, 2].map((group) => (
        <div key={group} className="space-y-4">
          <Skeleton className="h-3 w-24 ml-1" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <IntegrationCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
