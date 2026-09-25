import ListSkeleton from "@/components/skeletons/ListSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-md" />
        <div className="h-4 w-64 bg-slate-200 animate-pulse rounded-md" />
      </div>
      <ListSkeleton columns={3} count={6} />
    </div>
  );
}
