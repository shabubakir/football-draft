import { Skeleton, SkeletonCard, SkeletonText } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Nav skeleton */}
      <div className="flex items-center justify-between py-4">
        <Skeleton width="150px" height="40px" />
        <div className="flex gap-4">
          <Skeleton width="60px" height="30px" />
          <Skeleton width="60px" height="30px" />
          <Skeleton width="80px" height="30px" />
        </div>
      </div>

      {/* Hero skeleton */}
      <section className="mt-10 grid md:grid-cols-[1.4fr_1fr] gap-6">
        <div className="space-y-4">
          <Skeleton width="200px" height="16px" />
          <Skeleton width="400px" height="60px" />
          <Skeleton width="300px" height="16px" />
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white/60 p-5 space-y-3">
          <Skeleton width="150px" height="14px" />
          <Skeleton width="100px" height="30px" />
          <SkeletonText lines={2} />
          <Skeleton width="180px" height="40px" className="rounded-xl" />
        </div>
      </section>

      {/* Games grid skeleton */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <Skeleton width="120px" height="16px" />
          <div className="flex gap-2">
            <Skeleton width="80px" height="32px" className="rounded-lg" />
            <Skeleton width="80px" height="32px" className="rounded-lg" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
