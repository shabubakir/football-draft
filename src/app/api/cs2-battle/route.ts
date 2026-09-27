// CASE BATTLE — API (authoritative backend)
//
// Все решения о результатах принимаются СЕРВЕРОМ:
//  - match_seed генерируется здесь при создании матча
//  - при открытии сервер сам вычисляет предмет (rollRound) и его цену
//  - клиент только говорит "я открыл раунд N" — предмет/цена от сервера
//  - seed в таблице БД (BIGINT), клиент его не запрашивает и не получает
//
// Эндпоинты:
//   POST /api/cs2-battle              { action: "create"|"join"|"start"|"open"|"reveal"|"rematch"|"leave", ... }
//   GET  /api/cs2-battle?code=XXXXXX  → состояние комнаты (без seed)
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import {
  findCase,
  makeBattleCode,
  rollRound,
  playerStats,
  type BattleRoom,
  type BattlePlayer,
} from "@/lib/cs2-battle";

type PriceMap = Record<string, { min: number; max: number; wears?: Record<string, number> }>;

// ---------- Кэш цен предметов (SkinCash), 7 дней ----------
let priceCache: { ts: number; data: PriceMap } | null = null;

async function getCasePrices(caseName: string): Promise<PriceMap> {
  if (priceCache && Date.now() - priceCache.ts < 7 * 24 * 3600 * 1000) {
    return priceCache.data;
  }
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const res = await fetch(`${origin}/api/cs2-prices?case=${encodeURIComponent(caseName)}`, {
    headers: { Accept: "application/json" },
  });
  const d = (await res.json()) as { prices?: PriceMap };
  const data: PriceMap = d.prices ?? {};
  priceCache = { ts: Date.now(), data };
  return data;
}

function ok(data: unknown) {
  return NextResponse.json(data);
}
function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function stripSeed(room: BattleRoom) {
  const { match_seed, ...rest } = room;
  return rest;
}

function freshRounds(count: number) {
  return Array.from({ length: count }, () => ({
    p1: null,
    p2: null,
    revealed1: false,
    revealed2: false,
  }));
}

function newSeed() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

// ---------- GET /api/cs2-battle?code=XXXXXX ----------
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return err("code required");

  const sb = getSupabaseServer();
  if (!sb) return err("Backend not configured", 503);

  const { data, error } = await sb
    .from("cs2_battle_rooms")
    .select()
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) return err(error.message, 500);
  if (!data) return err("Room not found", 404);

  return ok({ room: stripSeed(data as unknown as BattleRoom) });
}

// ---------- POST /api/cs2-battle { action, ... } ----------
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action as string;
  const deviceId = String(body.deviceId ?? "");
  const code = String(body.code ?? "").toUpperCase();

  if (!deviceId) return err("deviceId required");
  const sb = getSupabaseServer();
  if (!sb) return err("Backend not configured", 503);

  switch (action) {
    // ================= create =================
    case "create": {
      const caseName = String(body.caseName ?? "");
      const cs = findCase(caseName);
      if (!cs) return err("Case not found", 404);

      const name = String(body.name ?? "").trim().slice(0, 24) || "Игрок";
      const players: BattlePlayer[] = [{ id: deviceId, name, seat: "host" }];

      const { data, error } = await sb
        .from("cs2_battle_rooms")
        .insert({
          code: makeBattleCode(),
          mode: "classic",
          case_name: cs.name,
          bank: 10000,
          rounds: 10,
          match_seed: newSeed(),
          players,
          rounds_data: freshRounds(10),
        })
        .select()
        .single();
      if (error || !data) return err("Failed to create room: " + (error?.message ?? "?"), 500);

      return ok({ room: stripSeed(data as unknown as BattleRoom) });
    }

    // ================= join =================
    case "join": {
      if (!code) return err("code required");
      const { data: row, error } = await sb
        .from("cs2_battle_rooms")
        .select()
        .eq("code", code)
        .maybeSingle();
      if (error || !row) return err("Room not found", 404);

      const room = row as unknown as BattleRoom;
      if (room.status !== "waiting") return err("Матч уже идёт или завершён");
      if ((room.players ?? []).length >= 2) return err("Комната полная (2 игрока)");

      const existing = (room.players ?? []).find((p) => p.id === deviceId);
      if (existing) return ok({ room: stripSeed(room) });

      const name = String(body.name ?? "").trim().slice(0, 24) || "Игрок";
      const players: BattlePlayer[] = [...room.players, { id: deviceId, name, seat: "guest" }];
      const { error: upE } = await sb
        .from("cs2_battle_rooms")
        .update({ players })
        .eq("id", room.id);
      if (upE) return err("Не удалось подключиться: " + upE.message, 500);

      return ok({ room: stripSeed({ ...room, players }) });
    }

    // ================= start (host) =================
    case "start": {
      if (!code) return err("code required");
      const { data: row, error } = await sb
        .from("cs2_battle_rooms")
        .select()
        .eq("code", code)
        .maybeSingle();
      if (error || !row) return err("Room not found", 404);

      const room = row as unknown as BattleRoom;
      const me = (room.players ?? []).find((p) => p.id === deviceId);
      if (!me || me.seat !== "host") return err("Только хост может начать матч");
      if (room.status !== "waiting") return err("Матч не в лобби");
      if ((room.players ?? []).length < 2) return err("Ждём второго игрока");

      const { error: upE } = await sb
        .from("cs2_battle_rooms")
        .update({ status: "playing", started_at: new Date().toISOString() })
        .eq("id", room.id);
      if (upE) return err(upE.message, 500);

      return ok({ room: stripSeed({ ...room, status: "playing" }) });
    }

    // ================= open (авторитетное открытие) =================
    case "open": {
      if (!code) return err("code required");
      const round = Number(body.round);
      const seat = String(body.seat ?? "");
      if (!Number.isInteger(round)) return err("round required");
      if (seat !== "host" && seat !== "guest") return err("seat required");

      const { data: row, error } = await sb
        .from("cs2_battle_rooms")
        .select()
        .eq("code", code)
        .maybeSingle();
      if (error || !row) return err("Room not found", 404);

      const room = row as unknown as BattleRoom;
      if (room.status !== "playing") return err("Матч не идёт");

      const me = (room.players ?? []).find((p) => p.id === deviceId);
      if (!me || me.seat !== seat) return err("Вы не этот игрок в комнате");

      if (round < 0 || round >= room.rounds) return err("Неверный номер раунда");
      const rnd = room.rounds_data[round];
      const key = seat === "host" ? "p1" : "p2";
      if (rnd[key]) return err("Раунд уже открыт");

      // СЕРВЕРОМ вычисляется результат (seed из БД, клиент его не знает)
      const cs = findCase(room.case_name);
      if (!cs) return err("Case not found in room", 500);
      const prices = await getCasePrices(room.case_name);
      const item = rollRound(cs, room.match_seed, round, seat === "host" ? 0 : 1, prices);
      if (!item) return err("Could not roll item", 500);

      const roundsData = [...room.rounds_data];
      roundsData[round] = { ...rnd, [key]: item };
      const { error: upE } = await sb
        .from("cs2_battle_rooms")
        .update({ rounds_data: roundsData })
        .eq("id", room.id);
      if (upE) return err(upE.message, 500);

      return ok({
        room: stripSeed({ ...room, rounds_data: roundsData }),
        item,
      });
    }

    // ================= reveal (после анимации) =================
    case "reveal": {
      if (!code) return err("code required");
      const round = Number(body.round);
      const seat = String(body.seat ?? "");
      if (!Number.isInteger(round)) return err("round required");
      if (seat !== "host" && seat !== "guest") return err("seat required");

      const { data: row, error } = await sb
        .from("cs2_battle_rooms")
        .select()
        .eq("code", code)
        .maybeSingle();
      if (error || !row) return err("Room not found", 404);

      const room = row as unknown as BattleRoom;
      const me = (room.players ?? []).find((p) => p.id === deviceId);
      if (!me || me.seat !== seat) return err("Seat mismatch");
      if (round < 0 || round >= room.rounds) return err("Неверный номер раунда");

      const rnd = room.rounds_data[round];
      const key = seat === "host" ? "p1" : "p2";
      if (!rnd[key]) return err("Раунд ещё не открыт");

      const roundsData = [...room.rounds_data];
      roundsData[round] = seat === "host" ? { ...rnd, revealed1: true } : { ...rnd, revealed2: true };

      // Финал: все раунды открыты И раскрыты
      let status = room.status;
      let winner = room.winner;
      let finished_at = room.finished_at;
      const allDone = roundsData.every((r) => r.p1 == null || (r.revealed1 && r.revealed2));
      if (allDone) {
        const s1 = playerStats(roundsData, 0);
        const s2 = playerStats(roundsData, 1);
        winner = s1.total > s2.total ? "host" : s2.total > s1.total ? "guest" : "draw";
        status = "finished";
        finished_at = new Date().toISOString();
      }

      const { error: upE } = await sb
        .from("cs2_battle_rooms")
        .update({ rounds_data: roundsData, status, winner, finished_at })
        .eq("id", room.id);
      if (upE) return err(upE.message, 500);

      return ok({
        room: stripSeed({ ...room, rounds_data: roundsData, status, winner, finished_at }),
      });
    }

    // ================= rematch (реванш) =================
    case "rematch": {
      if (!code) return err("code required");
      const { data: row, error } = await sb
        .from("cs2_battle_rooms")
        .select()
        .eq("code", code)
        .maybeSingle();
      if (error || !row) return err("Room not found", 404);

      const room = row as unknown as BattleRoom;
      if (room.status !== "finished") return err("Матч ещё не завершён");
      const me = (room.players ?? []).find((p) => p.id === deviceId);
      if (!me) return err("Вы не игрок в этой комнате");

      const { error: upE } = await sb
        .from("cs2_battle_rooms")
        .update({
          status: "waiting",
          winner: null,
          match_seed: newSeed(),
          rounds_data: freshRounds(room.rounds),
          started_at: null,
          finished_at: null,
        })
        .eq("id", room.id);
      if (upE) return err(upE.message, 500);

      return ok({
        room: stripSeed({
          ...room,
          status: "waiting",
          winner: null,
          rounds_data: freshRounds(room.rounds),
        }),
      });
    }

    // ================= leave =================
    case "leave": {
      if (!code) return err("code required");
      const { data: row, error } = await sb
        .from("cs2_battle_rooms")
        .select()
        .eq("code", code)
        .maybeSingle();
      if (error || !row) return err("Room not found", 404);

      const room = row as unknown as BattleRoom;
      const me = (room.players ?? []).find((p) => p.id === deviceId);
      if (!me) return err("Вы не игрок в этой комнате");

      // Метка "вышел" — второй игрок увидит через realtime
      const players = room.players.map((p) =>
        p.id === deviceId ? { ...p, name: p.name + " (вышел)" } : p
      );
      const { error: upE } = await sb
        .from("cs2_battle_rooms")
        .update({ players })
        .eq("id", room.id);
      if (upE) return err(upE.message, 500);

      return ok({ ok: true });
    }

    default:
      return err("Unknown action: " + action);
  }
}
