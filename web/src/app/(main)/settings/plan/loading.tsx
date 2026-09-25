import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in duration-500 max-w-5xl">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-48 mb-1" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-6 relative overflow-hidden">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-12 w-full rounded-2xl mt-4" />
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-6">
        <Skeleton className="h-6 w-48" />
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    </div>
  );
}
