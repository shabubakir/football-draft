// Профиль игрока без аккаунта: стабильный device_id в localStorage,
// прогресс (опыт/уровень/звание) в Supabase.
// Используется только в клиентских компонентах (Supabase browser client).
import { getSupabaseBrowser } from "./supabase";

export const XP_KEYS = {
  guess_win_1: 100,   // угадал за 1 попытку
  guess_win: 60,      // обычная победа
  grid_day_win: 80,   // победил в сетке дня
  grid_friend_win: 20, // выигрыш в сетке с другом
  grid_online_win: 30, // выигрыш в сетке онлайн
  quiz_win: 20,        // 1-е место в викторине
} as const;

export type Profile = {
  id: number;
  device_id: string;
  display_name: string;
  xp: number;
  created_at: string;
  last_active_at: string;
};

// ---------- Звания по уровням ----------
export type Rank = { level: number; title: string };

export const RANKS: Rank[] = [
  { level: 1, title: "НОВИЧОК" },
  { level: 2, title: "БОЛЕЛЬЩИК" },
  { level: 3, title: "ПОЛКОВНИК" },
  { level: 4, title: "КАПИТАН" },
  { level: 5, title: "ТРЕНАРЬ" },
  { level: 6, title: "СТРАТЕГ" },
  { level: 7, title: "ТАКТИК" },
  { level: 8, title: "МЕНЕДЖЕР" },
  { level: 9, title: "ЛЕГЕНДА" },
  { level: 10, title: "МИФИЧЕСКИЙ" },
];

// Уровень = 1 + floor(xp / 100). Прогресс внутри уровня = (xp % 100) / 100.
export function levelOf(xp: number): number {
  return 1 + Math.floor(xp / 100);
}

export function levelProgress(xp: number): number {
  return xp % 100;
}

export function rankOf(xp: number): Rank {
  const lvl = levelOf(xp);
  let r = RANKS[0];
  for (const x of RANKS) if (x.level <= lvl) r = x;
  return r;
}

// ---------- device_id ----------
const DEVICE_KEY = "fd_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = "d" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getDeviceName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("fd_player_name") ?? "";
}

export function setDeviceName(name: string) {
  if (typeof window !== "undefined") localStorage.setItem("fd_player_name", name);
}

// ---------- Supabase-операции ----------
export async function ensureProfile(deviceId: string, name?: string): Promise<Profile | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data } = await sb
    .from("players_profile")
    .select()
    .eq("device_id", deviceId)
    .maybeSingle();
  if (data) return data as Profile;

  const cleanName = name?.trim() || "Игрок";
  const { data: created, error } = await sb
    .from("players_profile")
    .insert({ device_id: deviceId, display_name: cleanName })
    .select()
    .single();
  if (error) return null;
  return created as Profile;
}

export async function addXp(deviceId: string, amount: number, name?: string): Promise<Profile | null> {
  const sb = getSupabaseBrowser();
  if (!sb || amount <= 0) return null;
  const existing = await ensureProfile(deviceId, name);
  if (!existing) return null;
  const { data, error } = await sb
    .from("players_profile")
    .update({ xp: existing.xp + amount, last_active_at: new Date().toISOString() })
    .eq("id", existing.id)
    .select()
    .single();
  if (error) return null;
  return data as Profile;
}

export async function renameProfile(deviceId: string, name: string): Promise<void> {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  const clean = name.trim() || "Игрок";
  await sb
    .from("players_profile")
    .update({ display_name: clean, last_active_at: new Date().toISOString() })
    .eq("device_id", deviceId);
}

export type LeaderRow = {
  device_id: string;
  display_name: string;
  xp: number;
  last_active_at: string;
};

export type GridDayRow = {
  device_id: string;
  puzzle_date: string;
  grid_seed: number;
  won: boolean;
  correct: number;
  mistakes: number;
  created_at: string;
};

export type GuessResultRow = {
  user_id: string;
  profile_id: string | null;
  puzzle_id: number;
  won: boolean;
  attempts: number;
  created_at: string;
};

// ---------- Сводка для страницы рейтинга ----------
export type Leaderboard = {
  rows: Array<{
    place: number;
    device_id: string;
    display_name: string;
    xp: number;
    level: number;
    rank: string;
    progress: number;
    activeDays: number;
  }>;
  myPlace: number | null;
  my: {
    device_id: string;
    display_name: string;
    xp: number;
    level: number;
    rank: string;
    progress: number;
  } | null;
};

export async function buildLeaderboard(
  period: "day" | "week" | "all",
  myDeviceId: string
): Promise<Leaderboard | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;

  // Активность: сколько дней подряд / за период игрок появлялся
  let since: Date | null = null;
  if (period === "day") since = new Date();
  else if (period === "week") since = new Date(Date.now() - 7 * 86400000);

  const sinceFilter = since
    ? since.toISOString().slice(0, 10)
    : "1970-01-01";

  // Активные дни = distinct puzzle_date в grid_day_results + created_at в guess_results
  // (profile_id связывает результаты угадывалки с профилем без аккаунта)
  const [gRes, xRes] = await Promise.all([
    sb.from("grid_day_results").select("device_id, puzzle_date").gte("puzzle_date", sinceFilter),
    sb
      .from("guess_results")
      .select("profile_id, created_at")
      .not("profile_id", "is", null)
      .gte("created_at", new Date(sinceFilter).toISOString()),
  ]);

  const daySets = new Map<string, Set<string>>();
  const addDay = (id: string, d: string) => {
    if (!id) return;
    if (!daySets.has(id)) daySets.set(id, new Set());
    daySets.get(id)!.add(d);
  };
  for (const r of gRes.data ?? []) addDay(r.device_id, r.puzzle_date);
  for (const r of xRes.data ?? []) addDay(r.profile_id, r.created_at.slice(0, 10));

  // Рейтинг: общий опыт (без периода) — «уровень не сгорает»
  const profs = await sb.from("players_profile").select("device_id, display_name, xp, last_active_at");
  if (profs.error) return null;

  const rows = (profs.data ?? [])
    .map((p) => {
      const xp = (p as Profile).xp;
      return {
        place: 0,
        device_id: p.device_id,
        display_name: p.display_name,
        xp,
        level: levelOf(xp),
        rank: rankOf(xp).title,
        progress: levelProgress(xp),
        activeDays: daySets.get(p.device_id)?.size ?? 0,
      };
    })
    .sort((a, b) => b.xp - a.xp);

  rows.forEach((r, i) => (r.place = i + 1));
  const top = rows.slice(0, 100);
  const me = rows.find((r) => r.device_id === myDeviceId) ?? null;

  return { rows: top, myPlace: me?.place ?? null, my: me };
}
