import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// XP award constants (server-side)
const XP_AWARDS = {
  game_complete: 5,
  game_win: 10,
  game_perfect: 25,
  daily_challenge: 15,
  geo_guess_win: 60,
  geo_guess_win_1: 100,
  grid_day_win: 80,
  grid_friend_win: 20,
  grid_online_win: 30,
  quiz_win: 20,
  career_win: 100,
  draft_champion: 150,
  draft_qualify: 50,
  guest_migration: 50,
} as const;

type XpAwardReason = keyof typeof XP_AWARDS;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, reason, gameId } = body as {
      userId?: string;
      reason?: XpAwardReason;
      gameId?: string;
    };

    if (!userId || !reason) {
      return NextResponse.json(
        { error: "userId and reason are required" },
        { status: 400 }
      );
    }

    // Validate reason
    if (!(reason in XP_AWARDS)) {
      return NextResponse.json(
        { error: "Invalid reason" },
        { status: 400 }
      );
    }

    const amount = XP_AWARDS[reason];

    // Create server client with user's auth token
    const { data: userData } = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      }
    ).then((r) => r.json().catch(() => null));

    // Insert XP event (server-side only)
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { error: insertErr } = await supabase
      .from("xp_events")
      .insert({
        user_id: userId,
        amount,
        reason,
        game_id: gameId ?? null,
      });

    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, amount });
  } catch (e) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
