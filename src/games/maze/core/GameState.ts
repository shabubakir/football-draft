export type GamePhase = "menu" | "raid" | "shop";

export type Difficulty = "easy" | "normal" | "nightmare";

// Legacy difficulty config — kept for the old DIFFICULTIES reference
// (some tests import it). New raids use raidConfig.ts.
export interface DifficultyConfig {
  monsterSpeed: number;
  monsterHearRange: number;
  monsterVisionRange: number;
  monsterVisionAngle: number;
  batteryCount: number;
  fuseCount: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    monsterSpeed: 3.5,
    monsterHearRange: 8,
    monsterVisionRange: 10,
    monsterVisionAngle: 70,
    batteryCount: 5,
    fuseCount: 4,
  },
  normal: {
    monsterSpeed: 4.5,
    monsterHearRange: 12,
    monsterVisionRange: 14,
    monsterVisionAngle: 90,
    batteryCount: 3,
    fuseCount: 5,
  },
  nightmare: {
    monsterSpeed: 5.5,
    monsterHearRange: 16,
    monsterVisionRange: 18,
    monsterVisionAngle: 110,
    batteryCount: 2,
    fuseCount: 6,
  },
};

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty;
  seed: number;
  // Raid scratch (reset in startRaid)
  quota: number;
  banked: number; // $ extracted so far this raid
  carried: number; // $ currently in hand
  elapsed: number;
  eventBanner: string | null;
  // Secondary collectibles (room lights / power)
  fusesCollected: number;
  fusesTotal: number;
  // Legacy meta (old save key, display only)
  bestTime: number | null;
  wins: number;
  deaths: number;
  lastSeed: number | null;
}

const STORAGE_KEY = "maze-game-save";

export function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return {
        phase: "menu",
        difficulty: saved.difficulty ?? "normal",
        seed: Math.floor(Math.random() * 1000000),
        quota: 0,
        banked: 0,
        carried: 0,
        elapsed: 0,
        eventBanner: null,
        fusesCollected: 0,
        fusesTotal: 0,
        bestTime: saved.bestTime ?? null,
        wins: saved.wins ?? 0,
        deaths: saved.deaths ?? 0,
        lastSeed: saved.lastSeed ?? null,
      };
    }
  } catch {}
  return {
    phase: "menu",
    difficulty: "normal",
    seed: Math.floor(Math.random() * 1000000),
    quota: 0,
    banked: 0,
    carried: 0,
    elapsed: 0,
    eventBanner: null,
    fusesCollected: 0,
    fusesTotal: 0,
    bestTime: null,
    wins: 0,
    deaths: 0,
    lastSeed: null,
  };
}

export function saveGameState(state: GameState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        difficulty: state.difficulty,
        bestTime: state.bestTime,
        wins: state.wins,
        deaths: state.deaths,
        lastSeed: state.lastSeed,
      })
    );
  } catch {}
}
