import { Skeleton, SkeletonCard, SkeletonButton, GlassSkeleton } from "@/components/ui/skeleton";

export default function AvailabilitySkeleton() {
  return (
    <div className="max-w-[1240px] mx-auto pb-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-end">
         <SkeletonButton className="h-9 w-32 rounded-xl" />
      </div>

      <div className="flex gap-8 border-b border-slate-200">
        <Skeleton className="h-8 w-32 rounded-t-lg opacity-40" />
        <Skeleton className="h-8 w-32 rounded-t-lg opacity-20" />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Editor */}
        <div className="col-span-12 xl:col-span-8 space-y-4">
          <div className="flex justify-end">
             <SkeletonButton className="h-9 w-40 rounded-xl" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-8 space-y-8 shadow-sm">
             {[...Array(7)].map((_, i) => (
               <div key={i} className="flex items-center gap-8">
                  <Skeleton className="h-4 w-12 rounded-lg opacity-30" />
                  <div className="flex-1 flex items-center gap-4">
                     <Skeleton className="h-10 w-24 rounded-xl" />
                     <Skeleton className="h-0.5 w-4 bg-slate-100" />
                     <Skeleton className="h-10 w-24 rounded-xl" />
                  </div>
                  <Skeleton className="w-8 h-8 rounded-lg opacity-10" />
               </div>
             ))}
          </div>
        </div>

        {/* Right Column: Timeline & Tips */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          <SkeletonCard className="h-[280px]">
             <div className="space-y-4">
                <Skeleton className="h-4 w-3/4 rounded-lg" />
                <div className="flex gap-1">
                   {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-6 w-8 rounded-md opacity-20" />)}
                </div>
                <Skeleton className="h-10 w-full rounded-xl bg-slate-50" />
                <div className="flex justify-between">
                   {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-2 w-8 rounded-full opacity-10" />)}
                </div>
             </div>
          </SkeletonCard>
          
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
             <Skeleton className="h-4 w-20 rounded-lg" />
             <Skeleton className="h-3 w-full rounded-lg opacity-40" />
             <Skeleton className="h-3 w-2/3 rounded-lg opacity-40" />
             <Skeleton className="h-3 w-24 rounded-lg opacity-30" />
          </div>
        </div>
      </div>
    </div>
  );
}
