// ============================================================
// GAME STATS REGISTRY — extensible architecture
// ============================================================

// ---------- Game stats interface ----------

export interface GameStats {
  gamesPlayed: number;
  [key: string]: number;
}

// ---------- Game registry ----------

interface GameDefinition {
  id: string;
  name: string;
  icon: string;
  /** Stats schema for this game */
  statsSchema: Record<string, { type: "int"; default: number }>;
}

const GAMES: GameDefinition[] = [
  {
    id: "geoguessr",
    name: "GeoGuessr",
    icon: "🌍",
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      totalScore: { type: "int", default: 0 },
      bestScore: { type: "int", default: 0 },
      wins: { type: "int", default: 0 },
      losses: { type: "int", default: 0 },
    },
  },
  {
    id: "cs2-aim",
    name: "CS2 Aim",
    icon: "🎯",
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      bestScore: { type: "int", default: 0 },
      bestReaction: { type: "int", default: 0 },
      bestAccuracy: { type: "int", default: 0 },
    },
  },
  {
    id: "cs2-hl",
    name: "CS2 Higher/Lower",
    icon: "💰",
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      correctAnswers: { type: "int", default: 0 },
      wrongAnswers: { type: "int", default: 0 },
      bestStreak: { type: "int", default: 0 },
    },
  },
  {
    id: "akinator",
    name: "Akinator",
    icon: "🧞",
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      successfulGuesses: { type: "int", default: 0 },
      failedGuesses: { type: "int", default: 0 },
    },
  },
  {
    id: "football-draft",
    name: "Football Draft",
    icon: "⚽",
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      wins: { type: "int", default: 0 },
      losses: { type: "int", default: 0 },
      rating: { type: "int", default: 1000 },
    },
  },
];

// ---------- Public API ----------

/**
 * Register a new game in the stats system
 */
export function registerGame(def: GameDefinition): void {
  GAMES.push(def);
}

/**
 * Get all registered games
 */
export function getRegisteredGames(): GameDefinition[] {
  return [...GAMES];
}

/**
 * Get game definition by ID
 */
export function getGameById(id: string): GameDefinition | null {
  return GAMES.find((g) => g.id === id) ?? null;
}

/**
 * Create default stats object for a game
 */
export function createDefaultStats(gameId: string): GameStats {
  const game = getGameById(gameId);
  if (!game) return { gamesPlayed: 0 };

  const stats: GameStats = { gamesPlayed: 0 };
  for (const [key, schema] of Object.entries(game.statsSchema)) {
    stats[key] = schema.default;
  }
  return stats;
}

/**
 * Merge new stats with existing (increment counters, update maxes)
 */
export function mergeStats(
  existing: GameStats,
  update: Partial<GameStats>,
  gameId: string
): GameStats {
  const game = getGameById(gameId);
  const merged = { ...existing };

  for (const [key, value] of Object.entries(update)) {
    if (value === undefined) continue;

    // For "best" fields, take max
    if (key.startsWith("best") || key === "max") {
      merged[key] = Math.max(merged[key] ?? 0, value);
    } else {
      // For counters, add
      merged[key] = (merged[key] ?? 0) + value;
    }
  }

  return merged;
}
