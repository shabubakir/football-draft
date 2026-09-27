// ============================================================
// ACHIEVEMENTS SYSTEM
// ============================================================

import type { GameStats } from "./game-stats";

// ---------- Achievement definition ----------

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  /**
   * Check if achievement is unlocked based on user data
   */
  check: (data: {
    totalGamesPlayed: number;
    winStreak: number;
    gameStats: Record<string, GameStats>;
  }) => boolean;
}

// ---------- Achievement definitions ----------

const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first_game",
    title: "Первая игра",
    description: "Сыграй свою первую игру",
    icon: "🎮",
    check: (data) => data.totalGamesPlayed >= 1,
  },
  {
    id: "on_fire",
    title: "В огне",
    description: "Выиграй 5 игр подряд",
    icon: "🔥",
    check: (data) => data.winStreak >= 5,
  },
  {
    id: "aim_master",
    title: "Мастер прицела",
    description: "Получи 800+ очков в CS2 Aim",
    icon: "🎯",
    check: (data) => (data.gameStats["cs2-aim"]?.bestScore ?? 0) >= 800,
  },
  {
    id: "skin_expert",
    title: "Эксперт по скинам",
    description: "Streak 10 в Higher/Lower",
    icon: "💰",
    check: (data) => (data.gameStats["cs2-hl"]?.bestStreak ?? 0) >= 10,
  },
  {
    id: "explorer",
    title: "Исследователь",
    description: "Сыграй 10 игр GeoGuessr",
    icon: "🌍",
    check: (data) => (data.gameStats["geoguessr"]?.gamesPlayed ?? 0) >= 10,
  },
  {
    id: "football_fan",
    title: "Футбольный фанат",
    description: "Сыграй 10 футбольных игр",
    icon: "⚽",
    check: (data) => {
      const footballGames = ["football-draft", "akinator"];
      const total = footballGames.reduce(
        (sum, game) => sum + (data.gameStats[game]?.gamesPlayed ?? 0),
        0
      );
      return total >= 10;
    },
  },
];

// ---------- Public API ----------

/**
 * Get all achievement definitions
 */
export function getAchievements(): AchievementDefinition[] {
  return [...ACHIEVEMENTS];
}

/**
 * Check which achievements are unlocked
 */
export function checkAchievements(data: {
  totalGamesPlayed: number;
  winStreak: number;
  gameStats: Record<string, GameStats>;
}): string[] {
  const unlocked: string[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (achievement.check(data)) {
      unlocked.push(achievement.id);
    }
  }
  return unlocked;
}

/**
 * Get achievement definition by ID
 */
export function getAchievementById(id: string): AchievementDefinition | null {
  return ACHIEVEMENTS.find((a) => a.id === id) ?? null;
}
