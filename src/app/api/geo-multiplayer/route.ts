// GEOGUESSR LITE — MULTIPLAYER API (authoritative backend)
//
// СЕРВЕР источник истины:
//  - локации раундов выбираются сервером (одинаковые для всех)
//  - расстояние и очки считает сервер
//  - клиент присылает только координаты своей точки
//  - победителя определяет сервер
//
// Realtime: Supabase Realtime (postgres_changes), как в cs2-battle.
//
// Эндпоинты:
//   POST /api/geo-multiplayer  { action: "create"|"join"|"start"|"guess"|"next"|"rematch"|"leave"|"heartbeat", ... }
//   GET  /api/geo-multiplayer?code=XXXXXX → состояние комнаты

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import {
  computeScores,
  computeWinner,
  GEO_MAX_PLAYERS,
  GEO_ROUND_OPTIONS,
  getLocationById,
  makeGeoCode,
  pickRoundLocationIds,
  scoreRoundGuess,
  type GeoPlayer,
  type GeoRoom,
  type GeoRoomRound,
} from "@/lib/geo-multiplayer";

function ok(data: unknown) {
  return NextResponse.json(data);
}
function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Состояние комнаты из БД → нормализованный объект. */
function normalizeRoom(row: unknown): GeoRoom {
  const r = row as GeoRoom;
  return {
    ...r,
    status: (r.status as GeoRoom["status"]) ?? "waiting",
    rounds: Number(r.rounds) || 5,
    players: (r.players as GeoPlayer[]) ?? [],
    round_location_ids: (r.round_location_ids as (string | null)[]) ?? [],
    rounds_data: (r.rounds_data as GeoRoomRound[]) ?? [],
    scores: (r.scores as GeoRoom["scores"]) ?? [],
  };
}

function freshRound(): GeoRoomRound {
  return { location_id: null, guesses: [] };
}

async function fetchRoom(
  code: string
): Promise<{ room: GeoRoom; row: unknown } | { error: string; status: number }> {
  const sb = getSupabaseServer();
  if (!sb) return { error: "Backend not configured", status: 503 };
  const { data, error } = await sb
    .from("geo_rooms")
    .select()
    .eq("code", code)
    .maybeSingle();
  if (error) return { error: error.message, status: 500 };
  if (!data) return { error: "Комната не найдена", status: 404 };
  return { room: normalizeRoom(data), row: data };
}

function sanitizeName(raw: unknown, fallback = "Игрок"): string {
  const name = String(raw ?? "").trim().slice(0, 24);
  return name || fallback;
}

// ---------- GET /api/geo-multiplayer?code=XXXXXX ----------
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return err("code required");
  const res = await fetchRoom(code.toUpperCase());
  if ("error" in res) return err(res.error, res.status);
  return ok({ room: res.room });
}

// ---------- POST /api/geo-multiplayer { action, ... } ----------
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "");
  const deviceId = String(body.deviceId ?? "");
  const code = String(body.code ?? "").toUpperCase();

  if (!deviceId) return err("deviceId required");
  const sb = getSupabaseServer();
  if (!sb) return err("Backend not configured", 503);

  switch (action) {
    // ================= DEBUG: тест записи rounds_data =================
    case "debug-write": {
      if (!code) return err("code required");
      const found = await fetchRoom(code);
      if ("error" in found) return err(found.error, found.status);
      const room = found.room;

      // Читаем текущее rounds_data
      const { data: cur, error: curErr } = await sb
        .from("geo_rooms")
        .select("rounds_data")
        .eq("id", room.id)
        .maybeSingle();
      if (curErr || !cur) return err("read failed: " + (curErr?.message ?? "?"), 500);

      const rounds = (cur as { rounds_data: GeoRoomRound[] }).rounds_data;

      // Модифицируем round 0
      const newRounds = [...rounds];
      if (newRounds[0]) {
        newRounds[0] = {
          ...newRounds[0],
          guesses: [...newRounds[0].guesses, { playerId: "debug", lat: 0, lng: 0, distanceKm: 1, points: 100 }],
        };
      }

      const { error: upE, count: upCount } = await sb
        .from("geo_rooms")
        .update({ rounds_data: newRounds })
        .eq("id", room.id);

      // Перечитываем
      const { data: after, error: afterErr } = await sb
        .from("geo_rooms")
        .select("rounds_data")
        .eq("id", room.id)
        .maybeSingle();

      const afterRounds = after ? (after as { rounds_data: GeoRoomRound[] }).rounds_data : null;

      return ok({
        roomId: room.id,
        code: room.code,
        roundsLength: rounds.length,
        beforeGuesses: rounds[0]?.guesses?.length,
        beforeLocationId: rounds[0]?.location_id,
        updateError: upE?.message ?? null,
        updateErrorName: upE?.name ?? null,
        updateCount: upCount,
        afterReadError: afterErr?.message ?? null,
        afterGuesses: afterRounds?.[0]?.guesses?.length,
        afterLocationId: afterRounds?.[0]?.location_id,
        afterFull: afterRounds?.[0],
      });
    }

    // ================= create =================
    case "create": {
      const rounds = Number(body.rounds);
      if (!GEO_ROUND_OPTIONS.includes(rounds as (typeof GEO_ROUND_OPTIONS)[number])) {
        return err("Неверное количество раундов (5 или 10)");
      }
      const name = sanitizeName(body.name);
      const player: GeoPlayer = {
        id: deviceId,
        name,
        online: true,
        joined_at: new Date().toISOString(),
      };
      const { data, error } = await sb
        .from("geo_rooms")
        .insert({
          code: makeGeoCode(),
          status: "waiting",
          rounds,
          players: [player],
          round_location_ids: [],
          rounds_data: [],
          scores: [{ playerId: deviceId, total: 0 }],
        })
        .select()
        .single();
      if (error || !data)
        return err("Не удалось создать комнату: " + (error?.message ?? "?"), 500);
      return ok({ room: normalizeRoom(data) });
    }

    // ================= join =================
    case "join": {
      if (!code) return err("code required");
      const found = await fetchRoom(code);
      if ("error" in found) return err(found.error, found.status);
      const room = found.room;

      if (room.status !== "waiting")
        return err("Игра уже идёт или завершена — зайти нельзя");
      if (room.players.length >= GEO_MAX_PLAYERS)
        return err(`Комната полная (${GEO_MAX_PLAYERS} игроков)`);

      const existing = room.players.find((p) => p.id === deviceId);
      if (existing) {
        // Возвращение: обновляем имя (если дали новое) и online=true.
        const players = room.players.map((p) =>
          p.id === deviceId
            ? { ...p, online: true, name: body.name ? sanitizeName(body.name) : p.name }
            : p
        );
        const { error: upE } = await sb.from("geo_rooms").update({ players }).eq("id", room.id);
        if (upE) return err("Не удалось подключиться: " + upE.message, 500);
        return ok({ room: { ...room, players } });
      }

      const player: GeoPlayer = {
        id: deviceId,
        name: sanitizeName(body.name),
        online: true,
        joined_at: new Date().toISOString(),
      };
      const players = [...room.players, player];
      const scores = [...room.scores, { playerId: deviceId, total: 0 }];
      const { error: upE } = await sb
        .from("geo_rooms")
        .update({ players, scores })
        .eq("id", room.id);
      if (upE) return err("Не удалось подключиться: " + upE.message, 500);
      return ok({ room: { ...room, players, scores } });
    }

    // ================= start (первый игрок) =================
    case "start": {
      if (!code) return err("code required");
      const found = await fetchRoom(code);
      if ("error" in found) return err(found.error, found.status);
      const room = found.room;

      const me = room.players.find((p) => p.id === deviceId);
      if (!me) return err("Вы не игрок в этой комнате");
      if (room.status !== "waiting") return err("Игра не в лобби");
      if (room.players.length < 2) return err("Нужен хотя бы один второй игрок");

      // Локации: если в комнате уже есть (после rematch) — используем их;
      // иначе выбираем новые.
      const roundLocationIds =
        room.round_location_ids.length === room.rounds
          ? room.round_location_ids
          : pickRoundLocationIds(room.rounds);
      const roundsData: GeoRoomRound[] = Array.from({ length: room.rounds }, (_, i) => ({
        location_id: roundLocationIds[i] ?? null,
        guesses: [],
      }));
      const { error: upE } = await sb
        .from("geo_rooms")
        .update({
          status: "playing",
          round_location_ids: roundLocationIds,
          rounds_data: roundsData,
          started_at: new Date().toISOString(),
        })
        .eq("id", room.id);
      if (upE) return err(upE.message, 500);
      return ok({
        room: { ...room, status: "playing", round_location_ids: roundLocationIds, rounds_data: roundsData },
      });
    }

    // ================= guess =================
    case "guess": {
      if (!code) return err("code required");
      const found = await fetchRoom(code);
      if ("error" in found) return err(found.error, found.status);
      const room = found.room;
      if (room.status !== "playing") return err("Игра не идёт");

      const me = room.players.find((p) => p.id === deviceId);
      if (!me) return err("Вы не игрок в этой комнате");

      const roundIdx = room.rounds_data.length - 1;
      if (roundIdx < 0 || roundIdx >= room.rounds) return err("Неверный раунд");

      const locationId = room.round_location_ids[roundIdx] ?? room.rounds_data[roundIdx]?.location_id;
      if (!locationId) return err("Локация раунда не выбрана", 500);
      const location = getLocationById(locationId);
      if (!location) return err("Локация не найдена в базе", 500);

      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng))
        return err("Неверные координаты");
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return err("Координаты вне диапазона");

      // СЕРВЕР считает расстояние и очки
      const entry = scoreRoundGuess(location, deviceId, lat, lng);

      // Читаем актуальное rounds_data из БД
      const { data: cur, error: curErr } = await sb
        .from("geo_rooms")
        .select("rounds_data")
        .eq("id", room.id)
        .maybeSingle();
      if (curErr || !cur) return err("Не удалось прочитать комнату", 500);

      const rounds = (cur as { rounds_data: GeoRoomRound[] }).rounds_data;
      const rnd = rounds[roundIdx];
      if (!rnd) return err("Раунд не найден", 500);

      // Уже ответил? (идемпотентность)
      const existing = rnd.guesses.find((g) => g.playerId === deviceId);
      if (existing) {
        return ok({
          room: { ...room, rounds_data: rounds },
          result: { distanceKm: existing.distanceKm, points: existing.points, alreadyAnswered: true },
        });
      }

      // Записываем ответ
      const newRounds = [...rounds];
      newRounds[roundIdx] = {
        location_id: locationId,
        guesses: [...rnd.guesses, entry],
      };

      console.log("[guess] roundIdx:", roundIdx, "roomId:", room.id, "deviceId:", deviceId);
      console.log("[guess] entry:", JSON.stringify(entry));
      console.log("[guess] newRounds[roundIdx]:", JSON.stringify(newRounds[roundIdx]));

      const { error: upE } = await sb
        .from("geo_rooms")
        .update({ rounds_data: newRounds })
        .eq("id", room.id);
      console.log("[guess] update error:", upE?.message ?? "none");
      if (upE) return err("Не удалось сохранить ответ: " + upE.message, 500);

      // Верификация: перечитываем
      const { data: after, error: afterErr } = await sb
        .from("geo_rooms")
        .select("rounds_data")
        .eq("id", room.id)
        .maybeSingle();
      if (afterErr || !after) return err("Ответ не подтверждён БД", 500);

      const afterRounds = (after as { rounds_data: GeoRoomRound[] }).rounds_data;
      console.log("[guess] afterRounds[roundIdx]:", JSON.stringify(afterRounds[roundIdx]));
      const persistedGuess = afterRounds[roundIdx]?.guesses?.find((g) => g.playerId === deviceId);
      if (!persistedGuess) {
        console.log("[guess] VERIFY FAILED - guess not in DB");
        return err("Ответ не записан в БД (внутренняя ошибка)", 500);
      }

      return ok({
        room: { ...room, rounds_data: afterRounds },
        result: { distanceKm: entry.distanceKm, points: entry.points },
      });
    }

    // ================= next (следующий раунд / конец игры) =================
    // Любой игрок может вызвать после того, как ВСЕ сделали guess.
    case "next": {
      if (!code) return err("code required");
      const found = await fetchRoom(code);
      if ("error" in found) return err(found.error, found.status);
      const room = found.room;
      if (room.status !== "playing") return err("Игра не идёт");

      const me = room.players.find((p) => p.id === deviceId);
      if (!me) return err("Вы не игрок в этой комнате");

      const roundIdx = room.rounds_data.length - 1;
      const rnd = room.rounds_data[roundIdx];
      if (!rnd) return err("Неверный раунд");

      const answered = new Set(rnd.guesses.map((g) => g.playerId));
      const pending = room.players.filter((p) => !answered.has(p.id) && p.online);
      if (pending.length > 0) {
        return err(`Ждём ответов: ${pending.map((p) => p.name).join(", ")}`);
      }

      // --- расчёт очков и переход ---
      const roundsData = [...room.rounds_data];
      const scores = computeScores(room.players, roundsData);

      let status: GeoRoom["status"] = room.status;
      let winnerId: string | null = null;
      let finishedAt: string | null = room.finished_at;

      if (roundIdx + 1 >= room.rounds) {
        // последний раунд → финал
        status = "finished";
        winnerId = computeWinner(scores);
        finishedAt = new Date().toISOString();
      } else {
        roundsData.push(freshRound());
        const locationId = room.round_location_ids[roundIdx + 1];
        if (locationId) {
          roundsData[roundsData.length - 1] = { location_id: locationId, guesses: [] };
        }
      }

      const { error: upE } = await sb
        .from("geo_rooms")
        .update({ rounds_data: roundsData, scores, status, winner_id: winnerId, finished_at: finishedAt })
        .eq("id", room.id);
      if (upE) return err(upE.message, 500);

      return ok({
        room: {
          ...room,
          rounds_data: roundsData,
          scores,
          status,
          winner_id: winnerId,
          finished_at: finishedAt,
        },
      });
    }

    // ================= rematch (реванш) =================
    case "rematch": {
      if (!code) return err("code required");
      const found = await fetchRoom(code);
      if ("error" in found) return err(found.error, found.status);
      const room = found.room;
      if (room.status !== "finished") return err("Игра ещё не завершена");

      const me = room.players.find((p) => p.id === deviceId);
      if (!me) return err("Вы не игрок в этой комнате");

      // Локации нового матча выбираем сразу и храним: start просто
      // включает round 1 из них (одинаковые для всех).
      const roundLocationIds = pickRoundLocationIds(room.rounds);
      const { error: upE } = await sb
        .from("geo_rooms")
        .update({
          status: "waiting",
          round_location_ids: roundLocationIds,
          rounds_data: [],
          scores: room.players.map((p) => ({ playerId: p.id, total: 0 })),
          winner_id: null,
          started_at: null,
          finished_at: null,
        })
        .eq("id", room.id);
      if (upE) return err(upE.message, 500);
      return ok({
        room: {
          ...room,
          status: "waiting",
          rounds_data: [],
          round_location_ids: roundLocationIds,
          scores: room.players.map((p) => ({ playerId: p.id, total: 0 })),
          winner_id: null,
          started_at: null,
          finished_at: null,
        },
      });
    }

    // ================= leave =================
    case "leave": {
      if (!code) return err("code required");
      const found = await fetchRoom(code);
      if ("error" in found) return err(found.error, found.status);
      const room = found.room;
      const me = room.players.find((p) => p.id === deviceId);
      if (!me) return ok({ ok: true });

      const players = room.players.filter((p) => p.id !== deviceId);
      const scores = room.scores.filter((s) => s.playerId !== deviceId);
      const { error: upE } = await sb
        .from("geo_rooms")
        .update({ players, scores })
        .eq("id", room.id);
      if (upE) return err(upE.message, 500);
      return ok({ ok: true });
    }

    // ================= heartbeat =================
    // Игрок подтверждает, что он на связи (раз в ~25 c).
    // Остальные игроки видят online=true у него; если heartbeat
    // не приходит — считается, что он офлайн.
    case "heartbeat": {
      if (!code) return err("code required");
      const found = await fetchRoom(code);
      if ("error" in found) return err(found.error, found.status);
      const room = found.room;
      const me = room.players.find((p) => p.id === deviceId);
      if (!me) return ok({ ok: true, inRoom: false });

      // если меня нет — возвращаемся (реконнект)
      const players = room.players.map((p) =>
        p.id === deviceId ? { ...p, online: true } : p
      );
      const { error: upE } = await sb.from("geo_rooms").update({ players }).eq("id", room.id);
      if (upE) return err(upE.message, 500);
      return ok({ ok: true, inRoom: true });
    }

    // ================= mark-offline (явное «я офлайн»/выход вкладки) =================
    case "mark-offline": {
      if (!code) return err("code required");
      const found = await fetchRoom(code);
      if ("error" in found) return err(found.error, found.status);
      const room = found.room;
      const players = room.players.map((p) =>
        p.id === deviceId ? { ...p, online: false } : p
      );
      const { error: upE } = await sb.from("geo_rooms").update({ players }).eq("id", room.id);
      if (upE) return err(upE.message, 500);
      return ok({ ok: true });
    }

    default:
      return err("Unknown action: " + action);
  }
}
