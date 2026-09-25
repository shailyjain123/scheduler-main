import { Skeleton, SkeletonAvatar } from "@/components/ui/skeleton";

export default function MainLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] flex animate-in fade-in duration-500">
      {/* Sidebar Placeholder */}
      <div className="hidden lg:flex w-[220px] bg-white border-r border-[#f0f1f3] flex-col p-6 gap-8">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="h-4 w-24 rounded-lg" />
        </div>
        <div className="flex flex-col gap-6 mt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="h-3 w-28 rounded-md opacity-40" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Placeholder */}
      <div className="flex-1 flex flex-col">
        {/* Header Placeholder */}
        <div className="h-16 bg-white border-b border-[#f0f1f3] flex items-center justify-between px-8">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <div className="flex items-center gap-4">
            <Skeleton className="w-8 h-8 rounded-full opacity-30" />
            <SkeletonAvatar size={32} className="opacity-40" />
          </div>
        </div>

        {/* Page Content Placeholder */}
        <div className="flex-1 p-8 space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-8 w-48 rounded-xl" />
            <Skeleton className="h-4 w-80 rounded-lg opacity-40" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-3xl bg-white/50 border border-white" />
            ))}
          </div>
          <Skeleton className="h-[400px] w-full rounded-3xl bg-white/50 border border-white" />
        </div>
      </div>
    </div>
  );
}
