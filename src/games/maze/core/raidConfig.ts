// Raid level definitions — replaces the role of DIFFICULTIES for raid setup.
// The old easy/normal/nightmare picker becomes a global modifier applied
// in raidForLevel (±20% monster stats, ±15% quota).

import type { Difficulty } from "./GameState";

export interface RaidConfig {
  level: number;
  quota: number;
  mazeSize: number;
  monsterCount: number;
  monsterSpeed: number;
  monsterHearRange: number;
  monsterVisionRange: number;
  monsterVisionAngle: number;
  lootWeights: { cheap: number; medium: number; expensive: number };
  lootCount: number;
  darkRooms: number;
  rareLootChance: number;
  raidTimeLimit: number; // seconds
}

const BASE_RAIDS: RaidConfig[] = [
  {
    level: 1,
    quota: 5000,
    mazeSize: 21,
    monsterCount: 1,
    monsterSpeed: 4.0,
    monsterHearRange: 10,
    monsterVisionRange: 12,
    monsterVisionAngle: 90,
    lootWeights: { cheap: 0.8, medium: 0.18, expensive: 0.02 },
    lootCount: 12,
    darkRooms: 0,
    rareLootChance: 0,
    raidTimeLimit: 480,
  },
  {
    level: 2,
    quota: 10000,
    mazeSize: 25,
    monsterCount: 2,
    monsterSpeed: 4.5,
    monsterHearRange: 12,
    monsterVisionRange: 14,
    monsterVisionAngle: 95,
    lootWeights: { cheap: 0.5, medium: 0.38, expensive: 0.12 },
    lootCount: 16,
    darkRooms: 0,
    rareLootChance: 0.05,
    raidTimeLimit: 600,
  },
  {
    level: 3,
    quota: 20000,
    mazeSize: 30,
    monsterCount: 2,
    monsterSpeed: 5.5,
    monsterHearRange: 14,
    monsterVisionRange: 16,
    monsterVisionAngle: 110,
    lootWeights: { cheap: 0.3, medium: 0.4, expensive: 0.3 },
    lootCount: 20,
    darkRooms: 3,
    rareLootChance: 0.1,
    raidTimeLimit: 720,
  },
];

// Difficulty modifier: easy = -20% monster stats, -15% quota;
// normal = baseline; nightmare = +20% monster stats, +15% quota.
const DIFF_MOD: Record<Difficulty, { monster: number; quota: number }> = {
  easy: { monster: 0.8, quota: 0.85 },
  normal: { monster: 1.0, quota: 1.0 },
  nightmare: { monster: 1.2, quota: 1.15 },
};

export function raidForLevel(level: number, difficulty: Difficulty): RaidConfig {
  const idx = Math.max(0, Math.min(level - 1, BASE_RAIDS.length - 1));
  const base = BASE_RAIDS[idx];
  const mod = DIFF_MOD[difficulty];
  return {
    ...base,
    quota: Math.round(base.quota * mod.quota),
    monsterSpeed: base.monsterSpeed * mod.monster,
    monsterHearRange: base.monsterHearRange * mod.monster,
    monsterVisionRange: base.monsterVisionRange * mod.monster,
  };
}

export const MAX_RAID_LEVEL = BASE_RAIDS.length;
