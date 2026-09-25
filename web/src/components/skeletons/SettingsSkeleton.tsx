import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function SettingsSkeleton() {
  return (
    <div className="max-w-3xl space-y-10 animate-in fade-in duration-700">
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <Skeleton className="h-4 w-96 rounded-lg opacity-40" />
      </div>

      <div className="space-y-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-8 space-y-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 rounded-lg" />
                <Skeleton className="h-3.5 w-64 rounded-md opacity-40" />
              </div>
              <Skeleton className="w-10 h-5 rounded-full opacity-20" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
               {[...Array(2)].map((_, j) => (
                 <div key={j} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50">
                    <Skeleton className="h-4 w-32 rounded-lg opacity-50" />
                    <Skeleton className="w-8 h-4 rounded-md opacity-20" />
                 </div>
               ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
