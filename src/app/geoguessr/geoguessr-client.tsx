"use client";

import dynamic from "next/dynamic";

// Обёртка для next/dynamic со ssr:false.
// Саму страницу (page.tsx) нельзя делать client-компонентом,
// потому что в ней объявлен export const metadata.
const GeoGuessrGame = dynamic(
  () => import("@/games/geoguessr/geo-guessr-game").then((m) => m.GeoGuessrGame),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-xl mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-8 text-center">
            <small className="text-[11px] tracking-[0.25em] text-emerald-200">
              GEOGUESSR LITE
            </small>
            <div className="mt-3 text-2xl font-black tracking-tight">
              Загружаем игру…
            </div>
          </div>
          <div className="p-6">
            <div className="h-40 rounded-2xl bg-stone-100 animate-pulse" />
            <div className="mt-4 h-32 rounded-2xl bg-stone-100 animate-pulse" />
            <div className="mt-4 h-14 rounded-2xl bg-stone-200 animate-pulse" />
          </div>
        </div>
      </div>
    ),
  }
);

export default function GeoGuessrLoader() {
  return <GeoGuessrGame />;
}
