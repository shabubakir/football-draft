import { Skeleton } from "@/components/skeleton";

// Универсальный loading state для игровых страниц
export function GameLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton width="120px" height="14px" />
            <Skeleton width="250px" height="32px" />
            <Skeleton width="300px" height="14px" />
          </div>
          <Skeleton width="100px" height="50px" className="rounded-xl" />
        </div>

        {/* Main content skeleton */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Skeleton width="100%" height="300px" className="rounded-2xl" />
            <Skeleton width="100%" height="60px" className="rounded-xl" />
          </div>
          <div className="space-y-3">
            <Skeleton width="100%" height="150px" className="rounded-xl" />
            <Skeleton width="100%" height="150px" className="rounded-xl" />
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex gap-3">
          <Skeleton width="150px" height="48px" className="rounded-xl" />
          <Skeleton width="150px" height="48px" className="rounded-xl" />
        </div>
      </div>
    </div>
  );
}
