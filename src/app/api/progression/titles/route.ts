import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { levelFromXp } from "@/lib/xp";

export const dynamic = "force-dynamic";

// All available titles with their requirements
const TITLES: Array<{
  id: string;
  name: string;
  icon: string;
  requirement: string;
  minLevel: number;
}> = [
  { id: "rookie", name: "Новичок", icon: "🌱", requirement: "Уровень 1", minLevel: 1 },
  { id: "amateur", name: "Любитель", icon: "⚽", requirement: "Уровень 5", minLevel: 5 },
  { id: "veteran", name: "Ветеран", icon: "🏅", requirement: "Уровень 10", minLevel: 10 },
  { id: "professional", name: "Профессионал", icon: "💼", requirement: "Уровень 20", minLevel: 20 },
  { id: "expert", name: "Эксперт", icon: "🎯", requirement: "Уровень 30", minLevel: 30 },
  { id: "master", name: "Мастер", icon: "🏆", requirement: "Уровень 50", minLevel: 50 },
  { id: "legend", name: "Легенда", icon: "👑", requirement: "Уровень 75", minLevel: 75 },
  { id: "icon", name: "Икона", icon: "⭐", requirement: "Уровень 100", minLevel: 100 },
];

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return NextResponse.json({ ok: false, error: "Server not configured" }, { status: 500 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // Get user's total XP and level
    const { data: xpEvents } = await supabase
      .from("xp_events")
      .select("amount")
      .eq("user_id", user.id);

    const totalXp = (xpEvents ?? []).reduce((s: number, e: { amount?: number }) => s + (e.amount ?? 0), 0);
    const level = levelFromXp(totalXp);

    // Get unlocked titles
    const { data: userTitles } = await supabase
      .from("user_titles")
      .select("title_id, is_active")
      .eq("user_id", user.id);

    const unlockedIds = new Set((userTitles ?? []).map((t) => t.title_id));
    const activeTitle = (userTitles ?? []).find((t) => t.is_active)?.title_id ?? null;

    // Get selected title from profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("selected_title")
      .eq("id", user.id)
      .maybeSingle();

    const titles = TITLES.map((t) => ({
      ...t,
      unlocked: unlockedIds.has(t.id) || level >= t.minLevel,
      isActive: activeTitle === t.id,
      isSelectable: level >= t.minLevel,
    }));

    return NextResponse.json({
      ok: true,
      level,
      totalXp,
      selectedTitle: profile?.selected_title ?? activeTitle,
      titles,
    });
  } catch (e) {
    console.error("GET /api/progression/titles:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return NextResponse.json({ ok: false, error: "Server not configured" }, { status: 500 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { titleId } = await req.json() as { titleId?: string };
    if (!titleId) {
      return NextResponse.json({ ok: false, error: "titleId is required" }, { status: 400 });
    }

    // Check if title exists
    const title = TITLES.find((t) => t.id === titleId);
    if (!title) {
      return NextResponse.json({ ok: false, error: "Invalid title" }, { status: 400 });
    }

    // Check if user has unlocked this title
    const { data: xpEvents } = await supabase
      .from("xp_events")
      .select("amount")
      .eq("user_id", user.id);

    const totalXp = (xpEvents ?? []).reduce((s: number, e: { amount?: number }) => s + (e.amount ?? 0), 0);
    const level = levelFromXp(totalXp);

    if (level < title.minLevel) {
      return NextResponse.json(
        { ok: false, error: `Нужен уровень ${title.minLevel}` },
        { status: 403 }
      );
    }

    // Insert or update the title
    await supabase.from("user_titles").upsert(
      {
        user_id: user.id,
        title_id: titleId,
        is_active: true,
      },
      { onConflict: "user_id,title_id" }
    );

    // Deactivate other titles
    await supabase
      .from("user_titles")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .neq("title_id", titleId);

    // Update profile
    await supabase
      .from("user_profiles")
      .update({ selected_title: titleId })
      .eq("id", user.id);

    return NextResponse.json({ ok: true, titleId });
  } catch (e) {
    console.error("POST /api/progression/titles:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
