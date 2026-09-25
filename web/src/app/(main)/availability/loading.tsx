import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in duration-500 max-w-4xl">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-48 mb-1" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-48" />
        </div>
        
        <div className="divide-y divide-slate-50">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <div key={day} className="p-6 flex items-start gap-8">
              <div className="w-32 flex items-center gap-3 shrink-0">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-32 rounded-xl" />
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-11 w-32 rounded-xl" />
                  <Skeleton className="h-10 w-10 rounded-xl" />
                </div>
              </div>
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            </div>
          ))}
        </div>

        <div className="p-8 bg-slate-50/50 flex justify-end">
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
