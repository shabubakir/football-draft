// ============================================================
// MISSION SERVICE — daily & weekly missions
// ============================================================
// Missions are generated centrally (seeded by date/week).
// Progress is tracked server-side. Rewards are claimed once.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameResult } from "./types";

// ---------- Mission definitions ----------

export interface MissionDef {
  id: string;
  type: "daily" | "weekly";
  name: string;
  description: string;
  target: number;
  rewardXp: number;
  /** What to count */
  metric: "games" | "wins" | "games_cs2_aim" | "games_geoguessr" | "games_any_3" | "achievements";
}

const DAILY_MISSIONS: MissionDef[] = [
  {
    id: "daily_play_2",
    type: "daily",
    name: "Сыграй 2 игры",
    description: "Заверши 2 игры сегодня",
    target: 2,
    rewardXp: 50,
    metric: "games",
  },
  {
    id: "daily_play_cs2",
    type: "daily",
    name: "Сыграй CS2 Aim",
    description: "Заверши 1 игру CS2 Aim",
    target: 1,
    rewardXp: 25,
    metric: "games_cs2_aim",
  },
  {
    id: "daily_play_geo",
    type: "daily",
    name: "Сыграй GeoGuessr",
    description: "Заверши 1 игру GeoGuessr",
    target: 1,
    rewardXp: 25,
    metric: "games_geoguessr",
  },
  {
    id: "daily_win_1",
    type: "daily",
    name: "Выиграй 1 игру",
    description: "Победи в любой игре сегодня",
    target: 1,
    rewardXp: 50,
    metric: "wins",
  },
];

const WEEKLY_MISSIONS: MissionDef[] = [
  {
    id: "weekly_play_15",
    type: "weekly",
    name: "Сыграй 15 игр",
    description: "Заверши 15 игр за неделю",
    target: 15,
    rewardXp: 200,
    metric: "games",
  },
  {
    id: "weekly_win_5",
    type: "weekly",
    name: "Выиграй 5 игр",
    description: "Победи в 5 играх за неделю",
    target: 5,
    rewardXp: 250,
    metric: "wins",
  },
  {
    id: "weekly_play_3_types",
    type: "weekly",
    name: "3 разные игры",
    description: "Сыграй в 3 разные игры за неделю",
    target: 3,
    rewardXp: 150,
    metric: "games_any_3",
  },
  {
    id: "weekly_achieve_3",
    type: "weekly",
    name: "3 достижения",
    description: "Открой 3 достижения за неделю",
    target: 3,
    rewardXp: 300,
    metric: "achievements",
  },
];

// ---------- Date helpers ----------

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getWeekKey(): string {
  const now = new Date();
  // ISO week: Monday start
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------- Public API ----------

export function getDailyMissions(): MissionDef[] {
  return [...DAILY_MISSIONS];
}

export function getWeeklyMissions(): MissionDef[] {
  return [...WEEKLY_MISSIONS];
}

/**
 * Check missions after a game result and award XP for completed ones.
 * Returns array of completed mission IDs.
 */
export async function checkMissions(
  supabase: SupabaseClient,
  userId: string,
  result: GameResult
): Promise<string[]> {
  const today = getTodayKey();
  const week = getWeekKey();
  const completed: string[] = [];

  // --- Daily missions ---
  const { data: dailyRows } = await supabase
    .from("user_missions")
    .select("id, mission_id, progress, claimed")
    .eq("user_id", userId)
    .eq("period", "daily")
    .eq("period_key", today);

  const dailyState = new Map<string, { progress: number; claimed: boolean }>();
  for (const row of dailyRows ?? []) {
    dailyState.set(row.mission_id, {
      progress: row.progress,
      claimed: row.claimed,
    });
  }

  for (const mission of DAILY_MISSIONS) {
    const state = dailyState.get(mission.id);
    if (state?.claimed) continue;

    let progress = state?.progress ?? 0;

    // Check if this result contributes
    if (contributesTo(mission.metric, result)) {
      progress = Math.min(progress + 1, mission.target);
    }

    // Save progress
    await supabase.from("user_missions").upsert(
      {
        user_id: userId,
        mission_id: mission.id,
        type: "daily",
        period: "daily",
        period_key: today,
        progress,
        claimed: progress >= mission.target,
      },
      { onConflict: "user_id,mission_id,period,period_key" }
    );

    // Award XP if just completed
    if (progress >= mission.target && (state?.progress ?? 0) < mission.target) {
      await supabase.from("xp_events").insert({
        user_id: userId,
        amount: mission.rewardXp,
        reason: "daily_mission",
        game_id: mission.id,
      });
      completed.push(mission.id);
    }
  }

  // --- Weekly missions ---
  const { data: weeklyRows } = await supabase
    .from("user_missions")
    .select("id, mission_id, progress, claimed")
    .eq("user_id", userId)
    .eq("period", "weekly")
    .eq("period_key", week);

  const weeklyState = new Map<string, { progress: number; claimed: boolean }>();
  for (const row of weeklyRows ?? []) {
    weeklyState.set(row.mission_id, {
      progress: row.progress,
      claimed: row.claimed,
    });
  }

  for (const mission of WEEKLY_MISSIONS) {
    const state = weeklyState.get(mission.id);
    if (state?.claimed) continue;

    let progress = state?.progress ?? 0;

    if (contributesTo(mission.metric, result)) {
      progress = Math.min(progress + 1, mission.target);
    }

    await supabase.from("user_missions").upsert(
      {
        user_id: userId,
        mission_id: mission.id,
        type: "weekly",
        period: "weekly",
        period_key: week,
        progress,
        claimed: progress >= mission.target,
      },
      { onConflict: "user_id,mission_id,period,period_key" }
    );

    if (progress >= mission.target && (state?.progress ?? 0) < mission.target) {
      await supabase.from("xp_events").insert({
        user_id: userId,
        amount: mission.rewardXp,
        reason: "weekly_mission",
        game_id: mission.id,
      });
      completed.push(mission.id);
    }
  }

  return completed;
}

/**
 * Check if a game result contributes to a mission metric
 */
function contributesTo(metric: string, result: GameResult): boolean {
  switch (metric) {
    case "games":
      return true;
    case "wins":
      return result.won;
    case "games_cs2_aim":
      return result.gameId === "cs2-aim";
    case "games_geoguessr":
      return result.gameId === "geoguessr";
    case "games_any_3":
      return true; // tracked separately (distinct game count)
    case "achievements":
      return false; // tracked via achievement unlocks
    default:
      return false;
  }
}

/**
 * Get mission progress for UI
 */
export async function getMissionProgress(
  supabase: SupabaseClient,
  userId: string,
  type: "daily" | "weekly"
): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    target: number;
    progress: number;
    rewardXp: number;
    claimed: boolean;
  }>
> {
  const periodKey = type === "daily" ? getTodayKey() : getWeekKey();
  const defs = type === "daily" ? DAILY_MISSIONS : WEEKLY_MISSIONS;

  const { data: rows } = await supabase
    .from("user_missions")
    .select("mission_id, progress, claimed")
    .eq("user_id", userId)
    .eq("period", type)
    .eq("period_key", periodKey);

  const rowMap = new Map(
    (rows ?? []).map((r) => [r.mission_id, r])
  );

  return defs.map((def) => {
    const row = rowMap.get(def.id);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      target: def.target,
      progress: row?.progress ?? 0,
      rewardXp: def.rewardXp,
      claimed: row?.claimed ?? false,
    };
  });
}

/**
 * Claim a completed mission's reward (manual claim pattern)
 */
export async function claimMission(
  supabase: SupabaseClient,
  userId: string,
  missionId: string,
  type: "daily" | "weekly"
): Promise<{ success: boolean; error?: string }> {
  const periodKey = type === "daily" ? getTodayKey() : getWeekKey();

  const { data: row } = await supabase
    .from("user_missions")
    .select("progress, claimed, reward_xp")
    .eq("user_id", userId)
    .eq("mission_id", missionId)
    .eq("period", type)
    .eq("period_key", periodKey)
    .maybeSingle();

  if (!row) return { success: false, error: "Mission not found" };
  if (row.claimed) return { success: false, error: "Already claimed" };
  const target = (type === "daily" ? getDailyMissions() : getWeeklyMissions()).find((m) => m.id === missionId)?.target ?? 0;
  if (row.progress < target) {
    return { success: false, error: "Not completed yet" };
  }

  // Mark as claimed
  await supabase
    .from("user_missions")
    .update({ claimed: true })
    .eq("user_id", userId)
    .eq("mission_id", missionId)
    .eq("period", type)
    .eq("period_key", periodKey);

  // Award XP
  await supabase.from("xp_events").insert({
    user_id: userId,
    amount: row.reward_xp ?? 0,
    reason: `${type}_mission`,
    game_id: missionId,
  });

  return { success: true };
}
