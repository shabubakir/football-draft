// ============================================================
// UNIFIED PROGRESSION SYSTEM — entry point
// ============================================================
// All games report results here. The system handles:
//   Game Result → Validation → Stats → XP → Achievements → Streak → Missions
//
// Client NEVER sends XP amounts — server calculates everything.
// ============================================================

import { getSupabaseBrowser } from "../supabase";
import { getDeviceId } from "../profile";
import { calculateXp } from "./xp-service";
import { updateGameStats } from "./stats-service";
import { checkAndUnlockAchievements } from "./achievement-service";
import { updateStreak } from "./streak-service";
import { checkMissions } from "./mission-service";
import type { GameResult, ProgressionResult } from "./types";

/**
 * Report a completed game result to the progression system.
 *
 * For authenticated users: writes to Supabase (xp_events, user_game_stats, etc.)
 * For guests: no server-side progression (local stats only, in the game itself).
 *
 * Call this ONCE per completed game, after the game logic is done.
 *
 * @param result - The validated game result from the game component
 * @returns ProgressionResult with XP awarded, achievements unlocked, etc.
 */
export async function reportGameResult(
  result: GameResult
): Promise<ProgressionResult> {
  const empty: ProgressionResult = {
    xpAwarded: 0,
    totalXp: 0,
    level: 1,
    leveledUp: false,
    newAchievements: [],
    streakDays: 0,
    streakMilestone: false,
    missionsCompleted: [],
  };

  const supabase = getSupabaseBrowser();
  if (!supabase) return empty;

  // Get current user (null if guest)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Guest mode: no server-side progression
    // Games handle their own local stats (localStorage)
    return empty;
  }

  const userId = user.id;

  // 1. Calculate XP (server-side, based on game result)
  const xpInfo = calculateXp(result);

  // 2. Insert XP event (if any)
  if (xpInfo.amount > 0) {
    await supabase.from("xp_events").insert({
      user_id: userId,
      amount: xpInfo.amount,
      reason: xpInfo.reason,
      game_id: result.gameId,
    });
  }

  // 3. Update game stats
  await updateGameStats(supabase, userId, result);

  // 4. Check and unlock achievements
  const newAchievementIds = await checkAndUnlockAchievements(
    supabase,
    userId,
    result
  );

  // Map achievement IDs to objects with names
  const achievementNames: Record<string, string> = {
    first_game: "Первая игра",
    winner: "Победитель",
    aim_master: "Мастер прицела",
    explorer: "Исследователь",
    quiz_master: "Мастер викторин",
    on_fire: "В огне",
  };
  const newAchievements = newAchievementIds.map((id) => ({
    id,
    name: achievementNames[id] ?? id,
  }));

  // 5. Update daily streak
  const streakDays = await updateStreak(supabase, userId, result);

  // Check streak milestone
  const streakMilestones = [3, 7, 14, 30];
  const streakMilestone = streakMilestones.includes(streakDays);

  // 6. Check daily/weekly missions
  const missionsCompleted = await checkMissions(supabase, userId, result);

  // 7. Get updated total XP for level calculation
  const { data: xpEvents } = await supabase
    .from("xp_events")
    .select("amount")
    .eq("user_id", userId);

  const totalXp = (xpEvents ?? []).reduce((sum, e) => sum + e.amount, 0);

  // Calculate level
  const { levelFromXp } = await import("../xp");
  const newLevel = levelFromXp(totalXp);

  // Detect level up (compare with previous level before this XP)
  const prevXp = totalXp - xpInfo.amount;
  const prevLevel = levelFromXp(prevXp);
  const leveledUp = newLevel > prevLevel;

  return {
    xpAwarded: xpInfo.amount,
    totalXp,
    level: newLevel,
    leveledUp,
    newAchievements,
    streakDays,
    streakMilestone,
    missionsCompleted,
  };
}

/**
 * Get the device ID (for guest mode)
 */
export function getProgressionDeviceId(): string {
  return getDeviceId();
}

export { calculateXp } from "./xp-service";
export { getGameDefinition } from "./game-registry";
export { getAchievements, getAchievementById } from "./achievement-service";
export { getStreakStatus } from "./streak-service";
export { getDailyMissions, getWeeklyMissions, claimMission } from "./mission-service";
export type { GameResult, ProgressionResult, GameDefinition } from "./types";
