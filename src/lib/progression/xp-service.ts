// ============================================================
// XP SERVICE — centralized XP calculation
// ============================================================
// The client NEVER decides how much XP to award.
// XP is calculated here based on the game result + game rules.
// ============================================================

import { getGameDefinition } from "./game-registry";
import type { GameResult } from "./types";

export interface XpCalculation {
  amount: number;
  reason: string;
}

/**
 * Calculate XP for a game result.
 * This is the ONLY place where XP amounts are determined.
 *
 * Formula:
 *   base = game.xpRules.complete (always awarded for finishing)
 *   + game.xpRules.win (if won)
 *   + game.xpRules.perfect (if perfect score, game-specific)
 *   + game.xpRules.daily (if daily challenge)
 *
 * Perfect score detection is game-specific:
 *   - cs2-aim: score >= 1000
 *   - geoguessr: score >= 4000
 *   - grid-day: no mistakes
 *   - guess-player: solved in 1 attempt
 *   - career: solved with 0 clues revealed
 */
export function calculateXp(result: GameResult): XpCalculation {
  const game = getGameDefinition(result.gameId);
  if (!game) {
    return { amount: 0, reason: "unknown_game" };
  }

  let amount = game.xpRules.complete;
  const reasons: string[] = [];

  // Win bonus
  if (result.won) {
    amount += game.xpRules.win;
    reasons.push("win");
  }

  // Perfect bonus (game-specific logic)
  if ((game.xpRules.perfect ?? 0) > 0 && isPerfectScore(result)) {
    amount += game.xpRules.perfect!;
    reasons.push("perfect");
  }

  // Daily challenge bonus
  if (result.isDaily && (game.xpRules.daily ?? 0) > 0) {
    amount += game.xpRules.daily!;
    reasons.push("daily");
  }

  // Build reason string
  const reason =
    result.won && reasons.length > 0
      ? `${result.gameId}_${reasons.join("_")}`
      : result.won
        ? `${result.gameId}_win`
        : `${result.gameId}_complete`;

  return { amount, reason };
}

/**
 * Check if a result qualifies as "perfect" for the given game
 */
function isPerfectScore(result: GameResult): boolean {
  const { gameId, score, metadata, won } = result;

  switch (gameId) {
    case "cs2-aim":
      return (score ?? 0) >= 1000;
    case "geoguessr":
      return (score ?? 0) >= 4000;
    case "grid-day":
      return won && (metadata?.mistakes ?? 1) === 0;
    case "guess-player":
      return won && (metadata?.attempts ?? 99) === 1;
    case "career":
      return won && (metadata?.cluesUsed ?? 99) === 0;
    case "quiz":
      return won && (metadata?.wrongAnswers ?? 1) === 0;
    case "cs2-map-guess":
      return won && (metadata?.wrong ?? 1) === 0;
    case "reaction-test":
      return (metadata?.best ?? 9999) < 180;
    default:
      return false;
  }
}
