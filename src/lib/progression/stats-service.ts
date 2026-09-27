// ============================================================
// STATS SERVICE — per-game statistics tracking
// ============================================================
// Merges game results into user_game_stats (jsonb).
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { getGameDefinition } from "./game-registry";
import type { GameResult } from "./types";

/**
 * Update user's game stats with a new result.
 * Uses upsert on (user_id, game_id) with jsonb merge.
 */
export async function updateGameStats(
  supabase: SupabaseClient,
  userId: string,
  result: GameResult
): Promise<void> {
  const game = getGameDefinition(result.gameId);
  if (!game) return;

  // Fetch current stats
  const { data: existing } = await supabase
    .from("user_game_stats")
    .select("stats")
    .eq("user_id", userId)
    .eq("game_id", result.gameId)
    .maybeSingle();

  const current = (existing?.stats ?? {}) as Record<string, number>;

  // Build update
  const update: Record<string, number> = {
    gamesPlayed: (current.gamesPlayed ?? 0) + 1,
  };

  // Game-specific stat updates
  const { metadata, won, score } = result;

  switch (result.gameId) {
    case "football-draft":
      update.wins = (current.wins ?? 0) + (won ? 1 : 0);
      update.losses = (current.losses ?? 0) + (won ? 0 : 1);
      if (won) update.championWins = (current.championWins ?? 0) + 1;
      break;

    case "grid-day":
      update.solved = (current.solved ?? 0) + (won ? 1 : 0);
      update.failed = (current.failed ?? 0) + (won ? 0 : 1);
      if (won && (score ?? 0) > (current.bestScore ?? 0)) {
        update.bestScore = score!;
      }
      break;

    case "guess-player":
      update.successfulGuesses =
        (current.successfulGuesses ?? 0) + (won ? 1 : 0);
      update.failedGuesses = (current.failedGuesses ?? 0) + (won ? 0 : 1);
      if (won && (metadata?.attempts ?? 99) < (current.bestAttempts ?? 999)) {
        update.bestAttempts = metadata!.attempts;
      }
      break;

    case "career":
      update.wins = (current.wins ?? 0) + (won ? 1 : 0);
      update.losses = (current.losses ?? 0) + (won ? 0 : 1);
      if ((score ?? 0) > (current.bestPoints ?? 0)) {
        update.bestPoints = score ?? 0;
      }
      break;

    case "quiz":
      if (won) update.wins = (current.wins ?? 0) + 1;
      update.correctAnswers =
        (current.correctAnswers ?? 0) + (metadata?.correctAnswers ?? 0);
      update.wrongAnswers =
        (current.wrongAnswers ?? 0) + (metadata?.wrongAnswers ?? 0);
      break;

    case "cs2-cases":
      update.casesOpened =
        (current.casesOpened ?? 0) + (metadata?.casesOpened ?? 0);
      if ((score ?? 0) > (current.bestItemValue ?? 0)) {
        update.bestItemValue = score ?? 0;
      }
      break;

    case "cs2-aim":
      if ((score ?? 0) > (current.bestScore ?? 0)) {
        update.bestScore = score ?? 0;
      }
      if ((metadata?.reaction ?? 0) > (current.bestReaction ?? 0)) {
        update.bestReaction = metadata!.reaction;
      }
      if ((metadata?.accuracy ?? 0) > (current.bestAccuracy ?? 0)) {
        update.bestAccuracy = metadata!.accuracy;
      }
      break;

    case "cs2-hl":
      update.correctAnswers =
        (current.correctAnswers ?? 0) + (metadata?.correct ?? 0);
      update.wrongAnswers =
        (current.wrongAnswers ?? 0) + (metadata?.wrong ?? 0);
      if ((metadata?.streak ?? 0) > (current.bestStreak ?? 0)) {
        update.bestStreak = metadata!.streak;
      }
      break;

    case "akinator":
      update.successfulGuesses =
        (current.successfulGuesses ?? 0) + (won ? 1 : 0);
      update.failedGuesses = (current.failedGuesses ?? 0) + (won ? 0 : 1);
      if (won && (metadata?.questions ?? 99) < (current.bestQuestions ?? 999)) {
        update.bestQuestions = metadata!.questions;
      }
      break;

    case "geoguessr":
      update.totalScore = (current.totalScore ?? 0) + (score ?? 0);
      update.wins = (current.wins ?? 0) + (won ? 1 : 0);
      update.losses = (current.losses ?? 0) + (won ? 0 : 1);
      if ((score ?? 0) > (current.bestScore ?? 0)) {
        update.bestScore = score ?? 0;
      }
      break;

    default:
      // Generic: just count games played
      if (won) update.wins = (current.wins ?? 0) + 1;
  }

  // Upsert stats
  await supabase.from("user_game_stats").upsert(
    {
      user_id: userId,
      game_id: result.gameId,
      stats: { ...current, ...update },
    },
    { onConflict: "user_id,game_id" }
  );
}
