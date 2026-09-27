"use client";

// GeoGuessr Lite — точка входа страницы.
// Переключатель режимов: CLASSIC (одиночная, как было) и
// MULTIPLAYER (2–8 игроков, комната).
// Классический режим не тронут: при его выборе рендерим тот же
// GeoGuessrGame, что и раньше.

import dynamic from "next/dynamic";
import { useState } from "react";

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
            <div className="mt-4 h-14 rounded-2xl bg-stone-100 animate-pulse" />
          </div>
        </div>
      </div>
    ),
  }
);

const GeoMultiplayer = dynamic(
  () => import("@/games/geoguessr/geo-multiplayer").then((m) => m.GeoMultiplayer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-xl mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm p-10 text-center">
          <div className="text-stone-400 animate-pulse">Загружаем мультиплеер…</div>
        </div>
      </div>
    ),
  }
);

type Mode = "menu" | "classic" | "multiplayer";

export default function GeoGuessrLoader() {
  const [mode, setMode] = useState<Mode>("menu");

  // ---------- ВЫБОР РЕЖИМА ----------
  if (mode === "menu") {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-8 text-center">
            <small className="text-[11px] tracking-[0.25em] text-emerald-200">
              GEOGUESSR LITE
            </small>
            <h2 className="mt-3 text-3xl font-black tracking-tight">
              Выбери режим
            </h2>
            <p className="mt-2 text-emerald-100 text-sm">
              Отгадай, где снято фото — ставь точку на карте.
            </p>
          </div>

          <div className="p-6 grid sm:grid-cols-2 gap-3">
            {/* CLASSIC */}
            <button
              type="button"
              onClick={() => setMode("classic")}
              className="group rounded-2xl border-2 border-stone-200 hover:border-emerald-500 bg-white p-5 text-left transition"
            >
              <div className="text-3xl">🎯</div>
              <div className="mt-3 text-lg font-black text-stone-900 group-hover:text-emerald-700">
                CLASSIC
              </div>
              <div className="mt-1 text-xs text-stone-500 leading-relaxed">
                5 раундов соло. Фото → карта → точка → очки.
              </div>
              <div className="mt-3 text-[10px] tracking-[0.15em] font-black text-emerald-600">
                ИГРАТЬ ОДНОМУ →
              </div>
            </button>

            {/* MULTIPLAYER */}
            <button
              type="button"
              onClick={() => setMode("multiplayer")}
              className="group rounded-2xl border-2 border-stone-200 hover:border-emerald-500 bg-white p-5 text-left transition"
            >
              <div className="text-3xl">👥</div>
              <div className="mt-3 text-lg font-black text-stone-900 group-hover:text-emerald-700">
                MULTIPLAYER
              </div>
              <div className="mt-1 text-xs text-stone-500 leading-relaxed">
                Комната на 2–8 игроков. Одна локация на всех, своя точка у каждого.
              </div>
              <div className="mt-3 text-[10px] tracking-[0.15em] font-black text-emerald-600">
                ИГРАТЬ С ДРУЗЬЯМИ →
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- CLASSIC (одиночная, как раньше) ----------
  if (mode === "classic") {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={() => setMode("menu")}
          className="mb-4 text-xs font-black tracking-[0.15em] text-stone-500 hover:text-emerald-600 transition"
        >
          ← ВЫБОР РЕЖИМА
        </button>
        <GeoGuessrGame />
      </div>
    );
  }

  // ---------- MULTIPLAYER ----------
  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setMode("menu")}
        className="mb-4 text-xs font-black tracking-[0.15em] text-stone-500 hover:text-emerald-600 transition"
      >
        ← ВЫБОР РЕЖИМА
      </button>
      <GeoMultiplayer onExit={() => setMode("menu")} />
    </div>
  );
}
