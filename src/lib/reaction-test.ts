// ============================================================
// REACTION TEST — config, validation & scoring
// ============================================================
// All tunable values live here (NOT in the component), so the
// scoring can be changed without touching game code.
// ============================================================

export const TOTAL_ATTEMPTS = 5;

export const MIN_DELAY_MS = 1500;
export const MAX_DELAY_MS = 5000;

/** Sanitize bounds: reject impossible values (state errors, etc.) */
export const MIN_VALID_MS = 60;
export const MAX_VALID_MS = 1000;

export type ReactionTier = "elite" | "sharp" | "fast" | "good" | "average" | "slow";

export interface ReactionTierInfo {
  tier: ReactionTier;
  label: string;
  points: number;
  color: string;
}

/** Score tiers by reaction time in ms (lower is better) */
const TIERS: Array<{ max: number; label: string; points: number; color: string; tier: ReactionTier }> = [
  { max: 149, label: "ЭЛИТА", points: 1000, color: "#f59e0b", tier: "elite" },
  { max: 199, label: "РЕЗКИЙ", points: 900, color: "#4ade80", tier: "sharp" },
  { max: 249, label: "БЫСТРЫЙ", points: 800, color: "#38bdf8", tier: "fast" },
  { max: 299, label: "ХОРОШО", points: 700, color: "#a78bfa", tier: "good" },
  { max: 399, label: "СРЕДНЕ", points: 500, color: "#facc15", tier: "average" },
  { max: Infinity, label: "Медленно", points: 300, color: "#ef4444", tier: "slow" },
];

export function scoreReaction(ms: number): ReactionTierInfo {
  const t = TIERS.find((x) => ms <= x.max) ?? TIERS[TIERS.length - 1];
  return { tier: t.tier, label: t.label, points: t.points, color: t.color };
}

/**
 * Validate a raw measured reaction time.
 * Returns the clamped integer ms value, or null if the value
 * is not a finite number within the sane bounds.
 */
export function sanitizeReaction(ms: number): number | null {
  if (!Number.isFinite(ms)) return null;
  if (ms < MIN_VALID_MS || ms > MAX_VALID_MS) return null;
  return Math.round(ms);
}
