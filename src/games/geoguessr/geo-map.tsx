"use client";

// Интерактивная карта на Leaflet + OpenStreetMap.
//
// ВАЖНО: Leaflet обращается к `document`/`window` при загрузке
// модуля, поэтому он подгружается динамически (только на клиенте,
// после гидратации). Иначе SSR роняет страницу ошибкой
// "window is not defined".

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// next/dynamic с ssr:false → модуль (и его CSS) подгружается только в браузере
const GeoMapImpl = dynamic(
  () => import("./geo-map-impl").then((m) => m.GeoMapImpl),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-stone-100">
        <span className="text-stone-400 text-sm animate-pulse">Загружаем карту…</span>
      </div>
    ),
  }
);

export interface GeoMapProps {
  // начальное положение карты
  center?: [number, number];
  zoom?: number;

  // точка игрока (можно двигать кликом, пока не подтверждена)
  guess: [number, number] | null;
  onGuessChange?: (lat: number, lng: number) => void;

  // после подтверждения: правильная точка + линия
  reveal?: {
    correct: [number, number];
    correctLabel: string;
    guessLabel?: string | null;
    distanceText?: string | null;
    points?: number | null;
  } | null;

  // блокировка кликов (во время показа результата)
  locked?: boolean;

  className?: string;
}

export function GeoMap(props: GeoMapProps) {
  return <GeoMapImpl {...props} />;
}
