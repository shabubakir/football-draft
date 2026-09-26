"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/nav";
import {
  buildLeaderboard,
  ensureProfile,
  getDeviceId,
  levelOf,
  rankOf,
  RANKS,
  type Leaderboard,
} from "@/lib/profile";

type Period = "day" | "week" | "all";

const PERIODS: Array<{ id: Period; label: string; sub: string }> = [
  { id: "all", label: "ВСЁ ВРЕМЯ", sub: "уровень · опыт · звание" },
  { id: "week", label: "НЕДЕЛЯ", sub: "активность за 7 дней" },
  { id: "day", label: "ДЕНЬ", sub: "кто в игре сегодня" },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("all");
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const deviceId = getDeviceId();
      const b = await buildLeaderboard(period, deviceId);
      if (!b) throw new Error("Supabase не настроен");
      setBoard(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <Nav />

      <small className="mt-10 block text-xs tracking-[0.2em] text-stone-500">
        FOOTBALL DRAFT · РЕЙТИНГ
      </small>
      <h1 className="mt-3 text-4xl sm:text-5xl font-black leading-tight">
        ТАБЛИЦА <em className="font-light italic text-stone-500">ЛИДЕРОВ</em>
      </h1>
      <p className="mt-3 max-w-lg text-stone-600 text-sm">
        Место определяется накопленным опытом. Уровень не сгорает —
        тренировочные матчи с другом опыт не дают, только «Угадай игрока»
        и «Сетка дня».
      </p>

      {/* Период */}
      <div className="mt-8 grid sm:grid-cols-3 gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              period === p.id
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 bg-white/60 hover:border-stone-400"
            }`}
          >
            <span className="block text-sm font-black">{p.label}</span>
            <span
              className={`block text-[11px] ${
                period === p.id ? "text-stone-300" : "text-stone-500"
              }`}
            >
              {p.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Звания */}
      <div className="mt-8 rounded-2xl border border-stone-200 bg-white/60 p-4">
        <small className="text-[11px] tracking-[0.2em] text-stone-500">
          ЗВАНИЯ ПО УРОВНЯМ
        </small>
        <div className="mt-3 flex flex-wrap gap-2">
          {RANKS.map((r) => (
            <span
              key={r.level}
              className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] text-stone-600"
            >
              <b className="text-stone-900">{r.level}</b> · {r.title}
            </span>
          ))}
        </div>
      </div>

      {/* Своё место */}
      {board?.my && (
        <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50/70 p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <small className="text-[11px] tracking-[0.2em] text-emerald-700">
              ВАШЕ МЕСТО
            </small>
            <div className="mt-1 text-2xl font-black">
              {board.myPlace ? `#${board.myPlace}` : "ВНЕ ТОП-100"}
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-baseline gap-2">
              <b>{board.my.display_name}</b>
              <span className="text-xs text-stone-500">
                ур. {board.my.level} · {board.my.rank} · {board.my.xp} XP
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-emerald-200/70 overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${board.my.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4">
          {error}
        </div>
      )}

      {/* Таблица */}
      <div className="mt-6 rounded-2xl border border-stone-200 bg-white/70 overflow-hidden">
        <div className="grid grid-cols-[3rem_1fr_5rem_7rem_5rem] gap-2 px-4 py-3 text-[11px] tracking-wider text-stone-500 border-b border-stone-200">
          <span>МЕСТО</span>
          <span>ИГРОК</span>
          <span className="text-right">УРОВЕНЬ</span>
          <span>ПРОГРЕСС</span>
          <span className="text-right">АКТИВНОСТЬ</span>
        </div>
        {loading && (
          <div className="px-4 py-8 text-center text-sm text-stone-400">
            Загружаем рейтинг…
          </div>
        )}
        {!loading &&
          board?.rows.map((r) => (
            <div
              key={r.device_id}
              className={`grid grid-cols-[3rem_1fr_5rem_7rem_5rem] gap-2 items-center px-4 py-3 border-b border-stone-100 text-sm ${
                board.my?.device_id === r.device_id ? "bg-emerald-50/60" : ""
              }`}
            >
              <span
                className={`font-black ${
                  r.place === 1
                    ? "text-amber-500"
                    : r.place === 2
                    ? "text-stone-400"
                    : r.place === 3
                    ? "text-amber-700"
                    : "text-stone-500"
                }`}
              >
                {String(r.place).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <b className="truncate block">{r.display_name}</b>
                <small className="text-stone-400 text-[11px]">{r.rank}</small>
              </span>
              <span className="text-right font-bold">{r.level}</span>
              <span>
                <span className="block h-1.5 rounded-full bg-stone-200 overflow-hidden">
                  <span
                    className="block h-full bg-stone-700"
                    style={{ width: `${r.progress}%` }}
                  />
                </span>
                <small className="text-[10px] text-stone-400">
                  {r.xp} XP
                </small>
              </span>
              <span className="text-right text-[11px] text-stone-500">
                {r.activeDays} ДН.
              </span>
            </div>
          ))}
        {!loading && board && board.rows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-stone-400">
            Пока никто не играет. Станьте первым лидером!
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-stone-400">
        В таблице показаны первые 100 игроков. Если ваше место ниже — личная
        строка всё равно появится выше.
      </p>
    </main>
  );
}
