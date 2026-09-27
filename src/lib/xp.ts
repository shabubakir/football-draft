// ============================================================
// XP & LEVEL SYSTEM — unified progress service
// ============================================================

// ---------- Level formula (easy to change) ----------

/**
 * XP required to reach a given level
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 250 XP
 * Level 4: 500 XP
 * Level N: 100 * (N-1) * N / 2 (triangular numbers * 100)
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 100 * ((level - 1) * level) / 2;
}

/**
 * Get level from total XP
 */
export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level++;
    if (level > 100) break; // safety cap
  }
  return level;
}

/**
 * Get XP progress within current level (0-100)
 */
export function levelProgress(xp: number): number {
  const level = levelFromXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const progress = xp - currentLevelXp;
  const needed = nextLevelXp - currentLevelXp;
  if (needed <= 0) return 0;
  return Math.floor((progress / needed) * 100);
}

// ---------- Ranks (titles) ----------

export interface Rank {
  level: number;
  title: string;
}

export const RANKS: Rank[] = [
  { level: 1, title: "НОВИЧОК" },
  { level: 2, title: "БОЛЕЛЬЩИК" },
  { level: 3, title: "ПОЛКОВНИК" },
  { level: 4, title: "КАПИТАН" },
  { level: 5, title: "ТРЕНЕР" },
  { level: 6, title: "СТРАТЕГ" },
  { level: 7, title: "ТАКТИК" },
  { level: 8, title: "МЕНЕДЖЕР" },
  { level: 9, title: "ЛЕГЕНДА" },
  { level: 10, title: "МИФИЧЕСКИЙ" },
];

export function rankOf(level: number): Rank {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (r.level <= level) rank = r;
  }
  return rank;
}

// ---------- XP award constants ----------

export const XP_AWARDS = {
  // Game completion
  game_complete: 5,
  game_win: 10,
  game_perfect: 25,
  daily_challenge: 15,

  // GeoGuessr
  geo_guess_win: 60,
  geo_guess_win_1: 100,

  // Grid
  grid_day_win: 80,
  grid_friend_win: 20,
  grid_online_win: 30,

  // Quiz
  quiz_win: 20,

  // Career
  career_win: 100,

  // Draft
  draft_champion: 150,
  draft_qualify: 50,

  // Migration
  guest_migration: 50,
} as const;

export type XpAwardReason = keyof typeof XP_AWARDS;
