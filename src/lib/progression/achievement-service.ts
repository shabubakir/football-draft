// ============================================================
// ACHIEVEMENT SERVICE — check and unlock achievements
// ============================================================
// Extensible: add new achievements to ACHIEVEMENTS array.
// Each has a check function that receives aggregated user data.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameResult } from "./types";

// ---------- Achievement definitions ----------

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  rewardXp: number;
  /** Check if unlocked. Returns true if requirement met. */
  check: (data: AchievementCheckData) => boolean;
  /** Get progress towards completion (0-1) for UI */
  progress?: (data: AchievementCheckData) => number;
}

export interface AchievementCheckData {
  totalGamesPlayed: number;
  totalWins: number;
  winStreak: number;
  gameStats: Record<string, Record<string, number>>;
  level: number;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_game",
    name: "Первая игра",
    description: "Сыграй свою первую игру",
    icon: "🎮",
    rewardXp: 10,
    check: (d) => d.totalGamesPlayed >= 1,
    progress: (d) => Math.min(d.totalGamesPlayed / 1, 1),
  },
  {
    id: "on_fire",
    name: "В огне",
    description: "Выиграй 5 игр подряд",
    icon: "🔥",
    rewardXp: 50,
    check: (d) => d.winStreak >= 5,
    progress: (d) => Math.min(d.winStreak / 5, 1),
  },
  {
    id: "explorer",
    name: "Исследователь",
    description: "Сыграй 10 игр GeoGuessr",
    icon: "🌍",
    rewardXp: 30,
    check: (d) => (d.gameStats["geoguessr"]?.gamesPlayed ?? 0) >= 10,
    progress: (d) =>
      Math.min((d.gameStats["geoguessr"]?.gamesPlayed ?? 0) / 10, 1),
  },
  {
    id: "football_fan",
    name: "Футбольный фанат",
    description: "Сыграй 20 футбольных игр",
    icon: "⚽",
    rewardXp: 40,
    check: (d) => {
      const footballGames = ["football-draft", "grid-day", "guess-player", "career", "quiz"];
      const total = footballGames.reduce(
        (sum, g) => sum + (d.gameStats[g]?.gamesPlayed ?? 0),
        0
      );
      return total >= 20;
    },
    progress: (d) => {
      const footballGames = ["football-draft", "grid-day", "guess-player", "career", "quiz"];
      const total = footballGames.reduce(
        (sum, g) => sum + (d.gameStats[g]?.gamesPlayed ?? 0),
        0
      );
      return Math.min(total / 20, 1);
    },
  },
  {
    id: "aim_master",
    name: "Мастер прицела",
    description: "Получи 1000+ очков в CS2 Aim",
    icon: "🎯",
    rewardXp: 30,
    check: (d) => (d.gameStats["cs2-aim"]?.bestScore ?? 0) >= 1000,
    progress: (d) =>
      Math.min((d.gameStats["cs2-aim"]?.bestScore ?? 0) / 1000, 1),
  },
  {
    id: "skin_expert",
    name: "Эксперт по скинам",
    description: "Streak 10 в Higher/Lower",
    icon: "💰",
    rewardXp: 25,
    check: (d) => (d.gameStats["cs2-hl"]?.bestStreak ?? 0) >= 10,
    progress: (d) =>
      Math.min((d.gameStats["cs2-hl"]?.bestStreak ?? 0) / 10, 1),
  },
  {
    id: "quiz_master",
    name: "Мастер викторин",
    description: "Ответь правильно на 50 вопросов",
    icon: "🧠",
    rewardXp: 30,
    check: (d) => (d.gameStats["quiz"]?.correctAnswers ?? 0) >= 50,
    progress: (d) =>
      Math.min((d.gameStats["quiz"]?.correctAnswers ?? 0) / 50, 1),
  },
  {
    id: "winner",
    name: "Победитель",
    description: "Выиграй 25 игр",
    icon: "🏆",
    rewardXp: 50,
    check: (d) => d.totalWins >= 25,
    progress: (d) => Math.min(d.totalWins / 25, 1),
  },
  {
    id: "veteran",
    name: "Ветеран",
    description: "Достигни Level 20",
    icon: "💎",
    rewardXp: 100,
    check: (d) => d.level >= 20,
    progress: (d) => Math.min(d.level / 20, 1),
  },
  {
    id: "streak_7",
    name: "Неделя в игре",
    description: "7-day streak",
    icon: "📅",
    rewardXp: 50,
    check: (d) => (d as any).streakDays >= 7,
    progress: (d) => Math.min((d as any).streakDays / 7, 1),
  },
  {
    id: "streak_30",
    name: "Месяц в игре",
    description: "30-day streak",
    icon: "🗓️",
    rewardXp: 200,
    check: (d) => (d as any).streakDays >= 30,
    progress: (d) => Math.min((d as any).streakDays / 30, 1),
  },
  {
    id: "geo_expert",
    name: "Географ",
    description: "Сыграй 25 GeoGuessr с best score 5000+",
    icon: "🗺️",
    rewardXp: 50,
    check: (d) =>
      (d.gameStats["geoguessr"]?.gamesPlayed ?? 0) >= 25 &&
      (d.gameStats["geoguessr"]?.bestScore ?? 0) >= 5000,
    progress: (d) => {
      const games = Math.min(
        (d.gameStats["geoguessr"]?.gamesPlayed ?? 0) / 25,
        1
      );
      const score = Math.min((d.gameStats["geoguessr"]?.bestScore ?? 0) / 5000, 1);
      return (games + score) / 2;
    },
  },
  {
    id: "cs2_veteran",
    name: "CS2 Ветеран",
    description: "Сыграй 50 CS2 игр (Aim + HL + Cases)",
    icon: "🔫",
    rewardXp: 40,
    check: (d) => {
      const cs2Games = ["cs2-cases", "cs2-aim", "cs2-hl"];
      const total = cs2Games.reduce(
        (sum, g) => sum + (d.gameStats[g]?.gamesPlayed ?? 0),
        0
      );
      return total >= 50;
    },
    progress: (d) => {
      const cs2Games = ["cs2-cases", "cs2-aim", "cs2-hl"];
      const total = cs2Games.reduce(
        (sum, g) => sum + (d.gameStats[g]?.gamesPlayed ?? 0),
        0
      );
      return Math.min(total / 50, 1);
    },
  },
  {
    id: "first_map",
    name: "FIRST MAP",
    description: "Сыграй первую игру CS2 Map Guess",
    icon: "🗺️",
    rewardXp: 15,
    check: (d) => (d.gameStats["cs2-map-guess"]?.gamesPlayed ?? 0) >= 1,
    progress: (d) =>
      Math.min((d.gameStats["cs2-map-guess"]?.gamesPlayed ?? 0) / 1, 1),
  },
  {
    id: "map_reader",
    name: "MAP READER",
    description: "20 правильных ответов в CS2 Map Guess",
    icon: "📖",
    rewardXp: 40,
    check: (d) => (d.gameStats["cs2-map-guess"]?.correctAnswers ?? 0) >= 20,
    progress: (d) =>
      Math.min((d.gameStats["cs2-map-guess"]?.correctAnswers ?? 0) / 20, 1),
  },
  {
    id: "map_master",
    name: "MAP MASTER",
    description: "90% точности в CS2 Map Guess (20+ ответов)",
    icon: "🎯",
    rewardXp: 60,
    check: (d) => {
      const s = d.gameStats["cs2-map-guess"];
      if (!s) return false;
      const total = (s.correctAnswers ?? 0) + (s.wrongAnswers ?? 0);
      return total >= 20 && s.correctAnswers! / total >= 0.9;
    },
    progress: (d) => {
      const s = d.gameStats["cs2-map-guess"];
      if (!s) return 0;
      const total = (s.correctAnswers ?? 0) + (s.wrongAnswers ?? 0);
      const acc = total > 0 ? s.correctAnswers! / total : 0;
      return Math.min((total / 20) * acc, 1);
    },
  },
  {
    id: "cartographer",
    name: "CARTOGRAPHER",
    description: "100 правильных ответов в CS2 Map Guess",
    icon: "🏆",
    rewardXp: 100,
    check: (d) => (d.gameStats["cs2-map-guess"]?.correctAnswers ?? 0) >= 100,
    progress: (d) =>
      Math.min((d.gameStats["cs2-map-guess"]?.correctAnswers ?? 0) / 100, 1),
  },
  {
    id: "quick_hands",
    name: "QUICK HANDS",
    description: "Реакция < 200 ms в Reaction Test",
    icon: "⚡",
    rewardXp: 30,
    check: (d) => {
      const br = d.gameStats["reaction-test"]?.bestReaction ?? 0;
      return br > 0 && br < 200;
    },
    progress: (d) => {
      const br = d.gameStats["reaction-test"]?.bestReaction ?? 0;
      if (br <= 0) return 0;
      return br >= 200 ? 0 : Math.max(0, 1 - br / 200);
    },
  },
  {
    id: "lightning",
    name: "LIGHTNING",
    description: "Реакция < 150 ms в Reaction Test",
    icon: "🌩️",
    rewardXp: 60,
    check: (d) => {
      const br = d.gameStats["reaction-test"]?.bestReaction ?? 0;
      return br > 0 && br < 150;
    },
    progress: (d) => {
      const br = d.gameStats["reaction-test"]?.bestReaction ?? 0;
      if (br <= 0) return 0;
      return br >= 150 ? 0 : Math.max(0, 1 - br / 150);
    },
  },
  {
    id: "consistent",
    name: "CONSISTENT",
    description: "5 попыток подряд без false start",
    icon: "🎯",
    rewardXp: 40,
    check: (d) => (d.gameStats["reaction-test"]?.bestStreak ?? 0) >= 5,
    progress: (d) =>
      Math.min((d.gameStats["reaction-test"]?.bestStreak ?? 0) / 5, 1),
  },
  {
    id: "all_rounder",
    name: "Универсал",
    description: "Сыграй во все 12 игр",
    icon: "🎪",
    rewardXp: 100,
    check: (d) => {
      const allGames = [
        "football-draft", "grid-day", "guess-player", "career", "quiz",
        "cs2-cases", "cs2-aim", "cs2-hl", "cs2-map-guess",
        "reaction-test", "akinator", "geoguessr",
      ];
      return allGames.every((g) => (d.gameStats[g]?.gamesPlayed ?? 0) >= 1);
    },
    progress: (d) => {
      const allGames = [
        "football-draft", "grid-day", "guess-player", "career", "quiz",
        "cs2-cases", "cs2-aim", "cs2-hl", "cs2-map-guess",
        "reaction-test", "akinator", "geoguessr",
      ];
      const played = allGames.filter(
        (g) => (d.gameStats[g]?.gamesPlayed ?? 0) >= 1
      ).length;
      return played / allGames.length;
    },
  },
  {
    id: "legend",
    name: "Легенда",
    description: "Достигни Level 50",
    icon: "👑",
    rewardXp: 500,
    check: (d) => d.level >= 50,
    progress: (d) => Math.min(d.level / 50, 1),
  },
];

// ---------- Public API ----------

export function getAchievements(): AchievementDef[] {
  return [...ACHIEVEMENTS];
}

export function getAchievementById(id: string): AchievementDef | null {
  return ACHIEVEMENTS.find((a) => a.id === id) ?? null;
}

/**
 * Check which achievements should be unlocked and insert them.
 * Returns array of newly unlocked achievement IDs.
 */
export async function checkAndUnlockAchievements(
  supabase: SupabaseClient,
  userId: string,
  _result: GameResult
): Promise<string[]> {
  // Fetch current game stats
  const { data: statsRows } = await supabase
    .from("user_game_stats")
    .select("game_id, stats")
    .eq("user_id", userId);

  const gameStats: Record<string, Record<string, number>> = {};
  let totalGamesPlayed = 0;
  let totalWins = 0;

  for (const row of statsRows ?? []) {
    const stats = (row.stats ?? {}) as Record<string, number>;
    gameStats[row.game_id] = stats;
    totalGamesPlayed += stats.gamesPlayed ?? 0;
    totalWins += stats.wins ?? 0;
  }

  // Fetch total XP for level
  const { data: xpEvents } = await supabase
    .from("xp_events")
    .select("amount")
    .eq("user_id", userId);
  const totalXp = (xpEvents ?? []).reduce((s, e) => s + e.amount, 0);

  const { levelFromXp } = await import("../xp");
  const level = levelFromXp(totalXp);

  // Fetch streak
  const { data: streakRow } = await supabase
    .from("user_streaks")
    .select("current_streak")
    .eq("user_id", userId)
    .maybeSingle();

  const checkData: AchievementCheckData & { streakDays: number } = {
    totalGamesPlayed,
    totalWins,
    winStreak: 0, // TODO: track win streak separately
    gameStats,
    level,
    streakDays: streakRow?.current_streak ?? 0,
  };

  // Fetch already unlocked
  const { data: unlockedRows } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);
  const alreadyUnlocked = new Set(
    (unlockedRows ?? []).map((r) => r.achievement_id)
  );

  // Check each achievement
  const newUnlocks: string[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (alreadyUnlocked.has(ach.id)) continue;
    if (ach.check(checkData as any)) {
      await supabase.from("user_achievements").insert({
        user_id: userId,
        achievement_id: ach.id,
      });

      // Award achievement XP
      if (ach.rewardXp > 0) {
        await supabase.from("xp_events").insert({
          user_id: userId,
          amount: ach.rewardXp,
          reason: "achievement",
          game_id: ach.id,
        });
      }

      newUnlocks.push(ach.id);
    }
  }

  return newUnlocks;
}
