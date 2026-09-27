"use client";

import { Suspense, lazy, type ComponentType } from "react";
import { Skeleton } from "@/components/skeleton";

// Ленивая загрузка компонентов с skeleton loader
export function lazyLoad<P extends Record<string, any>>(
  factory: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    skeleton?: React.ReactNode;
    width?: string | number;
    height?: string | number;
  }
) {
  const LazyComponent = lazy(factory);

  const SkeletonFallback = options?.skeleton ?? (
    <div
      className="w-full flex items-center justify-center"
      style={{
        width: options?.width || "100%",
        height: options?.height || "200px",
      }}
    >
      <Skeleton width="80%" height="150px" />
    </div>
  );

  return function LazyLoaded(props: P) {
    return (
      <Suspense fallback={SkeletonFallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
