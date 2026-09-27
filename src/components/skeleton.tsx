// Skeleton loader для плавной загрузки контента

export function Skeleton({
  width,
  height,
  className = "",
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-stone-200 dark:bg-stone-700 ${className}`}
      style={{
        width: width || "100%",
        height: height || "1rem",
      }}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? "60%" : "100%"}
          height="1rem"
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
      <Skeleton width="40%" height="1rem" />
      <Skeleton width="70%" height="2rem" />
      <SkeletonText lines={2} />
      <div className="pt-4 border-t border-stone-100">
        <Skeleton width="30%" height="0.75rem" />
      </div>
    </div>
  );
}

export function SkeletonGameCard() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden flex flex-col">
      <div className="p-5 space-y-3">
        <Skeleton width="30%" height="0.75rem" />
        <Skeleton width="60%" height="2rem" />
        <SkeletonText lines={2} />
      </div>
      <div className="mt-auto px-5 py-4 border-t border-stone-100 flex justify-between">
        <Skeleton width="40%" height="0.75rem" />
        <Skeleton width="20%" height="0.75rem" />
      </div>
    </div>
  );
}
