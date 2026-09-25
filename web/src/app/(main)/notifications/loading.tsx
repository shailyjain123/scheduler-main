import NotificationSkeleton from "@/components/skeletons/NotificationSkeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto w-full py-8">
      <NotificationSkeleton />
    </div>
  );
}
