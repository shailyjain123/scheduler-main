import { Skeleton, SkeletonAvatar, SkeletonText, SkeletonButton, GlassSkeleton } from "@/components/ui/skeleton";

export default function ContactProfileSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between border-b border-slate-100 bg-white px-5 py-4 gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <SkeletonAvatar size={56} className="opacity-10" />
          <div className="space-y-2 min-w-0">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32 rounded-md opacity-20" />
              <Skeleton className="h-4 w-32 rounded-md opacity-20" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg opacity-10" />
          <Skeleton className="h-9 w-20 rounded-lg opacity-10" />
          <Skeleton className="h-9 w-20 rounded-lg opacity-20" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-6 border-b border-slate-100 bg-white px-6 pt-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="pb-3 border-b-2 border-transparent">
            <Skeleton className="h-4 w-24 rounded-md opacity-10" />
          </div>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <Skeleton className="h-4 w-32 rounded-md opacity-10 mb-6" />
        {[1, 2, 3, 4].map(i => (
          <GlassSkeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>

      {/* Bottom Input Skeleton */}
      <div className="shrink-0 border-t border-slate-100 bg-white p-4">
        <div className="h-16 w-full rounded-xl bg-slate-50 border border-slate-100 flex items-center px-4 gap-3">
           <Skeleton className="h-6 w-full rounded-lg opacity-10" />
           <SkeletonButton className="h-8 w-24 rounded-lg opacity-20" />
        </div>
      </div>
    </div>
  );
}
