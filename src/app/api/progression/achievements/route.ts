import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { getAchievements } from "@/lib/progression/achievement-service";
import { levelFromXp } from "@/lib/xp";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return NextResponse.json({ ok: false, error: "Server not configured" }, { status: 500 });

    // Get auth user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // Fetch game stats
    const { data: statsRows } = await supabase
      .from("user_game_stats")
      .select("game_id, stats")
      .eq("user_id", user.id);

    const gameStats: Record<string, Record<string, number>> = {};
    let totalGamesPlayed = 0;
    let totalWins = 0;
    let maxWinStreak = 0;

    for (const row of statsRows ?? []) {
      const s = (row.stats ?? {}) as Record<string, number>;
      gameStats[row.game_id] = s;
      totalGamesPlayed += s.gamesPlayed ?? 0;
      totalWins += s.wins ?? 0;
      if (s.winStreak > maxWinStreak) maxWinStreak = s.winStreak;
    }

    // Fetch total XP
    const { data: xpEvents } = await supabase
      .from("xp_events")
      .select("amount")
      .eq("user_id", user.id);
    const totalXp = (xpEvents ?? []).reduce((s: number, e: { amount?: number }) => s + (e.amount ?? 0), 0);
    const level = levelFromXp(totalXp);

    // Fetch streak
    const { data: streakRow } = await supabase
      .from("user_streaks")
      .select("current_streak")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch unlocked achievements
    const { data: unlockedRows } = await supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", user.id);

    const unlockedMap = new Map<string, string>();
    for (const r of unlockedRows ?? []) {
      if (r.achievement_id) unlockedMap.set(r.achievement_id, r.unlocked_at);
    }

    // Build response
    const achievements = getAchievements().map((a) => {
      const unlocked = unlockedMap.has(a.id);
      let progress = unlocked ? 1 : 0;
      if (!unlocked && a.progress) {
        progress = a.progress({
          totalGamesPlayed,
          totalWins,
          winStreak: maxWinStreak,
          gameStats,
          level,
        } as any);
      }
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        rewardXp: a.rewardXp,
        unlocked,
        progress: Math.min(progress, 1),
        unlocked_at: unlockedMap.get(a.id) ?? null,
      };
    });

    return NextResponse.json({ ok: true, achievements });
  } catch (e) {
    console.error("GET /api/progression/achievements:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
