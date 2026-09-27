"use client";

import { useState, type ImgHTMLAttributes } from "react";
import Image from "next/image";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 0}
      height={height ?? 0}
      className={`${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300 ${className}`}
      onLoad={() => setLoaded(true)}
      style={{ width: "100%", height: "auto" }}
      unoptimized
      loading="lazy"
      {...props}
    />
  );
}
