import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 flex flex-col gap-6">
          {/* Personal Information Skeleton */}
          <section className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3] p-6">
            <div className="flex items-center justify-between gap-3 mb-6">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-6 w-48 flex-1" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>

            <div className="flex items-center gap-8 mb-10 pb-10 border-b border-[#f0f1f3]">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-6 w-32 rounded-lg mt-2" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-20 ml-1" />
                    <Skeleton className="h-12 w-full rounded-2xl" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 ml-1" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
              <div className="flex justify-end pt-4">
                <Skeleton className="h-12 w-32 rounded-xl" />
              </div>
            </div>
          </section>

          {/* Account Security Skeleton */}
          <section className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3] p-6">
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="divide-y divide-slate-50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="py-4 flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
