import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-xl flex flex-col items-center text-center gap-6">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="flex flex-col gap-2 w-full">
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
        <div className="w-full h-px bg-slate-100" />
        <div className="flex flex-col gap-3 w-full">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-4 w-24 mx-auto" />
        </div>
      </div>
    </div>
  );
}
