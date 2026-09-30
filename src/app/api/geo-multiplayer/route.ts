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
import { getSupabaseServer, proxiedSupabaseCall } from "@/lib/supabase";
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
        last_seen: Date.now(),
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
    // ================= rename (сменить имя игрока) =================
    case "rename": {
      if (!code) return err("code required");
      const found = await fetchRoom(code);
      if ("error" in found) return err(found.error, found.status);
      const room = found.room;
      const me = room.players.find((p) => p.id === deviceId);
      if (!me) return err("Вы не игрок в этой комнате");
      const newName = sanitizeName(body.name);
      const newPlayers = room.players.map((p) => (p.id === deviceId ? { ...p, name: newName } : p));
      const { error: upE } = await sb
        .from("geo_rooms")
        .update({ players: newPlayers })
        .eq("id", room.id);
      if (upE) return err(upE.message, 500);
      return ok({ room: { ...room, players: newPlayers } });
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
            ? { ...p, online: true, last_seen: Date.now(), name: body.name ? sanitizeName(body.name) : p.name }
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
        last_seen: Date.now(),
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
      // Активируем ТОЛЬКО первый раунд (location_id ставится).
      // Остальные — location_id: null, пока next не дойдёт до них.
      const now = new Date().toISOString();
      const roundsData: GeoRoomRound[] = Array.from({ length: room.rounds }, (_, i) => ({
        location_id: i === 0 ? (roundLocationIds[0] ?? null) : null,
        guesses: [],
        last_activity: i === 0 ? now : undefined,
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

      // Читаем актуальное rounds_data из БД
      const { data: cur, error: curErr } = await sb
        .from("geo_rooms")
        .select("rounds_data")
        .eq("id", room.id)
        .maybeSingle();
      if (curErr || !cur) return err("Не удалось прочитать комнату", 500);

      const rounds = (cur as { rounds_data: GeoRoomRound[] }).rounds_data;

      // Текущий раунд = последний с location_id (активированный)
      let roundIdx = -1;
      for (let i = 0; i < rounds.length; i++) {
        if (rounds[i].location_id) roundIdx = i;
      }
      if (roundIdx < 0) return err("Нет активного раунда");

      const locationId = room.round_location_ids[roundIdx] ?? rounds[roundIdx]?.location_id;
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
        last_activity: new Date().toISOString(),
      };

      // Записываем через raw fetch к PostgREST (через прокси, если dev
      // машина за корпоративным squid — см. proxiedSupabaseCall)
      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const restRes = await proxiedSupabaseCall({
        url: sbUrl + "/rest/v1/geo_rooms?id=eq." + room.id,
        method: "PATCH",
        headers: {
          apikey: sbKey,
          Authorization: "Bearer " + sbKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ code: room.code, rounds_data: newRounds }),
      });
      const restText = await restRes.text();
      if (!restRes.ok) {
        return err("Не удалось сохранить ответ: " + restRes.status + " " + restText.slice(0, 300), 500);
      }
      let restBody: unknown;
      try {
        restBody = JSON.parse(restText);
      } catch {
        return err("PostgREST не вернул JSON: " + restText.slice(0, 200), 500);
      }
      const afterRounds: GeoRoomRound[] | null = Array.isArray(restBody) && restBody.length > 0
        ? (restBody[0].rounds_data as GeoRoomRound[])
        : null;
      if (!afterRounds) return err("Ответ не подтверждён БД", 500);

      const persistedGuess = afterRounds[roundIdx]?.guesses?.find((g) => g.playerId === deviceId);
      if (!persistedGuess) {
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

      // Читаем свежее rounds_data из БД (guess'и могли быть записаны между fetchRoom и next)
      const { data: freshCur, error: freshErr } = await sb
        .from("geo_rooms")
        .select("rounds_data")
        .eq("id", room.id)
        .maybeSingle();
      if (freshErr || !freshCur) return err("Не удалось прочитать комнату", 500);
      const freshRounds = (freshCur as { rounds_data: GeoRoomRound[] }).rounds_data;

      // Текущий раунд = последний с location_id (активированный).
      const allPlayers = room.players;
      let activeIdx = -1;
      for (let i = 0; i < freshRounds.length; i++) {
        if (freshRounds[i].location_id) activeIdx = i;
      }
      if (activeIdx < 0) return err("Нет активного раунда");

      // Проверка: все ли ОНЛАЙН игроки ответили в активном раунде?
      // Офлайн-игроки не блокируют переход (могли закрыть вкладку).
      const activeRound = freshRounds[activeIdx];
      const answeredIds = new Set(activeRound.guesses.map((g) => g.playerId));
      const onlinePlayers = allPlayers.filter((p) => p.online);
      const pendingHere = onlinePlayers.filter((p) => !answeredIds.has(p.id));

      // АВТО-ПЕРЕХОД: если раунд висит > 35 сек (30 сек таймер + 5 сек запас)
      // и есть хотя бы один ответ — не блокируем, переходим дальше.
      // Фолбэк на started_at, если last_activity не задан.
      const roundAnchor = activeRound.last_activity ?? room.started_at ?? "";
      const isStuck =
        pendingHere.length > 0 &&
        activeRound.guesses.length > 0 &&
        roundAnchor &&
        Date.now() - new Date(roundAnchor).getTime() > 35_000;

      if (pendingHere.length > 0 && !isStuck) {
        return err(`Ждём ответов: ${pendingHere.map((p) => p.name).join(", ")}`);
      }

      // Все ответили (или авто-переход) → ищем следующий неактивированный раунд.
      let nextIdx = -1;
      for (let i = 0; i < freshRounds.length; i++) {
        if (!freshRounds[i].location_id) {
          nextIdx = i;
          break;
        }
      }

      // --- расчёт очков ---
      const roundsData = [...freshRounds];
      const scores = computeScores(room.players, roundsData);

      let status: GeoRoom["status"] = room.status;
      let winnerId: string | null = null;
      let finishedAt: string | null = room.finished_at;

      if (nextIdx < 0) {
        // Все раунды сыграны → финал
        status = "finished";
        winnerId = computeWinner(scores);
        finishedAt = new Date().toISOString();
      } else {
        // Активируем следующий раунд
        roundsData[nextIdx] = {
          location_id: room.round_location_ids[nextIdx] ?? null,
          guesses: [],
          last_activity: new Date().toISOString(),
        };
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

      if (room.status === "playing") {
        // В игре: помечаем offline (не удаляем — иначе scores/ranks ломаются).
        // next уже пропускает офлайн-игроков.
        const players = room.players.map((p) =>
          p.id === deviceId ? { ...p, online: false } : p
        );
        const { error: upE } = await sb
          .from("geo_rooms")
          .update({ players })
          .eq("id", room.id);
        if (upE) return err(upE.message, 500);
        return ok({ ok: true });
      }

      // В лобби: удаляем игрока.
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

      // Я онлайн; остальные — офлайн, если их last_seen > 50 сек назад.
      // (heartbeat каждые 25 сек; 50 = 2 пропущенных цикла)
      const now = Date.now();
      const players = room.players.map((p) => {
        if (p.id === deviceId) return { ...p, online: true, last_seen: now };
        const lastSeen = p.last_seen ?? 0;
        return { ...p, online: now - lastSeen < 50_000 };
      });
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
        p.id === deviceId ? { ...p, online: false, last_seen: 0 } : p
      );
      const { error: upE } = await sb.from("geo_rooms").update({ players }).eq("id", room.id);
      if (upE) return err(upE.message, 500);
      return ok({ ok: true });
    }

    // ================= auto-skip (таймер истёк, игрок не ответил → 0 очков) =================
    case "auto-skip": {
      if (!code) return err("code required");
      const found = await fetchRoom(code);
      if ("error" in found) return err(found.error, found.status);
      const room = found.room;
      if (room.status !== "playing") return ok({ ok: true });
      const me = room.players.find((p) => p.id === deviceId);
      if (!me) return ok({ ok: true });

      // Читаем свежее rounds_data
      const { data: cur, error: curErr } = await sb
        .from("geo_rooms")
        .select("rounds_data")
        .eq("id", room.id)
        .maybeSingle();
      if (curErr || !cur) return ok({ ok: true });
      const rounds = (cur as { rounds_data: GeoRoomRound[] }).rounds_data;

      // Текущий раунд = последний с location_id
      let roundIdx = -1;
      for (let i = 0; i < rounds.length; i++) {
        if (rounds[i].location_id) roundIdx = i;
      }
      if (roundIdx < 0) return ok({ ok: true });

      const rnd = rounds[roundIdx];
      // Уже ответил? — не пишем повторно
      if (rnd.guesses.some((g) => g.playerId === deviceId)) return ok({ ok: true });

      // Пишем 0 очков (максимальное расстояние = 20000 км)
      const newRounds = [...rounds];
      newRounds[roundIdx] = {
        ...rnd,
        guesses: [...rnd.guesses, {
          playerId: deviceId,
          lat: 0, lng: 0,
          distanceKm: 20000,
          points: 0,
        }],
        last_activity: new Date().toISOString(),
      };
      const { error: upE } = await sb
        .from("geo_rooms")
        .update({ rounds_data: newRounds })
        .eq("id", room.id);
      if (upE) return err(upE.message, 500);
      return ok({ ok: true });
    }

    default:
      return err("Unknown action: " + action);
  }
}
