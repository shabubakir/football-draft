"use client";

// ============================================================
// /achievements — страница достижений
// ============================================================

import { useEffect, useState } from "react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import {
  getAchievements,
  type AchievementDef,
} from "@/lib/progression/achievement-service";

type AchievementState = {
  unlocked: boolean;
  progress: number; // 0-1
  unlockedAt: string | null;
};

export function AchievementsClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [states, setStates] = useState<Record<string, AchievementState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    try {
      setLoading(true);
      const r = await fetch("/api/progression/achievements");
      const d = await r.json();
      if (d.ok) {
        const map: Record<string, AchievementState> = {};
        for (const a of d.achievements) {
          map[a.id] = {
            unlocked: a.unlocked,
            progress: a.progress,
            unlockedAt: a.unlocked_at,
          };
        }
        setStates(map);
      } else {
        setError(d.error ?? "Ошибка загрузки");
      }
    } catch (e) {
      console.error(e);
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  const all = getAchievements();
  const unlockedCount = all.filter((a) => states[a.id]?.unlocked).length;

  return (
    <div className="min-h-screen bg-[#f6f3ec]">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Достижения</h1>
            <p className="text-stone-500 text-sm mt-1">
              {unlockedCount} из {all.length} открыто
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-amber-500">
              {unlockedCount}/{all.length}
            </div>
          </div>
        </div>

        {/* Прогресс-бар общего */}
        <div className="mb-8">
          <div className="h-3 rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${(unlockedCount / all.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Сетка достижений */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/60 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-600 font-semibold">{error}</p>
            <button
              onClick={load}
              className="mt-3 rounded-xl bg-red-600 text-white px-6 py-2 font-bold hover:bg-red-700 transition"
            >
              Повторить
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {all.map((a) => {
              const st = states[a.id] ?? { unlocked: false, progress: 0, unlockedAt: null };
              return (
                <AchievementCard
                  key={a.id}
                  def={a}
                  unlocked={st.unlocked}
                  progress={st.progress}
                  unlockedAt={st.unlockedAt}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// ---------- Карточка достижения ----------

function AchievementCard({
  def,
  unlocked,
  progress,
  unlockedAt,
}: {
  def: AchievementDef;
  unlocked: boolean;
  progress: number;
  unlockedAt: string | null;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        unlocked
          ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm"
          : "border-stone-200 bg-white/70"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
            unlocked ? "bg-amber-100" : "bg-stone-100 grayscale opacity-50"
          }`}
        >
          {unlocked ? def.icon : "🔒"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3
              className={`font-bold text-sm sm:text-base ${
                unlocked ? "text-stone-900" : "text-stone-400"
              }`}
            >
              {def.name}
            </h3>
            {unlocked && (
              <span className="text-[11px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                +{def.rewardXp} XP
              </span>
            )}
          </div>
          <p className={`text-xs mt-1 ${unlocked ? "text-stone-600" : "text-stone-400"}`}>
            {def.description}
          </p>

          {/* Прогресс-бар (если не открыто) */}
          {!unlocked && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full bg-stone-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress * 100, 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-stone-400 mt-1 text-right">
                {Math.round(progress * 100)}%
              </div>
            </div>
          )}

          {unlocked && unlockedAt && (
            <div className="text-[11px] text-stone-400 mt-2">
              Открыто: {new Date(unlockedAt).toLocaleDateString("ru-RU")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
