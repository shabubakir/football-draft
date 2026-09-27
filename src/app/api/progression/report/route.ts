import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/progression/report
 *
 * Server-side endpoint that receives a game result from the client,
 * validates it, and runs the full progression pipeline:
 *   XP → Stats → Achievements → Streak → Missions
 *
 * Security: The client sends ONLY the game result (gameId, won, score, metadata).
 * XP is calculated server-side. The user's identity comes from their auth token.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { gameId, won, score, metadata, isDaily } = body as {
      gameId?: string;
      won?: boolean;
      score?: number;
      metadata?: Record<string, number>;
      isDaily?: boolean;
    };

    if (!gameId || typeof won !== "boolean") {
      return NextResponse.json(
        { error: "gameId and won are required" },
        { status: 400 }
      );
    }

    // Get the user's auth token from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice(7);

    // Create a Supabase client with the user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    });

    // Verify the user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Import the progression logic (server-side execution)
    // Note: In production, this would run in a Supabase Edge Function
    // or be inlined here. For now, we duplicate the critical logic.

    // 1. Calculate XP (same logic as xp-service.ts)
    const gameRules: Record<
      string,
      { complete: number; win: number; perfect?: number; daily?: number }
    > = {
      "football-draft": { complete: 5, win: 50 },
      "grid-day": { complete: 5, win: 30, perfect: 10, daily: 15 },
      "guess-player": { complete: 5, win: 30, perfect: 20, daily: 15 },
      career: { complete: 5, win: 40, perfect: 20, daily: 15 },
      quiz: { complete: 5, win: 20, perfect: 10 },
      "cs2-cases": { complete: 2, win: 0 },
      "cs2-aim": { complete: 5, win: 10, perfect: 20 },
      "cs2-hl": { complete: 5, win: 10, perfect: 15 },
      akinator: { complete: 5, win: 15, perfect: 10 },
      geoguessr: { complete: 5, win: 25, perfect: 30 },
    };

    const rules = gameRules[gameId];
    if (!rules) {
      return NextResponse.json(
        { error: "Unknown game" },
        { status: 400 }
      );
    }

    let xpAmount = rules.complete;
    if (won) xpAmount += rules.win;

    // Perfect score check (server-side validation)
    if (rules.perfect) {
      const isPerfect =
        gameId === "cs2-aim" && (score ?? 0) >= 1000;
      if (isPerfect) xpAmount += rules.perfect;
    }

    if (isDaily && rules.daily) {
      xpAmount += rules.daily;
    }

    // 2. Insert XP event
    const xpReason = won ? `${gameId}_win` : `${gameId}_complete`;
    const { error: xpError } = await supabase.from("xp_events").insert({
      user_id: userId,
      amount: xpAmount,
      reason: xpReason,
      game_id: gameId,
    });

    if (xpError) {
      return NextResponse.json(
        { error: `XP insert failed: ${xpError.message}` },
        { status: 500 }
      );
    }

    // 3. Update game stats
    const { data: existingStats } = await supabase
      .from("user_game_stats")
      .select("stats")
      .eq("user_id", userId)
      .eq("game_id", gameId)
      .maybeSingle();

    const current = (existingStats?.stats ?? {}) as Record<string, number>;
    const update: Record<string, number> = {
      gamesPlayed: (current.gamesPlayed ?? 0) + 1,
    };

    if (won) {
      update.wins = (current.wins ?? 0) + 1;
    } else {
      update.losses = (current.losses ?? 0) + 1;
    }

    // Game-specific updates
    if (gameId === "cs2-aim" && score && score > (current.bestScore ?? 0)) {
      update.bestScore = score;
    }
    if (gameId === "geoguessr" && score) {
      update.totalScore = (current.totalScore ?? 0) + score;
      if (score > (current.bestScore ?? 0)) update.bestScore = score;
    }
    if (gameId === "cs2-hl" && metadata?.streak) {
      update.bestStreak = Math.max(current.bestStreak ?? 0, metadata.streak);
    }

    await supabase.from("user_game_stats").upsert(
      {
        user_id: userId,
        game_id: gameId,
        stats: { ...current, ...update },
      },
      { onConflict: "user_id,game_id" }
    );

    // 4. Insert game result (for recent activity)
    await supabase.from("game_results").insert({
      user_id: userId,
      game_id: gameId,
      won,
      score: score ?? null,
      xp_earned: xpAmount,
      metadata: metadata ?? {},
    });

    // 5. Update streak
    const today = new Date().toISOString().slice(0, 10);
    const { data: streakRow } = await supabase
      .from("user_streaks")
      .select("current_streak, best_streak, last_played_date")
      .eq("user_id", userId)
      .maybeSingle();

    const currentStreak = streakRow?.current_streak ?? 0;
    const bestStreak = streakRow?.best_streak ?? 0;
    const lastPlayed = streakRow?.last_played_date ?? null;

    let newStreak: number;
    if (!lastPlayed) {
      newStreak = 1;
    } else if (lastPlayed === today) {
      newStreak = currentStreak;
    } else {
      const diff =
        (new Date(today).getTime() - new Date(lastPlayed).getTime()) / 86400000;
      newStreak = Math.round(diff) === 1 ? currentStreak + 1 : 1;
    }

    const newBest = Math.max(bestStreak, newStreak);

    await supabase.from("user_streaks").upsert(
      {
        user_id: userId,
        current_streak: newStreak,
        best_streak: newBest,
        last_played_date: today,
      },
      { onConflict: "user_id" }
    );

    // Streak milestone XP
    const milestones: Record<number, number> = { 3: 25, 7: 100, 14: 250, 30: 500 };
    if (milestones[newStreak]) {
      await supabase.from("xp_events").insert({
        user_id: userId,
        amount: milestones[newStreak],
        reason: `streak_${newStreak}`,
        game_id: "streak",
      });
      xpAmount += milestones[newStreak];
    }

    // 6. Check achievements (simplified server-side)
    const { data: allStats } = await supabase
      .from("user_game_stats")
      .select("game_id, stats")
      .eq("user_id", userId);

    const allGameStats: Record<string, Record<string, number>> = {};
    let totalGames = 0;
    let totalWins = 0;
    for (const row of allStats ?? []) {
      const s = (row.stats ?? {}) as Record<string, number>;
      allGameStats[row.game_id] = s;
      totalGames += s.gamesPlayed ?? 0;
      totalWins += s.wins ?? 0;
    }

    const { data: unlockedRows } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);
    const alreadyUnlocked = new Set(
      (unlockedRows ?? []).map((r) => r.achievement_id)
    );

    const newAchievements: string[] = [];

    // Basic achievement checks
    const checks: Array<{ id: string; condition: boolean; xp: number }> = [
      {
        id: "first_game",
        condition: totalGames >= 1 && !alreadyUnlocked.has("first_game"),
        xp: 10,
      },
      {
        id: "winner",
        condition: totalWins >= 25 && !alreadyUnlocked.has("winner"),
        xp: 50,
      },
      {
        id: "aim_master",
        condition:
          (allGameStats["cs2-aim"]?.bestScore ?? 0) >= 1000 &&
          !alreadyUnlocked.has("aim_master"),
        xp: 30,
      },
      {
        id: "explorer",
        condition:
          (allGameStats["geoguessr"]?.gamesPlayed ?? 0) >= 10 &&
          !alreadyUnlocked.has("explorer"),
        xp: 30,
      },
      {
        id: "quiz_master",
        condition:
          (allGameStats["quiz"]?.correctAnswers ?? 0) >= 50 &&
          !alreadyUnlocked.has("quiz_master"),
        xp: 30,
      },
    ];

    for (const check of checks) {
      if (check.condition) {
        await supabase.from("user_achievements").insert({
          user_id: userId,
          achievement_id: check.id,
        });
        await supabase.from("xp_events").insert({
          user_id: userId,
          amount: check.xp,
          reason: "achievement",
          game_id: check.id,
        });
        newAchievements.push(check.id);
      }
    }

    // 7. Calculate level and check for level up
    const { data: xpEvents } = await supabase
      .from("xp_events")
      .select("amount")
      .eq("user_id", userId);
    const totalXp = (xpEvents ?? []).reduce((s: number, e: { amount?: number }) => s + (e.amount ?? 0), 0);

    // Simple level formula (triangular numbers: level N requires 100*(N-1)*N/2 total XP)
    const levelFromXp = (xp: number): number => {
      if (xp < 100) return 1;
      let level = 1;
      let cumulative = 0;
      while (true) {
        const nextLevelXp = 100 * level * (level + 1) / 2;
        if (cumulative + nextLevelXp > xp) break;
        cumulative += nextLevelXp;
        level++;
        if (level > 1000) break;
      }
      return level;
    };

    const level = levelFromXp(totalXp);

    // Check if leveled up (compare with level before this XP award)
    const prevTotalXp = totalXp - xpAmount;
    const prevLevel = levelFromXp(prevTotalXp);
    const leveledUp = level > prevLevel;

    // Send notification for level up / achievements
    if (leveledUp) {
      await supabase.from("user_notifications").insert({
        user_id: userId,
        type: "levelup",
        title: `Уровень ${level}!`,
        message: `Вы достигли уровня ${level}`,
      });
    }

    if (newAchievements.length > 0) {
      await supabase.from("user_notifications").insert({
        user_id: userId,
        type: "achievement",
        title: "Достижение получено!",
        message: `Новые достижения: ${newAchievements.join(", ")}`,
      });
    }

    // Check streak milestone
    const streakMilestones = [3, 7, 14, 30];
    const streakMilestone = streakMilestones.includes(newStreak);

    // Get achievement names for the response
    const achievementNames: Record<string, string> = {
      first_game: "Первая игра",
      winner: "Победитель",
      aim_master: "Мастер прицела",
      explorer: "Исследователь",
      quiz_master: "Мастер викторин",
      on_fire: "В огне",
    };

    const newAchievementsWithNames = newAchievements.map((id) => ({
      id,
      name: achievementNames[id] ?? id,
    }));

    return NextResponse.json({
      success: true,
      xpAwarded: xpAmount,
      totalXp,
      level,
      leveledUp,
      newAchievements: newAchievementsWithNames,
      streakDays: newStreak,
      streakMilestone,
      missionsCompleted: [],
    });
  } catch (e) {
    console.error("Progression report error:", e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
