"use client";

// ============================================================
// PROFILE PAGE
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import { getSupabaseBrowser } from "@/lib/auth";
import {
  levelFromXp,
  levelProgress,
  rankOf,
  xpForLevel,
} from "@/lib/xp";
import type { GameStats } from "@/lib/game-stats";

interface ProfileStats {
  total_xp: number;
  games_played: number;
  game_stats: Record<string, GameStats>;
  achievements: string[];
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  const loadStats = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !user) return;

    // Load XP
    const { data: xpEvents } = await supabase
      .from("xp_events")
      .select("amount")
      .eq("user_id", user.id);

    const totalXp = (xpEvents ?? []).reduce((sum, e) => sum + e.amount, 0);

    // Load game stats
    const { data: gameStats } = await supabase
      .from("user_game_stats")
      .select("game_id, stats")
      .eq("user_id", user.id);

    const statsObj: Record<string, GameStats> = {};
    let totalGames = 0;
    for (const gs of gameStats ?? []) {
      statsObj[gs.game_id] = gs.stats as GameStats;
      totalGames += (gs.stats as GameStats).gamesPlayed ?? 0;
    }

    // Load achievements
    const { data: userAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", user.id);

    setStats({
      total_xp: totalXp,
      games_played: totalGames,
      game_stats: statsObj,
      achievements: (userAchievements ?? []).map((a) => a.achievement_id),
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-stone-500 animate-pulse">Загрузка профиля...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-stone-600">Вы не авторизованы</p>
        <Link
          href="/login"
          className="rounded-2xl bg-emerald-600 text-white font-black px-6 py-3 hover:bg-emerald-500 transition"
        >
          ВОЙТИ
        </Link>
      </div>
    );
  }

  const level = stats ? levelFromXp(stats.total_xp) : 1;
  const progress = stats ? levelProgress(stats.total_xp) : 0;
  const rank = rankOf(level);
  const nextLevelXp = xpForLevel(level + 1);

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-8 text-center">
            <div className="w-24 h-24 rounded-full bg-white/20 mx-auto flex items-center justify-center text-4xl">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                "👤"
              )}
            </div>
            <h1 className="mt-4 text-3xl font-black">{user.username}</h1>
            <p className="mt-1 text-emerald-200">
              Уровень {level} · {rank.title}
            </p>
            <p className="mt-1 text-emerald-300 text-sm">
              В игре с {new Date(user.created_at).toLocaleDateString("ru-RU")}
            </p>
          </div>

          {/* XP Bar */}
          <div className="p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-stone-600">
                XP: {stats?.total_xp ?? 0} / {nextLevelXp}
              </span>
              <span className="text-stone-500">{progress}%</span>
            </div>
            <div className="mt-2 h-4 rounded-full bg-stone-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="px-6 pb-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 text-center">
                <div className="text-2xl font-black text-stone-900">
                  {stats?.games_played ?? 0}
                </div>
                <div className="text-xs text-stone-500 mt-1">Игр сыграно</div>
              </div>
              <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 text-center">
                <div className="text-2xl font-black text-emerald-600">
                  {stats?.total_xp ?? 0}
                </div>
                <div className="text-xs text-stone-500 mt-1">Всего XP</div>
              </div>
              <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 text-center">
                <div className="text-2xl font-black text-amber-600">
                  {stats?.achievements.length ?? 0}
                </div>
                <div className="text-xs text-stone-500 mt-1">Достижений</div>
              </div>
            </div>
          </div>

          {/* Game Stats */}
          {stats && Object.keys(stats.game_stats).length > 0 && (
            <div className="px-6 pb-6">
              <h2 className="text-sm font-bold text-stone-600 mb-3">
                СТАТИСТИКА ИГР
              </h2>
              <div className="space-y-2">
                {Object.entries(stats.game_stats).map(([gameId, gameStat]) => (
                  <div
                    key={gameId}
                    className="rounded-xl border border-stone-200 p-3 flex items-center justify-between"
                  >
                    <span className="font-bold text-stone-900">
                      {gameId.replace(/-/g, " ")}
                    </span>
                    <span className="text-sm text-stone-500">
                      {gameStat.gamesPlayed} игр
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {stats && stats.achievements.length > 0 && (
            <div className="px-6 pb-6">
              <h2 className="text-sm font-bold text-stone-600 mb-3">
                ДОСТИЖЕНИЯ
              </h2>
              <div className="flex flex-wrap gap-2">
                {stats.achievements.map((id) => (
                  <span
                    key={id}
                    className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-sm font-bold"
                  >
                    🏆 {id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-6 pb-6 space-y-3">
            <Link
              href="/settings"
              className="block w-full rounded-2xl border-2 border-stone-900 text-stone-900 font-black py-3 text-center hover:bg-stone-100 transition"
            >
              НАСТРОЙКИ
            </Link>
            <Link
              href="/"
              className="block w-full rounded-2xl bg-stone-100 text-stone-600 font-black py-3 text-center hover:bg-stone-200 transition"
            >
              НА ГЛАВНУЮ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
