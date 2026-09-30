// ============================================================
// PROGRESSION SYSTEM — shared types
// ============================================================

/**
 * A validated game result, reported by a game component.
 * The client sends ONLY the game result — NEVER XP amounts.
 * The server calculates XP based on this result.
 */
export interface GameResult {
  /** Registered game ID (e.g. "cs2-aim", "geoguessr", "football-draft") */
  gameId: string;
  /** Whether the player won (where applicable) */
  won: boolean;
  /** Primary score for this game (e.g. aim score, geo distance points) */
  score?: number;
  /** Additional metadata for stats tracking */
  metadata?: Record<string, number>;
  /** Whether this was a daily challenge (one-per-day games) */
  isDaily?: boolean;
  /** Timestamp of the game completion */
  completedAt?: string;
}

/**
 * Result of reporting a game to the progression system
 */
export interface ProgressionResult {
  /** XP awarded for this game result */
  xpAwarded: number;
  /** User's total XP after this award */
  totalXp: number;
  /** User's current level */
  level: number;
  /** Whether the user leveled up from this result */
  leveledUp: boolean;
  /** Achievement objects unlocked by this result */
  newAchievements: { id: string; name: string }[];
  /** Current daily streak in days */
  streakDays: number;
  /** Whether a streak milestone was reached */
  streakMilestone: boolean;
  /** Mission IDs completed by this result */
  missionsCompleted: string[];
}

/**
 * Game definition for the registry
 */
export interface GameDefinition {
  id: string;
  name: string;
  icon: string;
  /** XP rewards for different outcomes */
  xpRules: {
    /** XP for simply completing a game */
    complete: number;
    /** Extra XP for winning */
    win: number;
    /** Extra XP for a perfect score (game-specific) */
    perfect?: number;
    /** Extra XP for daily challenge completion */
    daily?: number;
  };
  /** Stats schema for this game */
  statsSchema: Record<string, { type: "int"; default: number }>;
  /** Category for leaderboards */
  category: "football" | "cs2" | "geoguessr" | "quiz" | "arcade" | "other";
}
