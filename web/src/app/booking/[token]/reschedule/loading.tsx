import BookingSkeleton from "@/components/skeletons/BookingSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 lg:p-8">
      <BookingSkeleton />
    </div>
  );
}
