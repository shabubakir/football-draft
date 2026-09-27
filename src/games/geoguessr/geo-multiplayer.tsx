"use client";

// ============================================================
// GEOGUESSR LITE — MULTIPLAYER (2–8 игроков, одна комната)
// Архитектура зеркалит cs2-battle:
//   - авторитетный backend: /api/geo-multiplayer
//   - realtime: Supabase Realtime (postgres_changes)
//   - сервер выбирает локации и считает очки
// Одиночный CLASSIC остаётся нетронутым (geo-guessr-game.tsx).
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDeviceId } from "@/lib/profile";
import { usePlayerName } from "@/lib/use-player-name";
import {
  formatDistance,
  formatScore,
  MAX_ROUND_POINTS,
} from "./geo-engine";
import { GeoMap } from "./geo-map";
import { geoImageUrl } from "./locations";
import {
  GEO_MAX_PLAYERS,
  GEO_ROUND_OPTIONS,
  getLocationById,
  summarizePlayer,
  type GeoPlayer,
  type GeoRoom,
  type GeoRoomRound,
} from "@/lib/geo-multiplayer";

// ---------- Цвета игроков (стабильно по id) ----------
const PLAYER_COLORS = [
  "#059669", // emerald
  "#2563eb", // blue
  "#dc2626", // red
  "#d97706", // amber
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#db2777", // pink
  "#4d7c0f", // lime
];
const PLAYER_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function colorForPlayer(room: GeoRoom, id: string): string {
  const i = room.players.findIndex((p) => p.id === id);
  return PLAYER_COLORS[(i < 0 ? 0 : i) % PLAYER_COLORS.length];
}

// ---------- API ----------
type ApiResult = { room: GeoRoom; result?: { distanceKm: number; points: number } };

async function geoApi(
  myId: string,
  name: string,
  action: string,
  extra: Record<string, unknown> = {}
): Promise<ApiResult | { ok?: boolean; inRoom?: boolean }> {
  const res = await fetch("/api/geo-multiplayer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, deviceId: myId, name, ...extra }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error ?? "Ошибка запроса");
  return d;
}

// ---------- Хелперы UI ----------
function GeoModePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-black tracking-[0.18em] px-3 py-1">
      {children}
    </span>
  );
}

function ScoreChip({
  name,
  total,
  color,
  online,
  highlight,
}: {
  name: string;
  total: number;
  color: string;
  online: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 min-w-0 transition ${
        highlight ? "bg-stone-900 text-white border-stone-900" : "bg-stone-50 border-stone-200"
      }`}
    >
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ background: color, opacity: online ? 1 : 0.3 }}
      />
      <span className="text-xs font-bold truncate max-w-[72px]">{name}</span>
      <span className="ml-auto text-xs font-black tabular-nums">{formatScore(total)}</span>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  variant = "emerald",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "emerald" | "dark" | "outline" | "rose";
  className?: string;
}) {
  const base =
    "w-full rounded-2xl text-base sm:text-lg font-black tracking-wide px-6 py-4 transition disabled:opacity-50 disabled:cursor-not-allowed";
  const map = {
    emerald: "bg-emerald-600 hover:bg-emerald-500 text-white",
    dark: "bg-stone-900 hover:bg-stone-700 text-white",
    outline: "bg-white border-2 border-stone-900 text-stone-900 hover:bg-stone-100",
    rose: "bg-rose-600 hover:bg-rose-500 text-white",
  } as const;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${map[variant]} ${className}`}>
      {children}
    </button>
  );
}

// ============================================================
// Главный компонент MULTIPLAYER
// ============================================================

export function GeoMultiplayer({
  initialRoomCode = "",
  onExit,
}: {
  initialRoomCode?: string;
  onExit?: () => void;
}) {
  const [myId] = useState<string>(() => getDeviceId());
  const { name: myName, setName: setMyName } = usePlayerName("geo_mp_name");
  const [joinCode, setJoinCode] = useState<string>(
    initialRoomCode ? initialRoomCode.toUpperCase() : ""
  );

  const [phase, setPhase] = useState<
    "menu" | "create" | "join" | "lobby" | "play" | "end"
  >(initialRoomCode ? "join" : "menu");
  const [room, setRoom] = useState<GeoRoom | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoJoined, setAutoJoined] = useState(false);
  const [schemaError, setSchemaError] = useState(false);
  const [connected, setConnected] = useState(true);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [leftBy, setLeftBy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false); // защита от двойного «Создать»

  // --- Игровое состояние (локальное) ---
  const [guess, setGuess] = useState<[number, number] | null>(null);
  const [myAnswered, setMyAnswered] = useState(false);
  const [mpImgFailed, setMpImgFailed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // таймер ответа в секундах

  const apiMyName = useRef(myName);
  apiMyName.current = myName;
  const prevPlayersRef = useRef<GeoPlayer[] | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const isHost = useMemo(
    () => (room?.players[0]?.id === myId),
    [room, myId]
  );
  const inRoom = room !== null;
  const mySeatIdx = room ? room.players.findIndex((p) => p.id === myId) : -1;

  // ref для doGuess (чтобы таймер мог вызвать его)
  const doGuessRef = useRef<(() => void) | null>(null);

  // ---------- Heartbeat (показываем, что мы на связи) ----------
  useEffect(() => {
    if (!inRoom || !isSupabaseConfigured) return;
    const tick = async () => {
      try {
        await geoApi(myId, apiMyName.current, "heartbeat", {
          code: room!.code,
        });
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };
    tick();
    heartbeatRef.current = setInterval(tick, 25000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRoom, room?.code]);

  // ---------- beforeunload: помечаем offline ----------
  useEffect(() => {
    if (!inRoom) return;
    const onUnload = () => {
      try {
        const code = room?.code;
        if (code) {
          const x = new XMLHttpRequest();
          x.open("POST", "/api/geo-multiplayer", false);
          x.setRequestHeader("Content-Type", "application/json");
          x.send(
            JSON.stringify({
              action: "mark-offline",
              deviceId: myId,
              name: apiMyName.current,
              code,
            })
          );
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [inRoom, room?.code, myId]);

  // ---------- REALTIME ----------
  useEffect(() => {
    const sb = getSupabaseBrowser();
    supabaseRef.current = sb;
    if (!sb || !room) return;
    const roomId = room.id;
    prevPlayersRef.current = room.players ?? [];

    const ch = sb
      .channel(`geo-mp-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "geo_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const r = payload.new as unknown as GeoRoom;
          if (!r || !r.id) return;
          setConnected(true);
          setRoom((prev) => (prev ? ({ ...prev, ...r } as GeoRoom) : ({ ...(r as GeoRoom) })));

          // Обнаружение ухода игрока
          const prevP = prevPlayersRef.current ?? [];
          const newP = (r.players ?? []) as GeoPlayer[];
          if (r.status === "playing" || r.status === "finished") {
            const gone = prevP.find(
              (p) => p.id !== myId && !newP.some((n) => n.id === p.id)
            );
            if (gone) setLeftBy(gone.name);
          } else if (r.status === "waiting") {
            setLeftBy(null);
          }
          prevPlayersRef.current = newP;

          // Смена фазы: playing → play, finished → end
          if (r.status === "finished") setPhase("end");
          else if (r.status === "playing") {
            setPhase((p) => (p === "play" ? p : "play"));
          } else if (r.status === "waiting") {
            // возврат в лобби (rematch)
            setPhase("lobby");
            setGuess(null);
            setMyAnswered(false);
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  // ---------- Авто-вход по коду (ссылка) ----------
  // ВАЖНО: не подключаемся автоматически, если имя не введено —
  // гость должен увидеть поле «Ваше имя» и ввести его сам.
  // Если имя уже есть (localStorage / авторизованный username) — входит сразу.
  // Effect перезапускается при каждом изменении myName:
  //  - имя пусто  → показываем подсказку и ждём;
  //  - имя введено → один раз пробуем зайти (autoJoined=true после попытки).
  useEffect(() => {
    if (autoJoined || !initialRoomCode || room) return;
    if (!myName.trim()) {
      setError("Введите имя, чтобы подключиться к комнате");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const d = await geoApi(myId, apiMyName.current, "join", {
          code: initialRoomCode.toUpperCase(),
        });
        if (cancelled) return;
        const res = d as ApiResult;
        setRoom(res.room);
        setPhase("lobby");
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
      } finally {
        if (!cancelled) setAutoJoined(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoined, initialRoomCode, room, myId, myName]);

  // ---------- Вычисляем текущий раунд ----------
  // Первый раунд с хотя бы одним ответом = активный.
  // Если первый раунд пустой — игра только началась.
  const currentRoundIdx = useMemo(() => {
    if (!room) return 0;
    // Текущий раунд = последний, у которого есть location_id (начат),
    // независимо от того, есть ли уже ответы.
    let last = -1;
    for (let i = 0; i < room.rounds_data.length; i++) {
      if (room.rounds_data[i].location_id) last = i;
    }
    // Если ни один раунд не начался (всё location_id=null) — показываем 0
    if (last < 0) {
      // Может быть, первый раунд уже имеет ответы (edge case)
      for (let i = 0; i < room.rounds_data.length; i++) {
        if (room.rounds_data[i].guesses.length > 0) { last = i; break; }
      }
    }
    return last < 0 ? 0 : last;
  }, [room]);
  const currentRoundData: GeoRoomRound | null =
    room && room.rounds_data.length > 0 ? room.rounds_data[currentRoundIdx] : null;
  const currentLocationId =
    currentRoundData?.location_id ??
    room?.round_location_ids?.[currentRoundIdx] ??
    null;
  const currentLocation = currentLocationId ? getLocationById(currentLocationId) : null;

  // ---------- Таймер раунда (30 сек на ответ) ----------
  const ROUND_TIME = 30;
  const guessRef = useRef<[number, number] | null>(null);
  guessRef.current = guess;
  useEffect(() => {
    if (phase !== "play" || myAnswered) {
      setTimeLeft(null);
      return;
    }
    if (!currentLocation) return;
    setTimeLeft(ROUND_TIME);
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null) return null;
        if (t <= 1) {
          clearInterval(iv);
          // Таймер истёк: если точка уже стоит — отправляем, если нет — показываем подсказку
          if (guessRef.current) {
            doGuessRef.current?.();
          } else {
            setError("⏰ Время вышло — поставь точку на карте и нажми «Подтвердить»");
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoundIdx, phase, myAnswered, currentLocation?.id]);

  // ---------- Авто-переход: все онлайн ответили → через 3 сек следующий раунд ----------
  const doNextRef = useRef<(() => void) | null>(null);
  const allAnsweredRef = useRef(false);
  allAnsweredRef.current =
    phase === "play" &&
    myAnswered &&
    room !== null &&
    (() => {
      const rnd = room.rounds_data[currentRoundIdx];
      if (!rnd) return false;
      const online = room.players.filter((p) => p.online);
      return online.length > 0 && online.every((p) => rnd.guesses.some((g) => g.playerId === p.id));
    })();
  useEffect(() => {
    if (!allAnsweredRef.current) return;
    const t = setTimeout(() => {
      if (allAnsweredRef.current) doNextRef.current?.();
    }, 3_000);
    return () => clearTimeout(t);
  }, [allAnsweredRef.current, currentRoundIdx]);

  const myScore = useMemo(() => {
    if (!room) return 0;
    const s = room.scores.find((s) => s.playerId === myId);
    return s?.total ?? 0;
  }, [room, myId]);

  // ---------- Действия ----------
  const api = useCallback(
    async (action: string, extra: Record<string, unknown> = {}): Promise<ApiResult> => {
      const d = (await geoApi(myId, apiMyName.current, action, extra)) as ApiResult;
      return d;
    },
    [myId]
  );

  const doCreate = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError("Backend не настроен (Supabase). Заполните .env.local.");
      return;
    }
    if (!myName.trim()) {
      setError("Введите имя игрока");
      return;
    }
    // Защита от двойного нажатия: первая кнопка блокируется сразу.
    if (creating || busy) return;
    setError("");
    setSchemaError(false);
    setBusy(true);
    setCreating(true);
    try {
      const d = await api("create", { rounds: 5 });
      setRoom(d.room);
      setPhase("lobby");
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      if (/schema cache|Could not find the table/i.test(msg)) setSchemaError(true);
    } finally {
      setBusy(false);
      setCreating(false);
    }
  }, [api, myName, creating, busy]);

  const doJoin = useCallback(
    async (codeArg?: string) => {
      if (!isSupabaseConfigured) {
        setError("Backend не настроен (Supabase). Заполните .env.local.");
        return;
      }
      if (!myName.trim()) {
        setError("Введите имя игрока");
        return;
      }
      setError("");
      setSchemaError(false);
      const clean = (codeArg ?? joinCode).trim().toUpperCase();
      if (clean.length < 4) {
        setError("Введите код комнаты (6 символов)");
        return;
      }
      setBusy(true);
      try {
        const d = await api("join", { code: clean });
        setRoom(d.room);
        setPhase("lobby");
      } catch (e) {
        const msg = (e as Error).message;
        setError(msg);
        if (/schema cache|Could not find the table/i.test(msg)) setSchemaError(true);
      } finally {
        setBusy(false);
      }
    },
    [api, joinCode, myName]
  );

  const doStart = useCallback(async () => {
    if (!room) return;
    setError("");
    setBusy(true);
    try {
      const d = await api("start", { code: room.code });
      setRoom(d.room);
      setPhase("play");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [api, room]);

  const doGuess = useCallback(async () => {
    if (!room || !guess) return;
    setError("");
    setBusy(true);
    try {
      const d = await api("guess", {
        code: room.code,
        lat: guess[0],
        lng: guess[1],
      });
      setRoom(d.room);
      setMyAnswered(true);
      setTimeLeft(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [api, room, guess]);

  doGuessRef.current = doGuess;

  const doNext = useCallback(async () => {
    if (!room) return;
    setError("");
    setBusy(true);
    try {
      const d = await api("next", { code: room.code });
      setRoom(d.room);
      // Сбрасываем локальное состояние НЕМЕДЛЕННО — realtime может быть
      // медленным, и без этого UI "залипает" на старом раунде.
      setGuess(null);
      setMyAnswered(false);
      setTimeLeft(null);
      setMpImgFailed(false);
      if (d.room.status === "finished") {
        setPhase("end");
      }
    } catch (e) {
      // Если «ещё не все ответили» — молча показываем статус ожидания
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [api, room]);
  doNextRef.current = doNext;

  const doRematch = useCallback(async () => {
    if (!room) return;
    setError("");
    setBusy(true);
    try {
      const d = await api("rematch", { code: room.code });
      setRoom(d.room);
      setPhase("lobby");
      setGuess(null);
      setMyAnswered(false);
      setTimeLeft(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [api, room]);

  const doLeave = useCallback(async () => {
    if (room) {
      try {
        await api("leave", { code: room.code });
      } catch {
        /* ignore */
      }
    }
    setRoom(null);
    setPhase("menu");
    onExit?.();
  }, [api, room, onExit]);

  const doRename = useCallback(async () => {
    if (!room) return;
    const trimmed = myName.trim();
    if (!trimmed) {
      setError("Введите имя");
      return;
    }
    try {
      const d = await api("rename", { code: room.code, name: trimmed });
      setRoom(d.room);
      localStorage.setItem("geo_mp_name", trimmed);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, room, myName]);

  const copyToClipboard = useCallback(async (text: string, which: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }, []);

  // ============================================================
  // РЕНДЕР
  // ============================================================

  if (!isSupabaseConfigured) {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm p-8 text-center">
          <small className="text-[11px] tracking-[0.25em] text-stone-500">GEOGUESSR LITE</small>
          <h2 className="mt-3 text-2xl font-black text-stone-900">MULTIPLAYER</h2>
          <p className="mt-4 text-stone-600">
            ⚠️ Supabase не настроен — онлайн-режим недоступен.
          </p>
          <p className="mt-2 text-xs text-stone-500">
            Заполните <code className="font-mono bg-stone-100 px-1 rounded">.env.local</code>:
            <br />
            NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </p>
          <PrimaryButton variant="dark" className="mt-6" onClick={onExit}>
            НАЗАД
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // ---------- MENU ----------
  if (phase === "menu") {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-8 text-center">
            <small className="text-[11px] tracking-[0.25em] text-emerald-200">GEOGUESSR LITE</small>
            <h2 className="mt-3 text-3xl font-black tracking-tight">MULTIPLAYER</h2>
            <p className="mt-2 text-emerald-100 text-sm">
              Играйте с друзьями в одной комнате — до {GEO_MAX_PLAYERS} игроков.
            </p>
          </div>
          <div className="p-6 space-y-3">
            {myName.trim() && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Вы играете как</span>
                <span className="font-bold text-stone-900">{myName}</span>
              </div>
            )}
            <label className="block">
              <small className="text-[10px] tracking-[0.15em] text-stone-500">ВАШЕ ИМЯ</small>
              <input
                type="text"
                maxLength={24}
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder="Введите имя"
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            {schemaError && (
              <p className="text-xs text-amber-700">
                Таблица <code className="font-mono">geo_rooms</code> не создана. Выполните SQL-миграцию
                из <code className="font-mono">supabase/migrations/20260928_geo_rooms.sql</code> в
                Supabase Dashboard.
              </p>
            )}
            <PrimaryButton onClick={doCreate} disabled={busy || creating || !myName.trim()}>
              {busy || creating ? "Создаём…" : "ИГРАТЬ С ДРУЗЬЯМИ"}
            </PrimaryButton>
            <PrimaryButton variant="outline" onClick={onExit}>
              НАЗАД В CLASSIC
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }



  // ---------- JOIN ----------
  if (phase === "join" && !room) {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm p-6">
          <GeoModePill>MULTIPLAYER</GeoModePill>
          <h3 className="mt-4 text-xl font-black text-stone-900">ВХОД В КОМНАТУ</h3>
          <label className="mt-4 block">
            <small className="text-[10px] tracking-[0.15em] text-stone-500">ВАШЕ ИМЯ</small>
            <input
              type="text"
              maxLength={24}
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
              placeholder="Введите имя"
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <label className="mt-4 block">
            <small className="text-[10px] tracking-[0.15em] text-stone-500">КОД КОМНАТЫ</small>
            <input
              type="text"
              maxLength={8}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 font-black tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          {schemaError && (
            <p className="mt-2 text-xs text-amber-700">
              Таблица <code className="font-mono">geo_rooms</code> не создана. Выполните SQL-миграцию
              из <code className="font-mono">supabase/migrations/20260928_geo_rooms.sql</code> в
              Supabase Dashboard.
            </p>
          )}
          <div className="mt-5 space-y-3">
            <PrimaryButton onClick={() => doJoin()} disabled={busy || !myName.trim() || joinCode.length < 4}>
              {busy ? "Подключаемся…" : "ВОЙТИ В КОМНАТУ"}
            </PrimaryButton>
            <PrimaryButton variant="outline" onClick={() => setPhase("menu")}>
              НАЗАД
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  // ---------- LOBBY ----------
  if (phase === "lobby" && room && room.status === "waiting") {
    const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/geoguessr/multiplayer/${room.code}`;
    const playersOnline = room.players.filter((p) => p.online).length;
    const canStart = isHost && room.players.length >= 2;

    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 text-center">
            <small className="text-[11px] tracking-[0.25em] text-emerald-200">GEOGUESSR LITE</small>
            <div className="mt-2 text-xl font-black">PRIVATE ROOM</div>
            <div className="mt-1 text-emerald-100 text-xs">
              Код комнаты:{" "}
              <span className="font-black tracking-[0.3em] text-white text-lg">{room.code}</span>
            </div>
          </div>

          <div className="p-6">
            {/* Кнопки копирования */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(room.code, "code")}
                className="rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-black px-3 py-2 transition"
              >
                {copied === "code" ? "✓ Скопировано" : "СКОПИРОВАТЬ КОД"}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(shareLink, "link")}
                className="rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-black px-3 py-2 transition"
              >
                {copied === "link" ? "✓ Скопировано" : "СКОПИРОВАТЬ ССЫЛКУ"}
              </button>
            </div>

            {/* Список игроков */}
            <div className="mt-5">
              <small className="text-[10px] tracking-[0.15em] text-stone-500">
                ИГРОКИ · {playersOnline}/{GEO_MAX_PLAYERS}
              </small>
              <div className="mt-2 space-y-1.5">
                {room.players.map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
                      p.id === myId ? "border-emerald-300 bg-emerald-50" : "border-stone-200 bg-stone-50"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{
                        background: p.online ? PLAYER_COLORS[i % PLAYER_COLORS.length] : "#d4d4d8",
                      }}
                    />
                    {p.id === myId ? (
                      <input
                        type="text"
                        maxLength={24}
                        value={myName}
                        onChange={(e) => setMyName(e.target.value)}
                        onBlur={doRename}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        className="text-sm font-bold text-stone-900 flex-1 min-w-0 bg-transparent border-b border-emerald-300 focus:outline-none py-0.5"
                      />
                    ) : (
                      <span className="text-sm font-bold text-stone-900 flex-1 truncate">
                        {p.name}
                      </span>
                    )}
                    <span className="text-[10px] tracking-wider text-stone-500 font-bold flex-shrink-0">
                      {p.id === myId ? <span className="text-emerald-600">(вы)</span> : i === 0 ? "HOST" : PLAYER_LABELS[i]}
                    </span>
                  </div>
                ))}
                {room.players.length < GEO_MAX_PLAYERS && (
                  <div className="flex items-center gap-2 rounded-xl border border-dashed border-stone-200 px-3 py-2.5">
                    <span className="w-3 h-3 rounded-full bg-stone-200 animate-pulse" />
                    <span className="text-sm text-stone-400">Ожидание игрока…</span>
                  </div>
                )}
              </div>
            </div>

            {/* Настройки */}
            <div className="mt-5 rounded-xl bg-stone-50 border border-stone-200 p-4">
              <small className="text-[10px] tracking-[0.15em] text-stone-500">НАСТРОЙКИ</small>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-stone-700">Количество раундов</span>
                <div className="flex gap-1">
                  {GEO_ROUND_OPTIONS.map((n) => (
                    <span
                      key={n}
                      className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                        room.rounds === n
                          ? "bg-stone-900 text-white"
                          : "bg-stone-100 text-stone-400"
                      }`}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-stone-700">Режим</span>
                <span className="text-xs font-black text-emerald-600">CLASSIC</span>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

            <div className="mt-5 space-y-2">
              <PrimaryButton
                onClick={doStart}
                disabled={!canStart || busy}
                variant="emerald"
              >
                {busy ? "Стартуем…" : "НАЧАТЬ ИГРУ"}
              </PrimaryButton>
              {!isHost && (
                <p className="text-center text-xs text-stone-500">
                  Ждём, пока хост начнёт игру…
                </p>
              )}
              {isHost && room.players.length < 2 && (
                <p className="text-center text-xs text-stone-500">
                  Нужен хотя бы один второй игрок
                </p>
              )}
              <PrimaryButton variant="rose" onClick={doLeave}>
                ПОКИНУТЬ КОМНАТУ
              </PrimaryButton>
            </div>

            {!connected && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-center text-xs text-amber-800 animate-pulse">
                Соединение потеряно — переподключаемся…
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- PLAY ----------
  if (phase === "play" && room && room.status === "playing" && currentLocation) {
    const rnd = currentRoundData!;
    const answeredCount = new Set(rnd.guesses.map((g) => g.playerId)).size;
    // Все ОНЛАЙН игроки ответили → можно переходить (офлайн не блокируют)
    const onlineCount = room.players.filter((p) => p.online).length;
    const onlineAnswered = room.players.filter((p) => p.online && rnd.guesses.some((g) => g.playerId === p.id)).length;
    const allAnswered = onlineCount > 0 && onlineAnswered >= onlineCount;
    const isLastRound = currentRoundIdx >= room.rounds - 1;
    const myGuessEntry = rnd.guesses.find((g) => g.playerId === myId);

    // Сводка по раунду (для показа после всех ответили)
    const roundTable = room.players
      .map((p) => {
        const g = rnd.guesses.find((x) => x.playerId === p.id);
        return g
          ? { player: p, guess: g, color: colorForPlayer(room, p.id) }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.guess.points - a.guess.points);

    return (
      <div className="w-full">
        {/* ===== HEADER: название + раунд + счёт ===== */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <small className="text-[11px] tracking-[0.2em] text-stone-500">
              GEOGUESSR LITE · MULTIPLAYER
            </small>
            <h2 className="text-2xl font-black text-stone-900">
              РАУНД {currentRoundIdx + 1}{" "}
              <span className="text-stone-400 font-light">/ {room.rounds}</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 mr-2">
              {Array.from({ length: room.rounds }).map((_, i) => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition ${
                    i < currentRoundIdx
                      ? "bg-emerald-500"
                      : i === currentRoundIdx && !myAnswered
                      ? "bg-stone-900"
                      : "bg-stone-300"
                  }`}
                />
              ))}
            </div>
            {/* Таймер ответа */}
            {timeLeft !== null && !myAnswered && (
              <div
                className={`rounded-xl px-3 py-2 text-center min-w-[72px] ${
                  timeLeft <= 10 ? "bg-rose-600 text-white animate-pulse" : "bg-amber-500 text-white"
                }`}
              >
                <div className="text-[9px] tracking-[0.15em] opacity-80">ВРЕМЯ</div>
                <div className="text-lg font-black leading-none tabular-nums">{timeLeft}с</div>
              </div>
            )}
            <div className="rounded-xl bg-stone-900 text-white px-4 py-2 text-center min-w-[92px]">
              <div className="text-[10px] tracking-[0.15em] text-stone-400">МОЙ СЧЁТ</div>
              <div className="text-lg font-black leading-none">{formatScore(myScore)}</div>
            </div>
          </div>
        </div>

        {/* ===== СКОРБОРД (компактный, мобайл) ===== */}
        <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-3">
          <small className="text-[10px] tracking-[0.15em] text-stone-500">ТЕКУЩИЙ РЕЙТИНГ</small>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[...room.players]
              .sort((a, b) => {
                const sa = room.scores.find((s) => s.playerId === a.id)?.total ?? 0;
                const sb = room.scores.find((s) => s.playerId === b.id)?.total ?? 0;
                return sb - sa;
              })
              .map((p) => {
                const total = room.scores.find((s) => s.playerId === p.id)?.total ?? 0;
                return (
                  <ScoreChip
                    key={p.id}
                    name={p.name}
                    total={total}
                    color={colorForPlayer(room, p.id)}
                    online={p.online}
                    highlight={p.id === myId}
                  />
                );
              })}
          </div>
        </div>

        {/* ===== ФОТО ===== */}
        <div className="mt-3 rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 relative">
          <div className="relative w-full aspect-[16/9] sm:aspect-[2/1]">
            {mpImgFailed ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-800 px-6 text-center">
                <span className="text-4xl">🗺️</span>
                <span className="text-stone-300 text-sm">
                  Не удалось загрузить фото — попробуй ещё раз или переподключись
                </span>
                <button
                  type="button"
                  onClick={() => setMpImgFailed(false)}
                  className="mt-1 rounded-lg bg-stone-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-500"
                >
                  ПОВТОРИТЬ ЗАГРУЗКУ
                </button>
              </div>
            ) : (
              <img
                key={currentLocation.id}
                src={geoImageUrl(currentLocation.image)}
                referrerPolicy="no-referrer"
                alt={`${currentLocation.city}, ${currentLocation.country}`}
                onError={() => setMpImgFailed(true)}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* ===== КАРТА ===== */}
        <div className="mt-3 rounded-2xl overflow-hidden border border-stone-200 bg-white relative">
          <div className="h-[300px] sm:h-[340px]">
            <GeoMap
              center={[25, 10]}
              zoom={2}
              guess={myAnswered ? (myGuessEntry ? [myGuessEntry.lat, myGuessEntry.lng] : guess) : guess}
              onGuessChange={(lat, lng) => {
                if (!myAnswered) setGuess([lat, lng]);
              }}
              locked={myAnswered}
              reveal={
                myAnswered && allAnswered && myGuessEntry
                  ? {
                      correct: [currentLocation.latitude, currentLocation.longitude],
                      correctLabel: `${currentLocation.city}, ${currentLocation.country}`,
                      guessLabel: "Твой ответ",
                      distanceText: formatDistance(myGuessEntry.distanceKm),
                      points: myGuessEntry.points,
                    }
                  : null
              }
            />
          </div>
        </div>

        {/* ===== ПАНЕЛЬ ДЕЙСТВИЙ ===== */}
        <div className="mt-3">
          {error && <p className="mb-2 text-sm text-rose-600 text-center">{error}</p>}

          {!myAnswered && (
            <div className="flex flex-col items-stretch gap-2">
              <PrimaryButton
                onClick={doGuess}
                disabled={!guess || busy}
                variant="emerald"
              >
                {guess ? "ПОДТВЕРДИТЬ ОТВЕТ" : "СТАВЬ ТОЧКУ НА КАРТЕ"}
              </PrimaryButton>
              {guess && (
                <p className="text-xs text-stone-500 text-center">
                  Точка установлена. Можно двигать маркер или кликнуть ещё раз.
                </p>
              )}
            </div>
          )}

          {myAnswered && !allAnswered && (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 text-center">
              <div className="text-lg font-black text-stone-900">ОТВЕТ ПРИНЯТ ✓</div>
              <p className="mt-1 text-sm text-stone-500">
                Ждём остальных… {answeredCount} / {onlineCount} онлайн ответили
              </p>
              {/* компактный счётчик ответивших */}
              <div className="mt-3 flex items-center justify-center gap-2">
                {room.players.map((p) => {
                  const done = rnd.guesses.some((g) => g.playerId === p.id);
                  return (
                    <span
                      key={p.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                      style={{
                        background: done ? colorForPlayer(room, p.id) : "#e5e5e5",
                        opacity: done ? 1 : 0.5,
                      }}
                    >
                      {PLAYER_LABELS[room.players.indexOf(p) % PLAYER_LABELS.length]}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {myAnswered && allAnswered && (
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <small className="text-[10px] tracking-[0.15em] text-stone-500">
                    РАУНД {currentRoundIdx + 1} · РЕЗУЛЬТАТ
                  </small>
                  <div className="text-lg font-black text-stone-900">
                    {currentLocation.city}, {currentLocation.country}
                  </div>
                </div>
                <div className="text-right">
                  <small className="text-[10px] tracking-[0.15em] text-stone-500">ТВОИ ОЧКИ</small>
                  <div className="text-xl font-black text-emerald-600">
                    {myGuessEntry ? formatScore(myGuessEntry.points) : "—"}{" "}
                    <span className="text-stone-400 text-sm font-light">/ {MAX_ROUND_POINTS}</span>
                  </div>
                </div>
              </div>

              {/* Таблица раунда */}
              <div className="mt-3 space-y-1.5">
                {roundTable.map(({ player, guess: g, color }, i) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                      player.id === myId ? "bg-emerald-50 border border-emerald-200" : "bg-stone-50"
                    }`}
                    style={{ animationDelay: `${i * 120}ms` }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-sm font-bold text-stone-900 flex-1 truncate">
                      {player.name}
                      {player.id === myId && (
                        <span className="ml-1 text-emerald-600 text-xs">(вы)</span>
                      )}
                    </span>
                    <span className="text-xs text-stone-500 tabular-nums">
                      {formatDistance(g.distanceKm)}
                    </span>
                    <span className="text-sm font-black text-stone-900 tabular-nums w-12 text-right">
                      {g.points}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
                <PrimaryButton onClick={doNext} disabled={busy} variant="dark">
                  {busy ? "Переход…" : isLastRound ? "ИТОГИ ИГРЫ" : "СЛЕДУЮЩИЙ РАУНД"}
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>

        {/* Тост ухода */}
        {leftBy && (
          <div className="mt-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-center text-xs text-rose-700">
            {leftBy} покинул(а) игру
          </div>
        )}
      </div>
    );
  }

  // ---------- END ----------
  if (phase === "end" && room && room.status === "finished") {
    const standings = room.players
      .map((p) => ({
        player: p,
        summary: summarizePlayer(p.id, room.rounds, room.rounds_data),
        color: colorForPlayer(room, p.id),
      }))
      .sort((a, b) => b.summary.total - a.summary.total);
    const winner = standings.find((s) => s.player.id === room.winner_id) ?? null;
    const mySummary = standings.find((s) => s.player.id === myId)?.summary;

    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-8 text-center">
            <small className="text-[11px] tracking-[0.25em] text-emerald-200">GEOGUESSR LITE</small>
            <h2 className="mt-3 text-3xl font-black tracking-tight">ИГРА ОКОНЧЕНА</h2>
            {winner ? (
              <div className="mt-4">
                <div className="text-5xl">🏆</div>
                <div className="mt-2 text-xl font-black">ПОБЕДИТЕЛЬ</div>
                <div
                  className="mt-1 text-2xl font-black"
                  style={{ color: winner.color }}
                >
                  {winner.player.name}
                </div>
                <div className="text-emerald-100 text-sm mt-1">
                  {formatScore(winner.summary.total)} очков
                </div>
              </div>
            ) : (
              <div className="mt-4 text-emerald-100">Ничья!</div>
            )}
          </div>

          <div className="p-6">
            {/* Таблица */}
            <small className="text-[10px] tracking-[0.15em] text-stone-500">
              ИТОГОВЫЙ РЕЙТИНГ
            </small>
            <div className="mt-2 space-y-1.5">
              {standings.map((s, i) => (
                <div
                  key={s.player.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    s.player.id === myId
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-stone-200 bg-stone-50"
                  }`}
                >
                  <span className="w-6 text-center font-black text-stone-400">{i + 1}</span>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-sm font-bold text-stone-900 flex-1 truncate">
                    {s.player.name}
                    {s.player.id === myId && (
                      <span className="ml-1 text-emerald-600 text-xs">(вы)</span>
                    )}
                  </span>
                  <span className="text-sm font-black text-stone-900 tabular-nums">
                    {formatScore(s.summary.total)}
                  </span>
                </div>
              ))}
            </div>

            {/* Мини-статистика */}
            {mySummary && (
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-stone-50 border border-stone-200 p-3">
                  <small className="text-[9px] tracking-[0.12em] text-stone-500">ЛУЧШИЙ РАУНД</small>
                  <div className="mt-1 text-lg font-black text-stone-900">
                    {formatScore(mySummary.bestRound)}
                  </div>
                </div>
                <div className="rounded-xl bg-stone-50 border border-stone-200 p-3">
                  <small className="text-[9px] tracking-[0.12em] text-stone-500">
                    САМОЕ БЛИЗКОЕ
                  </small>
                  <div className="mt-1 text-lg font-black text-stone-900">
                    {mySummary.closestKm > 0 ? formatDistance(mySummary.closestKm) : "—"}
                  </div>
                </div>
                <div className="rounded-xl bg-stone-50 border border-stone-200 p-3">
                  <small className="text-[9px] tracking-[0.12em] text-stone-500">СРЕДНЕЕ</small>
                  <div className="mt-1 text-lg font-black text-stone-900">
                    {mySummary.avgKm > 0 ? formatDistance(mySummary.avgKm) : "—"}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-2">
              <PrimaryButton onClick={doRematch} disabled={busy} variant="emerald">
                {busy ? "…" : "РЕВАНШ"}
              </PrimaryButton>
              <PrimaryButton variant="outline" onClick={doLeave}>
                НА ГЛАВНУЮ
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- FALLBACK: room существует, но фаза не совпала ----------
  if (room) {
    // Обычно это короткое окно при смене статуса — показываем спиннер.
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm p-10 text-center">
          <div className="text-stone-400 animate-pulse">Синхронизация…</div>
        </div>
      </div>
    );
  }

  return null;
}
