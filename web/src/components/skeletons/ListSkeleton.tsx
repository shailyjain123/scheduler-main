import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton, GlassSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ListSkeletonProps {
  count?: number;
  columns?: number;
  showTabs?: boolean;
  showActions?: boolean;
  headerTitle?: boolean;
}

export default function ListSkeleton({ 
  count = 8, 
  columns = 4, 
  showTabs = true, 
  showActions = true,
  headerTitle = true
}: ListSkeletonProps) {
  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in duration-700">
      {/* Page Header Area */}
      {headerTitle && (
        <div className="flex justify-between items-end mb-2">
          <div className="space-y-3">
             <Skeleton className="h-9 w-48 rounded-xl" />
             <Skeleton className="h-4 w-72 rounded-lg opacity-50" />
          </div>
          {showActions && <SkeletonButton className="h-11 w-40 rounded-2xl" />}
        </div>
      )}

      {/* Control Bar: Search, Tabs, Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-4">
          {showTabs && (
            <div className="flex gap-1.5 p-1.5 bg-slate-100/50 rounded-[18px] border border-slate-100">
              <Skeleton className="h-9 w-24 rounded-[12px] bg-white shadow-sm" />
              <Skeleton className="h-9 w-24 rounded-[12px] opacity-40" />
              <Skeleton className="h-9 w-24 rounded-[12px] opacity-40" />
            </div>
          )}
          <div className="relative group">
            <Skeleton className="h-12 w-80 rounded-[20px] bg-white border border-slate-100" />
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
               <Skeleton className="h-4 w-4 rounded-md opacity-20" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <SkeletonButton className="h-11 w-28 rounded-xl bg-slate-50 border border-slate-100" />
           <SkeletonButton className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-100" />
        </div>
      </div>

      {/* Premium Table Container */}
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* Table Header */}
        <div 
          className="grid gap-8 px-8 py-6 border-b border-slate-100 bg-slate-50/30" 
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {[...Array(columns)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-20 rounded-full opacity-40 uppercase tracking-widest text-[10px] font-black" />
            </div>
          ))}
        </div>
        
        {/* Table Rows: Staggered and realistic */}
        <div className="flex flex-col">
          {[...Array(count)].map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "grid gap-8 px-8 py-6 border-b border-slate-50 last:border-0 items-center transition-colors group hover:bg-slate-50/30",
                "animate-in fade-in slide-in-from-bottom-2 duration-500"
              )} 
              style={{ 
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                animationDelay: `${i * 0.05}s`
              }}
            >
              {/* Primary Column: Avatar + Title */}
              <div className="flex items-center gap-4">
                <SkeletonAvatar size={44} className="bg-slate-100 rounded-2xl group-hover:bg-white transition-colors" />
                <div className="flex flex-col gap-2 flex-1">
                  <Skeleton className={cn("h-4 rounded-lg", i % 3 === 0 ? "w-40" : "w-32")} />
                  <Skeleton className="h-3 w-48 rounded-lg opacity-40" />
                </div>
              </div>

              {/* Data Columns */}
              {[...Array(columns - 1)].map((_, j) => (
                <div key={j} className="flex flex-col gap-2">
                  {j === columns - 2 ? (
                    // Status Badge Placeholder
                    <Skeleton className={cn(
                      "h-6 w-20 rounded-full opacity-30",
                      i % 3 === 0 ? "bg-emerald-400" : i % 3 === 1 ? "bg-amber-400" : "bg-indigo-400"
                    )} />
                  ) : (
                    // Text Column
                    <>
                      <Skeleton className={cn("h-3.5 rounded-lg", i % 2 === 0 ? "w-28" : "w-24")} />
                      {i % 4 === 0 && <Skeleton className="h-2.5 w-16 rounded-lg opacity-30" />}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer / Pagination Placeholder */}
        <div className="px-8 py-6 bg-slate-50/20 flex justify-between items-center border-t border-slate-50">
           <Skeleton className="h-4 w-40 rounded-lg opacity-40" />
           <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-xl bg-white border border-slate-100" />
              <Skeleton className="h-9 w-24 rounded-xl bg-white border border-slate-100" />
           </div>
        </div>
      </div>
    </div>
  );
}
