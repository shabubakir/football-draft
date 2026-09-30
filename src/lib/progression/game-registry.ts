// ============================================================
// GAME REGISTRY — centralized game definitions
// ============================================================
// To add a new game, just add it to this registry.
// The progression system will automatically handle XP,
// stats, achievements, and leaderboards.
// ============================================================

import type { GameDefinition } from "./types";

const GAMES: GameDefinition[] = [
  {
    id: "football-draft",
    name: "Драфт",
    icon: "⚽",
    xpRules: {
      complete: 5,
      win: 50,
      perfect: 0,
      daily: 0,
    },
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      wins: { type: "int", default: 0 },
      losses: { type: "int", default: 0 },
      championWins: { type: "int", default: 0 },
    },
    category: "football",
  },
  {
    id: "grid-day",
    name: "Сетка 9",
    icon: "🔲",
    xpRules: {
      complete: 5,
      win: 30,
      perfect: 10,
      daily: 15,
    },
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      solved: { type: "int", default: 0 },
      failed: { type: "int", default: 0 },
      bestScore: { type: "int", default: 0 },
    },
    category: "football",
  },
  {
    id: "guess-player",
    name: "Угадай игрока",
    icon: "🔍",
    xpRules: {
      complete: 5,
      win: 30,
      perfect: 20,
      daily: 15,
    },
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      successfulGuesses: { type: "int", default: 0 },
      failedGuesses: { type: "int", default: 0 },
      bestAttempts: { type: "int", default: 999 },
    },
    category: "football",
  },
  {
    id: "career",
    name: "Путь футболиста",
    icon: "📈",
    xpRules: {
      complete: 5,
      win: 40,
      perfect: 20,
      daily: 15,
    },
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      wins: { type: "int", default: 0 },
      losses: { type: "int", default: 0 },
      bestPoints: { type: "int", default: 0 },
    },
    category: "football",
  },
  {
    id: "quiz",
    name: "Викторина",
    icon: "❓",
    xpRules: {
      complete: 5,
      win: 20,
      perfect: 10,
      daily: 0,
    },
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      correctAnswers: { type: "int", default: 0 },
      wrongAnswers: { type: "int", default: 0 },
      wins: { type: "int", default: 0 },
    },
    category: "football",
  },
  {
    id: "svoya-igra",
    name: "Своя игра",
    icon: "🎯",
    xpRules: {
      complete: 5,
      win: 20,
      perfect: 10,
      daily: 0,
    },
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      wins: { type: "int", default: 0 },
      bestScore: { type: "int", default: 0 },
    },
    category: "quiz",
  },
  {
    id: "cs2-cases",
    name: "CS2 Кейсы",
    icon: "📦",
    xpRules: {
      complete: 2,
      win: 0,
      perfect: 0,
      daily: 0,
    },
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      casesOpened: { type: "int", default: 0 },
      bestItemValue: { type: "int", default: 0 },
    },
    category: "cs2",
  },
  {
    id: "cs2-aim",
    name: "CS2 Aim",
    icon: "🎯",
    xpRules: {
      complete: 5,
      win: 10,
      perfect: 20,
      daily: 0,
    },
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      bestScore: { type: "int", default: 0 },
      bestReaction: { type: "int", default: 0 },
      bestAccuracy: { type: "int", default: 0 },
    },
    category: "cs2",
  },
  {
    id: "cs2-hl",
    name: "CS2 Higher/Lower",
    icon: "💰",
    xpRules: {
      complete: 5,
      win: 10,
      perfect: 15,
      daily: 0,
    },
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      correctAnswers: { type: "int", default: 0 },
      wrongAnswers: { type: "int", default: 0 },
      bestStreak: { type: "int", default: 0 },
    },
    category: "cs2",
  },
  {
    id: "cs2-map-guess",
    name: "CS2 Map Guess",
    icon: "🗺️",
    xpRules: {
      complete: 5,
      win: 15,
      perfect: 25,
      daily: 0,
    },
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      totalScore: { type: "int", default: 0 },
      bestScore: { type: "int", default: 0 },
      correctAnswers: { type: "int", default: 0 },
      wrongAnswers: { type: "int", default: 0 },
      bestStreak: { type: "int", default: 0 },
    },
    category: "cs2",
  },
  {
    id: "reaction-test",
    name: "Reaction Test",
    icon: "⚡",
    xpRules: {
      complete: 5,
      win: 10,
      perfect: 25,
      daily: 0,
    },
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      bestReaction: { type: "int", default: 0 },
      totalAttempts: { type: "int", default: 0 },
      falseStarts: { type: "int", default: 0 },
      bestStreak: { type: "int", default: 0 },
    },
    category: "other",
  },
  {
    id: "akinator",
    name: "Akinator",
    icon: "🧞",
    xpRules: {
      complete: 5,
      win: 15,
      perfect: 10,
      daily: 0,
    },
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      successfulGuesses: { type: "int", default: 0 },
      failedGuesses: { type: "int", default: 0 },
      bestQuestions: { type: "int", default: 999 },
    },
    category: "other",
  },
  {
    id: "geoguessr",
    name: "GeoGuessr",
    icon: "🌍",
    xpRules: {
      complete: 5,
      win: 25,
      perfect: 30,
      daily: 0,
    },
    statsSchema: {
      gamesPlayed: { type: "int", default: 0 },
      totalScore: { type: "int", default: 0 },
      bestScore: { type: "int", default: 0 },
      wins: { type: "int", default: 0 },
      losses: { type: "int", default: 0 },
    },
    category: "geoguessr",
  },
];

/**
 * Get game definition by ID
 */
export function getGameDefinition(gameId: string): GameDefinition | null {
  return GAMES.find((g) => g.id === gameId) ?? null;
}

/**
 * Get all registered games
 */
export function getAllGames(): GameDefinition[] {
  return [...GAMES];
}

/**
 * Get games by category
 */
export function getGamesByCategory(
  category: GameDefinition["category"]
): GameDefinition[] {
  return GAMES.filter((g) => g.category === category);
}

/**
 * Register a new game at runtime (for future extensibility)
 */
export function registerGame(def: GameDefinition): void {
  const existing = GAMES.findIndex((g) => g.id === def.id);
  if (existing >= 0) {
    GAMES[existing] = def;
  } else {
    GAMES.push(def);
  }
}
