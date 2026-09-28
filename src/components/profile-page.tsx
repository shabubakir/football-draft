"use client";

// ============================================================
// PROFILE PAGE — перестроен с прогресс-системой
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
import { getAllGames } from "@/lib/progression/game-registry";
import { getDailyMissions, getWeeklyMissions } from "@/lib/progression/mission-service";
import { Nav } from "./nav";
import { TitleSelector } from "./title-selector";

type GameStatRow = {
  game_id: string;
  stats: Record<string, number>;
};

type StreakRow = {
  current_streak: number;
  best_streak: number;
};

type MissionRow = {
  mission_id: string;
  progress: number;
  claimed: boolean;
  period: string;
  period_key: string;
};

type RecentResult = {
  id: string;
  game_id: string;
  won: boolean;
  score: number;
  xp_earned: number;
  created_at: string;
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [totalXp, setTotalXp] = useState(0);
  const [gameStats, setGameStats] = useState<Record<string, GameStatRow["stats"]>>({});
  const [streak, setStreak] = useState<StreakRow | null>(null);
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);
  const [achCount, setAchCount] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAll = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !user) return;

    // XP
    const { data: xpEvents } = await supabase
      .from("xp_events")
      .select("amount")
      .eq("user_id", user.id);
    setTotalXp((xpEvents ?? []).reduce((s, e) => s + (e.amount ?? 0), 0));

    // Game stats
    const { data: gs } = await supabase
      .from("user_game_stats")
      .select("game_id, stats")
      .eq("user_id", user.id);
    const map: Record<string, GameStatRow["stats"]> = {};
    for (const row of gs ?? []) {
      map[row.game_id] = row.stats as GameStatRow["stats"];
    }
    setGameStats(map);

    // Streak
    const { data: streakRow } = await supabase
      .from("user_streaks")
      .select("current_streak, best_streak")
      .eq("user_id", user.id)
      .maybeSingle();
    setStreak(streakRow ?? null);

    // Missions (daily + weekly)
    const todayKey = new Date().toISOString().slice(0, 10);
    const weekKey = weekKeyOf(new Date());

    const [dailyR, weeklyR] = await Promise.all([
      supabase
        .from("user_missions")
        .select("mission_id, progress, claimed, period, period_key")
        .eq("user_id", user.id)
        .eq("period", "daily"),
      supabase
        .from("user_missions")
        .select("mission_id, progress, claimed, period, period_key")
        .eq("user_id", user.id)
        .eq("period", "weekly"),
    ]);

    const allM: MissionRow[] = [...(dailyR.data ?? []), ...(weeklyR.data ?? [])];
    setMissions(allM.filter((m) => m.period_key === todayKey || m.period_key === weekKey));

    // Recent results
    const { data: results } = await supabase
      .from("game_results")
      .select("id, game_id, won, score, xp_earned, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentResults((results ?? []) as RecentResult[]);

    // Achievements count
    const { data: achs } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", user.id);
    setAchCount((achs ?? []).length);
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

  const level = levelFromXp(totalXp);
  const progress = levelProgress(totalXp);
  const rank = rankOf(level);
  const nextLevelXp = xpForLevel(level + 1);
  const curLevelXp = xpForLevel(level);

  const totalGames = Object.values(gameStats).reduce((s, st) => s + (st.gamesPlayed ?? 0), 0);
  const totalWins = Object.values(gameStats).reduce((s, st) => s + (st.wins ?? 0), 0);
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const dailyDefs = getDailyMissions();
  const weeklyDefs = getWeeklyMissions();

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="border-b border-stone-200 bg-white px-4 py-3">
        <Nav />
      </div>

      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* === Шапка профиля === */}
          <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-8 text-center relative">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-white/20 mx-auto flex items-center justify-center text-4xl ring-4 ring-white/30">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  "👤"
                )}
              </div>
              <h1 className="mt-4 text-3xl font-black">{user.username}</h1>
              <p className="mt-1 text-emerald-200">{rank.title}</p>
              <p className="mt-1 text-emerald-300 text-sm">
                В игре с {new Date(user.created_at).toLocaleDateString("ru-RU")}
              </p>
            </div>

            {/* Уровень + XP */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-black text-stone-900">Уровень {level}</span>
                <span className="text-sm text-stone-500">{totalXp} XP</span>
              </div>
              <div className="h-4 rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-stone-400 mt-1">
                <span>{totalXp - curLevelXp} XP</span>
                <span>{nextLevelXp - curLevelXp} XP до {level + 1}</span>
              </div>
            </div>

            {/* Стат-грид */}
            <div className="px-6 pb-6">
              <div className="grid grid-cols-4 gap-2">
                <StatBox value={String(totalGames)} label="Игр" />
                <StatBox value={String(totalWins)} label="Побед" accent="text-emerald-600" />
                <StatBox value={`${winRate}%`} label="Win rate" accent="text-amber-600" />
                <StatBox value={String(streak?.current_streak ?? 0)} label="Streak 🔥" accent="text-red-500" />
              </div>
            </div>
          </div>

          {/* === Миссии === */}
          {(dailyDefs.length > 0 || weeklyDefs.length > 0) && (
            <div className="rounded-3xl border border-stone-200 bg-white shadow-sm p-6">
              <h2 className="text-sm font-bold text-stone-500 mb-4">🎯 МИССИИ</h2>
              <div className="space-y-4">
                {dailyDefs.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-stone-400 mb-2">ЕЖЕДНЕВНЫЕ</h3>
                    <div className="space-y-2">
                      {dailyDefs.map((m) => {
                        const row = missions.find((r) => r.mission_id === m.id && r.period === "daily");
                        const prog = row?.progress ?? 0;
                        const done = prog >= m.target;
                        const claimed = row?.claimed ?? false;
                        return (
                          <MissionRow
                            key={m.id}
                            title={m.name}
                            icon="📅"
                            progress={Math.min(prog, m.target)}
                            target={m.target}
                            reward={m.rewardXp}
                            done={done}
                            claimed={claimed}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                {weeklyDefs.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-stone-400 mb-2">ЕЖЕНЕДЕЛЬНЫЕ</h3>
                    <div className="space-y-2">
                      {weeklyDefs.map((m) => {
                        const row = missions.find((r) => r.mission_id === m.id && r.period === "weekly");
                        const prog = row?.progress ?? 0;
                        const done = prog >= m.target;
                        const claimed = row?.claimed ?? false;
                        return (
                          <MissionRow
                            key={m.id}
                            title={m.name}
                            icon="📆"
                            progress={Math.min(prog, m.target)}
                            target={m.target}
                            reward={m.rewardXp}
                            done={done}
                            claimed={claimed}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === Титулы === */}
          <div className="rounded-3xl border border-stone-200 bg-white shadow-sm p-6">
            <TitleSelector />
          </div>

          {/* === Статистика по играм === */}
          <div className="rounded-3xl border border-stone-200 bg-white shadow-sm p-6">
            <h2 className="text-sm font-bold text-stone-500 mb-4">🎮 ИГРЫ</h2>
            <div className="space-y-2">
              {Object.entries(gameStats).map(([gid, st]) => {
                const reg = getAllGames().find((g) => g.id === gid);
                const name = reg ? `${reg.icon} ${reg.name}` : gid;
                let meta = `${st.gamesPlayed ?? 0} игр`;
                if (gid === "cs2-map-guess") {
                  meta = `${st.gamesPlayed ?? 0} игр · рекорд ${st.bestScore ?? 0} · верно ${st.correctAnswers ?? 0}/${(st.correctAnswers ?? 0) + (st.wrongAnswers ?? 0)} · серия ${st.bestStreak ?? 0}`;
                } else if (gid === "reaction-test") {
                  meta = `${st.gamesPlayed ?? 0} игр · рекорд ${st.bestReaction > 0 ? `${st.bestReaction} ms` : "—"} · попыток ${st.totalAttempts ?? 0} · серия ${st.bestStreak ?? 0}`;
                } else {
                  const games = st.gamesPlayed ?? 0;
                  const wins = st.wins ?? 0;
                  const wr = games > 0 ? Math.round((wins / games) * 100) : 0;
                  meta = `${games} игр · ${wins} побед · ${wr}%`;
                }
                return (
                  <div key={gid} className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-700 text-sm">{name}</span>
                      <span className="text-xs text-stone-500">{meta}</span>
                    </div>
                  </div>
                );
              })}
              {Object.keys(gameStats).length === 0 && (
                <p className="text-sm text-stone-400 text-center py-4">Пока нет статистики</p>
              )}
            </div>
          </div>

          {/* === Последние результаты === */}
          {recentResults.length > 0 && (
            <div className="rounded-3xl border border-stone-200 bg-white shadow-sm p-6">
              <h2 className="text-sm font-bold text-stone-500 mb-4">📋 ПОСЛЕДНИЕ РЕЗУЛЬТАТЫ</h2>
              <div className="space-y-2">
                {recentResults.map((r) => {
                  const reg = getAllGames().find((g) => g.id === r.game_id);
                  return (
                    <div key={r.id} className="flex items-center justify-between text-sm rounded-xl px-3 py-2 hover:bg-stone-50">
                      <span className={r.won ? "text-emerald-600 font-bold" : "text-stone-400"}>
                        {r.won ? "🏆" : "✖"} {reg?.name ?? r.game_id}
                      </span>
                      <span className="text-stone-500 text-xs">
                        +{r.xp_earned} XP · {new Date(r.created_at).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* === Быстрые ссылки === */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/achievements"
              className="rounded-2xl border-2 border-stone-900 text-stone-900 font-black py-4 text-center hover:bg-stone-100 transition"
            >
              🏆 ДОСТИЖЕНИЯ
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-2xl border-2 border-stone-900 text-stone-900 font-black py-4 text-center hover:bg-stone-100 transition"
            >
              📊 РЕЙТИНГ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Вспомогательные ----------

function StatBox({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 border border-stone-200 p-3 text-center">
      <div className={`text-xl font-black ${accent ?? "text-stone-900"}`}>{value}</div>
      <div className="text-[11px] text-stone-500 mt-1">{label}</div>
    </div>
  );
}

function MissionRow({
  title,
  icon,
  progress,
  target,
  reward,
  done,
  claimed,
}: {
  title: string;
  icon: string;
  progress: number;
  target: number;
  reward: number;
  done: boolean;
  claimed: boolean;
}) {
  const pct = Math.min((progress / target) * 100, 100);
  return (
    <div className={`rounded-xl border p-3 ${done ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-stone-700">{icon} {title}</span>
        <span className="text-xs font-bold text-amber-600">+{reward} XP</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-stone-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${done ? "bg-emerald-500" : "bg-stone-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-stone-400 mt-1">
        <span>{progress}/{target}</span>
        {claimed && <span className="text-emerald-500 font-bold">✓ Получено</span>}
      </div>
    </div>
  );
}

function weekKeyOf(d: Date): string {
  // ISO week: Monday as start
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  date.setDate(date.getDate() - diff);
  return date.toISOString().slice(0, 10);
}
