"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const GeoMultiplayer = dynamic(
  () => import("@/games/geoguessr/geo-multiplayer").then((m) => m.GeoMultiplayer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-xl mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-8 text-center">
            <small className="text-[11px] tracking-[0.25em] text-emerald-200">
              GEOGUESSR LITE
            </small>
            <div className="mt-3 text-2xl font-black tracking-tight">Загружаем…</div>
          </div>
          <div className="p-6">
            <div className="h-40 rounded-2xl bg-stone-100 animate-pulse" />
          </div>
        </div>
      </div>
    ),
  }
);

/**
 * Клиентская обёртка: достаём roomCode из params (Next 16 передаёт
 * params как Promise) и передаём в мультиплеер-компонент.
 */
export function GeoMultiplayerLoader({
  params,
}: {
  // page.tsx передаёт Promise<{roomCode?}>, [roomCode]/page.tsx — Promise<{roomCode}>.
  // Общим знаменателем опциональное поле.
  params: Promise<{ roomCode?: string }>;
}) {
  const [roomCode, setRoomCode] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    params.then((p) => {
      if (!cancelled) setRoomCode(p.roomCode ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

  return <GeoMultiplayer initialRoomCode={roomCode} />;
}

export default GeoMultiplayerLoader;
