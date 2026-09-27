// ============================================================
// STREAK SERVICE — daily streak tracking
// ============================================================
// Streak counts consecutive days with at least 1 game played.
// Server-side: uses the game result timestamp, not client date.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameResult } from "./types";

export interface StreakStatus {
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string | null;
  todayPlayed: boolean;
}

/**
 * Get the local date string (YYYY-MM-DD) using the server's timezone context.
 * Since this runs in the browser, we use the user's local date,
 * but the server validates via the game result timestamp.
 */
function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Update the user's daily streak after a game result.
 * Returns the current streak length in days.
 */
export async function updateStreak(
  supabase: SupabaseClient,
  userId: string,
  result: GameResult
): Promise<number> {
  const today = getTodayStr();
  const resultDate = result.completedAt
    ? result.completedAt.slice(0, 10)
    : today;

  // Fetch current streak
  const { data: streakRow } = await supabase
    .from("user_streaks")
    .select("current_streak, best_streak, last_played_date")
    .eq("user_id", userId)
    .maybeSingle();

  const current = streakRow?.current_streak ?? 0;
  const best = streakRow?.best_streak ?? 0;
  const lastPlayed = streakRow?.last_played_date ?? null;

  // If already played today, streak doesn't change
  if (lastPlayed === resultDate) {
    return current;
  }

  // Calculate new streak
  let newStreak: number;
  if (!lastPlayed) {
    // First game ever
    newStreak = 1;
  } else {
    // Check if yesterday
    const lastDate = new Date(lastPlayed);
    const resultDt = new Date(resultDate);
    const diffMs = resultDt.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays === 1) {
      // Consecutive day
      newStreak = current + 1;
    } else if (diffDays > 1) {
      // Gap — streak resets
      newStreak = 1;
    } else {
      // Same day or clock skew — keep current
      newStreak = current;
    }
  }

  const newBest = Math.max(best, newStreak);

  // Upsert streak
  await supabase.from("user_streaks").upsert(
    {
      user_id: userId,
      current_streak: newStreak,
      best_streak: newBest,
      last_played_date: resultDate,
    },
    { onConflict: "user_id" }
  );

  // Streak milestones: award XP at 3, 7, 14, 30 days
  const milestones = [3, 7, 14, 30];
  const milestoneXp: Record<number, number> = { 3: 25, 7: 100, 14: 250, 30: 500 };

  if (milestones.includes(newStreak)) {
    const xp = milestoneXp[newStreak];
    if (xp) {
      await supabase.from("xp_events").insert({
        user_id: userId,
        amount: xp,
        reason: `streak_${newStreak}`,
        game_id: "streak",
      });
    }
  }

  return newStreak;
}

/**
 * Get current streak status for UI
 */
export async function getStreakStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<StreakStatus> {
  const today = getTodayStr();

  const { data: streakRow } = await supabase
    .from("user_streaks")
    .select("current_streak, best_streak, last_played_date")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    currentStreak: streakRow?.current_streak ?? 0,
    bestStreak: streakRow?.best_streak ?? 0,
    lastPlayedDate: streakRow?.last_played_date ?? null,
    todayPlayed: streakRow?.last_played_date === today,
  };
}
