"use client";

// ============================================================
// PROGRESS CARD — компактный блок прогресса для главной
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import { getSupabaseBrowser } from "@/lib/auth";
import { levelFromXp, levelProgress, rankOf } from "@/lib/xp";

export function ProgressCard() {
  const { user, loading } = useAuth();
  const [totalXp, setTotalXp] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);

  useEffect(() => {
    if (!user) return;
    const sb = getSupabaseBrowser();
    if (!sb) return;
    let cancelled = false;

    (async () => {
      const [{ data: xpEvents }, { data: streakRow }, { data: gs }] = await Promise.all([
        sb.from("xp_events").select("amount").eq("user_id", user.id),
        sb.from("user_streaks").select("current_streak").eq("user_id", user.id).maybeSingle(),
        sb.from("user_game_stats").select("stats").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      setTotalXp((xpEvents ?? []).reduce((s, e) => s + (e.amount ?? 0), 0));
      setStreakDays(streakRow?.current_streak ?? 0);
      setGamesPlayed((gs ?? []).reduce((s, r) => s + ((r.stats as any)?.gamesPlayed ?? 0), 0));
    })();

    return () => { cancelled = true; };
  }, [user]);

  if (loading || !user) return null;

  const level = levelFromXp(totalXp);
  const progress = levelProgress(totalXp);
  const rank = rankOf(level);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-lg font-black">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <div className="font-black text-white">{user.username}</div>
            <div className="text-xs text-stone-400">{rank.title}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-emerald-400">Lvl {level}</div>
          {streakDays > 0 && (
            <div className="text-xs font-bold text-amber-400">🔥 {streakDays} дн.</div>
          )}
        </div>
      </div>

      {/* XP bar */}
      <div className="mt-4">
        <div className="flex justify-between text-[11px] text-stone-400 mb-1">
          <span>{totalXp} XP</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href="/profile"
          className="flex-1 rounded-xl bg-white/5 border border-white/10 text-stone-200 text-xs font-bold py-2 text-center hover:bg-white/10 transition"
        >
          📊 ПРОФИЛЬ
        </Link>
        <Link
          href="/achievements"
          className="flex-1 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold py-2 text-center hover:bg-amber-400/20 transition"
        >
          🏆 ДОСТИЖЕНИЯ
        </Link>
      </div>
    </div>
  );
}
