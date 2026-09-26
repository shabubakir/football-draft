"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GRID_THEMES, type GridTheme, type GridClue } from "@/lib/grid";
import { PLAYERS } from "@/lib/players";

type Role = "host" | "guest";

type GridPlayer = {
  id: string;
  name: string;
  seat: "host" | "guest";
};

type Room = {
  id: string;
  code: string;
  status: "waiting" | "playing" | "finished";
  seed: number;
  clue_type: string;
  clues: GridClue[];
  players: GridPlayer[];
  host_board: (string | null)[]; // 9
  guest_board: (string | null)[]; // 9
  winner: "host" | "guest" | "draw" | null;
};

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function cloneTheme(t: GridTheme): GridClue[] {
  return t.rows.flat();
}

function themeFromSeed(seed: number): GridTheme {
  return GRID_THEMES[seed % GRID_THEMES.length];
}

function uid() {
  // Стабильный ID игрока (переживает перезагрузку страницы)
  if (typeof window !== "undefined") {
    const existing = localStorage.getItem("grid_player_id");
    if (existing) return existing;
    const id = "g" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem("grid_player_id", id);
    return id;
  }
  return "g" + Math.random().toString(36).slice(2, 10);
}

export function GridOnline() {
  const params = useParams<{ join?: string; [key: string]: string | string[] | undefined }>();
  const joinParam = (params.join as string | undefined) ?? (params["j"] as string | undefined) ?? "";
  const cameByLink = Boolean(joinParam);

  const [role, setRole] = useState<Role>("host");
  const [phase, setPhase] = useState<"create" | "join" | "lobby" | "play" | "end">("create");
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState(joinParam);
  const [room, setRoom] = useState<Room | null>(null);
  const [myId, setMyId] = useState<string>(() => uid());
  const [myName, setMyName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("grid_player_name") ?? "";
  });
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [joinedByLink, setJoinedByLink] = useState(false);

  useEffect(() => {
    if (myName) localStorage.setItem("grid_player_name", myName);
  }, [myName]);

  const supabaseRef = useRef<SupabaseClient | null>(null);

  const initSupabase = useCallback(() => {
    const c = getSupabaseBrowser();
    supabaseRef.current = c;
    return c;
  }, []);

  // myName через ref — чтобы joinRoom (созданный один раз) брал актуальное имя
  const myNameRef = useRef(myName);
  myNameRef.current = myName;

  // --- Создание комнаты (host) ---
  const createRoom = useCallback(async () => {
    setError("");
    const sb = initSupabase();
    if (!sb) {
      setError("Supabase не настроен. Заполните .env.local.");
      return;
    }
    const myCode = makeCode();
    const seed = Math.floor(Math.random() * 100000);
    const theme = themeFromSeed(seed);
    const clues = cloneTheme(theme);
    const name = myName.trim() || "Хост";

    const { data, error: e } = await sb.from("grid_rooms").insert({
      code: myCode,
      seed,
      clue_type: "mixed",
      clues,
      players: [{ id: myId, name, seat: "host" as const }],
    }).select().single();

    if (e || !data) {
      setError(
        "Не удалось создать комнату: " + (e?.message ?? "?") +
        (e?.message?.includes("players")
          ? "\n⚠️ Похоже, в базе нет колонки players — выполните supabase/migrations/20260926_add_players_to_grid_rooms.sql"
          : "")
      );
      return;
    }
    setCode(myCode);
    setRoom(data as Room);
    setPhase("lobby");
    const link = `${window.location.origin}/j/${myCode}`;
    setInviteLink(link);
    setMsg(`Комната создана! Ссылка для друга:\n${link}`);
  }, [initSupabase, myId, myName]);

  // --- Подключение (guest) ---
  // codeArg/nameArg — переопределения (используются при авто-join по ссылке)
  const joinRoom = useCallback(async (codeArg?: string, nameArg?: string) => {
    setError("");
    const sb = initSupabase();
    if (!sb) {
      setError("Supabase не настроен. Заполните .env.local.");
      return;
    }
    const clean = (codeArg ?? joinCode).trim().toUpperCase();
    if (clean.length < 4) {
      setError("Введите код из 5 символов.");
      return;
    }
    const { data, error: e } = await sb.from("grid_rooms").select().eq("code", clean).maybeSingle();
    if (e) {
      setError(
        "Ошибка подключения: " + e.message +
        (e.message.includes("players")
          ? "\n⚠️ Похоже, в базе нет колонки players — выполните supabase/migrations/20260926_add_players_to_grid_rooms.sql"
          : "")
      );
      return;
    }
    if (!data) {
      setError("Комната не найдена. Проверьте код.");
      return;
    }
    const r = data as Room;
    const name = (nameArg ?? myNameRef.current).trim() ||
      (typeof window !== "undefined" && localStorage.getItem("grid_player_name") || "").trim() ||
      "Игрок " + myId.slice(0, 3);

    const existing = (r.players ?? []).find((p) => p.id === myId);
    if (existing) {
      // Уже подключены — просто показываем текущее состояние
      setCode(clean);
      setRoom(r);
      setRole(existing.seat);
      setJoinedByLink(true);
      setPhase(r.status === "finished" ? "end" : r.status === "playing" ? "play" : "lobby");
      setMsg(`Вы уже в игре как «${existing.name}».`);
      return;
    }

    if (r.status !== "waiting") {
      setError("Игра уже идёт или закончилась. Создайте новую комнату.");
      return;
    }
    if ((r.players ?? []).length >= 2) {
      setError("Комната полная (2 игрока).");
      return;
    }

    // Гость занимает место guest — если хост ещё не записан в players,
    // записываем и его (чтобы индикатор «ждёт» не врал)
    const hasHostSeat = (r.players ?? []).some((p) => p.seat === "host");
    const newPlayers: GridPlayer[] = [
      ...r.players,
      ...(!hasHostSeat ? [{ id: "host-" + r.id, name: "Хост", seat: "host" as const }] : []),
      { id: myId, name, seat: "guest" as const },
    ];
    const { error: upE } = await sb
      .from("grid_rooms")
      .update({ players: newPlayers })
      .eq("id", r.id);
    if (upE) {
      setError("Не удалось подключиться: " + upE.message);
      return;
    }

    setCode(clean);
    setRoom({ ...r, players: newPlayers });
    setRole("guest");
    setJoinedByLink(true);
    setPhase("lobby");
    setMsg(`Вы в игре как «${name}»! Ждите старта.`);
  }, [initSupabase, joinCode, myId]);

  // --- Авто-join: пришёл по ссылке /j/CODE → показываем экран с именем и кнопкой
  // (как в викторине: гость вводит имя ПОЛНОСТЬЮ и сам нажимает «ПОДКЛЮЧИТЬСЯ»);

  // --- Start (только host) ---
  const startGame = useCallback(async () => {
    if (!room || role !== "host") return;
    const sb = initSupabase();
    if (!sb) return;
    await sb.from("grid_rooms").update({ status: "playing" }).eq("id", room.id);
    setPhase("play");
  }, [room, role, initSupabase]);

  // --- Соло-тест: матчим самого себя (обе доски управляются в одном окне) ---
  const [soloMode, setSoloMode] = useState(false);
  const startSoloTest = useCallback(async () => {
    if (!room || role !== "host") return;
    const sb = initSupabase();
    if (!sb) return;
    setSoloMode(true);
    await sb.from("grid_rooms").update({ status: "playing" }).eq("id", room.id);
    setPhase("play");
    setMsg("🧪 Соло-тест запущен — сыграйте обе доски (X и O) сами.");
  }, [room, role, initSupabase]);

  // Сбрасываем соло-режим при выходе в лобби/смене комнаты
  useEffect(() => {
    if (!room || room.status === "waiting") setSoloMode(false);
  }, [room?.id, room?.status]);

  // --- Realtime: подписка на обновления комнаты ---
  useEffect(() => {
    const sb = supabaseRef.current;
    if (!sb || !room) return;
    const roomId = room.id;
    const ch = sb.channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grid_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const r = payload.new as Room;
          setRoom((prev) => (prev ? { ...prev, ...r } : r));
          // Синхронизируем роль по players (если я в списке — моя роль из seats)
          const me = (r.players ?? []).find((p) => p.id === myId);
          if (me && r.players.length > 0 && (role !== "host" || me.seat === "guest")) {
            setRole(me.seat);
          }
          if (r.status === "finished") {
            setPhase("end");
          } else if (r.status === "playing") {
            setPhase("play");
          }
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [room?.id, myId, role]);

  // Синхронизация фазы из комнаты (на случай, если событие потеряно)
  useEffect(() => {
    if (!room) return;
    if (room.status === "finished") setPhase("end");
    else if (room.status === "playing") setPhase("play");
    else if (phase !== "create" && phase !== "join") setPhase("lobby");
  }, [room?.status, room?.id]);

  // --- Ход (гость/хост заполняет свою клетку; в соло — обе доски) ---
  const placePlayer = useCallback(
    (cellIdx: number, playerName: string, board?: "host" | "guest") => {
      if (!room || phase !== "play" || room.status !== "playing") return;
      const boardKey =
        (board ?? (role === "host" ? "host" : "guest")) === "host"
          ? "host_board"
          : "guest_board";
      const cells = [...(room[boardKey] as (string | null)[]) ?? Array(9).fill(null)];
      cells[cellIdx] = playerName;
      const sb = initSupabase();
      if (!sb) return;
      sb.from("grid_rooms").update({ [boardKey]: cells }).eq("id", room.id);
      setRoom({ ...room, [boardKey]: cells });
    },
    [room, role, phase, initSupabase]
  );

  // --- Проверка победителя (локально на обоих clients) ---
  const boardA = (room?.host_board ?? Array(9).fill(null)) as (string | null)[];
  const boardB = (room?.guest_board ?? Array(9).fill(null)) as (string | null)[];
  const theme = room ? themeFromSeed(room.seed) : null;

  const checkWin = () => {
    const a = (i: number) => (boardA[i] ? 1 : 0);
    const b = (i: number) => (boardB[i] ? 1 : 0);
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    let aWins = 0, bWins = 0, draws = 0;
    for (const [x, y, z] of lines) {
      const av = a(x) + a(y) + a(z);
      const bv = b(x) + b(y) + b(z);
      if (av === 3) aWins++;
      else if (bv === 3) bWins++;
      else if (av + bv === 3 && av > 0 && bv > 0) draws++;
    }
    return { aWins, bWins, draws };
  };

  const { aWins, bWins, draws } = room ? checkWin() : { aWins: 0, bWins: 0, draws: 0 };

  const finishGame = useCallback(
    (winner: "host" | "guest" | "draw") => {
      const sb = initSupabase();
      if (!sb || !room) return;
      sb.from("grid_rooms").update({ status: "finished", winner }).eq("id", room.id);
    },
    [room, initSupabase]
  );

  // Если все клетки заполнены — завершаем
  useEffect(() => {
    if (phase !== "play" || !room) return;
    const total = [...boardA, ...boardB].filter(Boolean).length;
    if (total >= 9 && (aWins !== bWins || total === 9)) {
      // даём шанс на realtime-синхр. — если уже finished, не трогаем
      const winner = aWins > bWins ? "host" : bWins > aWins ? "guest" : "draw";
      const t = setTimeout(() => finishGame(winner), 1200);
      return () => clearTimeout(t);
    }
  }, [boardA, boardB, phase, room, aWins, bWins, finishGame]);

  const iWon =
    phase === "end" &&
    room?.winner !== null &&
    room?.winner !== undefined &&
    room?.winner !== "draw" &&
    ((role === "host" && room.winner === "host") ||
     (role === "guest" && room.winner === "guest"));
  const isDraw = room?.winner === "draw";

  // ======================= RENDER =======================

  return (
    <div className="space-y-6">
      {/* Шапка игры */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <small className="text-[11px] tracking-[0.2em] text-stone-500">
            СЕТКА 9 · ОНЛАЙН
          </small>
          <h1 className="text-3xl font-black">
            МАТЧ <em className="font-light italic text-stone-500">В РЕАЛЬНОМ ВРЕМЕНИ</em>
          </h1>
        </div>
        {room && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-stone-500">Код комнаты:</span>
            <button
              onClick={() => navigator.clipboard?.writeText(room.code)}
              className="rounded-lg bg-stone-900 text-white font-mono font-bold px-3 py-1.5 hover:bg-stone-700"
              title="Скопировать код"
            >
              {room.code}
            </button>
            <span className={`text-xs px-2 py-1 rounded-full ${
              room.status === "waiting" ? "bg-amber-100 text-amber-700" :
              room.status === "playing" ? "bg-emerald-100 text-emerald-700" :
              "bg-stone-200 text-stone-600"
            }`}>
              {(() => {
                const count = (room.players ?? []).length;
                if (room.status === "waiting") return count >= 2 ? "Соперник в комнате" : "Ждём соперника";
                if (room.status === "playing") return "Идёт игра";
                return "Завершено";
              })()}
            </span>
          </div>
        )}
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}
      {msg && !error && <div className="rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-sm px-4 py-3 whitespace-pre-line">{msg}</div>}
      {joinedByLink && room && phase === "lobby" && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-300 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-lg">✓</span>
          <div>
            <div className="font-bold text-emerald-800">ТЫ В ИГРЕ!</div>
            <div className="text-xs text-emerald-600">
              Ты подключён как «{room.players?.find((p) => p.id === myId)?.name ?? myName}» · Комната {room.code}
            </div>
          </div>
        </div>
      )}

      {/* Экран 1: создание / подключение */}
      {phase === "create" && (
        <div className={`grid ${cameByLink ? "" : "md:grid-cols-2"} gap-4`}>
          {cameByLink ? (
            /* Пришёл по ссылке — вводит имя полностью и сам нажимает */
            <div className="rounded-2xl border border-stone-200 bg-white/70 p-5">
              <h3 className="font-bold text-lg">Присоединиться к игре</h3>
              {joinedByLink ? (
                <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                  ✅ Вы подключены! Комната загружается…
                </div>
              ) : (
                <>
                  <p className="mt-1 text-sm text-stone-600">
                    Введите <b>полное</b> имя — оно будет видно сопернику.
                  </p>
                  <input
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="Ваше имя (например, Шах)"
                    className="mt-4 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-stone-500"
                  />
                  <div className="mt-3 flex items-center gap-2 text-sm text-stone-500">
                    <span>Комната:</span>
                    <span className="font-mono font-bold text-stone-900 bg-stone-100 rounded px-2 py-0.5">
                      {joinParam.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => joinRoom()}
                    className="mt-4 w-full rounded-xl bg-stone-900 text-white font-semibold py-3 hover:bg-stone-700 transition"
                  >
                    ПОДКЛЮЧИТЬСЯ
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-stone-200 bg-white/70 p-5">
                <h3 className="font-bold text-lg">Создать комнату</h3>
                <p className="mt-1 text-sm text-stone-600">
                  Вы будете хостом. Друзья подключатся по ссылке.
                </p>
                <input
                  value={myName}
                  onChange={(e) => setMyName(e.target.value)}
                  placeholder="Ваше имя"
                  className="mt-4 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-500"
                />
                <button
                  onClick={createRoom}
                  className="mt-4 w-full rounded-xl bg-stone-900 text-white font-semibold py-3 hover:bg-stone-700 transition"
                >
                  СОЗДАТЬ КОМНАТУ
                </button>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white/70 p-5">
                <h3 className="font-bold text-lg">Подключиться</h3>
                <p className="mt-1 text-sm text-stone-600">
                  Введите код, который вам прислал друг.
                </p>
                <input
                  value={myName}
                  onChange={(e) => setMyName(e.target.value)}
                  placeholder="Ваше имя"
                  className="mt-4 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-500"
                />
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC12"
                  maxLength={5}
                  className="mt-3 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-mono tracking-widest outline-none focus:border-stone-500 uppercase"
                />
                <button
                  onClick={() => joinRoom()}
                  className="mt-4 w-full rounded-xl bg-stone-900 text-white font-semibold py-3 hover:bg-stone-700 transition"
                >
                  ПОДКЛЮЧИТЬСЯ
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Экран 2: лобби */}
      {phase === "lobby" && room && (
        <div className="rounded-2xl border border-stone-200 bg-white/70 p-5 sm:p-6 max-w-lg">
          <h3 className="text-xl font-black">
            КОМНАТА <span className="font-mono bg-stone-900 text-white px-2 py-0.5 rounded-lg">{room.code}</span>
          </h3>

          {/* Ссылка для приглашения */}
          {inviteLink && (
            <div className="mt-4 rounded-xl bg-sky-50 border border-sky-200 p-4">
              <div className="text-xs font-semibold text-sky-700 tracking-wide">
                🔗 ССЫЛКА ДЛЯ ПРИГЛАШЕНИЯ
              </div>
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  onClick={(e) => e.currentTarget.select()}
                  className="flex-1 rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-mono outline-none text-sky-900"
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(inviteLink);
                    setMsg("Ссылка скопирована! Отправь другу.");
                  }}
                  className="rounded-lg bg-sky-600 text-white text-sm font-semibold px-4 py-2 hover:bg-sky-500 transition"
                >
                  📋 Скопировать
                </button>
              </div>
              <p className="mt-2 text-xs text-sky-600">
                Отправь эту ссылку другу — он сможет подключиться в один клик
              </p>
            </div>
          )}

          {/* Игроки */}
          <ul className="mt-4 grid sm:grid-cols-2 gap-2">
            {["host", "guest"].map((seat) => {
              const p = (room.players ?? []).find((x) => x.seat === seat);
              return (
                <li
                  key={seat}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
                    p ? "bg-stone-50" : "bg-stone-100/70"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      p ? (seat === "host" ? "bg-emerald-500" : "bg-sky-400") : "bg-stone-300 animate-pulse"
                    }`}
                  />
                  <span className={p ? "font-medium" : "text-stone-400"}>
                    {p ? p.name : seat === "host" ? "Хост" : "Соперник — ждём…"}
                  </span>
                  {p && p.id === myId && <span className="text-[10px] text-stone-400">(ты)</span>}
                  {!p && <span className="text-[10px] text-stone-400 ml-auto animate-pulse">ждём</span>}
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-sm text-stone-600">
            {role === "host"
              ? "Отправьте ссылку другу. Как только он появится — нажмите «Начать игру»."
              : "Вы подключены как гость. Ждите, пока хост начнёт игру."}
          </p>

          {role === "host" && (
            <>
              <button
                onClick={startGame}
                disabled={(room.players ?? []).length < 2}
                className="mt-5 w-full rounded-xl bg-emerald-600 text-white font-bold py-3 hover:bg-emerald-500 disabled:opacity-40 transition"
              >
                НАЧАТЬ ИГРУ
              </button>
              <button
                onClick={startSoloTest}
                className="mt-2 w-full rounded-xl bg-amber-500 text-white font-bold py-3 hover:bg-amber-400 transition"
              >
                🧪 ТЕСТ (1 игрок) — прогнать самому
              </button>
            </>
          )}
          {role === "guest" && (
            <div className="mt-5 rounded-xl bg-stone-100 p-4 text-sm text-stone-600 animate-pulse">
              Ждём старта от хоста…
            </div>
          )}
        </div>
      )}

      {/* Экран 3: игра */}
      {(phase === "play" || phase === "end") && room && theme && (
        <GridBoard
          room={room}
          theme={theme}
          role={role}
          solo={soloMode}
          onPlace={placePlayer}
          onFinish={finishGame}
          iWon={iWon}
          isDraw={isDraw}
        />
      )}

      <p className="text-[11px] text-stone-400 max-w-md">
        {isSupabaseConfigured
          ? "Онлайн-режим активен через Supabase Realtime. Держите эту страницу открытой в двух окнах, чтобы протестировать."
          : "⚠️ Supabase не настроен — онлайн-режим не работает. Заполните .env.local, чтобы играть с друзьями."}
      </p>
    </div>
  );
}

// ======================= ДОСКА =======================

function GridBoard({
  room,
  theme,
  role,
  solo,
  onPlace,
  onFinish,
  iWon,
  isDraw,
}: {
  room: Room;
  theme: GridTheme;
  role: Role;
  solo: boolean;
  onPlace: (i: number, name: string, board?: "host" | "guest") => void;
  onFinish: (w: "host" | "guest" | "draw") => void;
  iWon: boolean;
  isDraw: boolean;
}) {
  const [picker, setPicker] = useState<{ cell: number; board: "host" | "guest" } | null>(null);
  const [query, setQuery] = useState("");

  const suggestions =
    query.trim().length >= 2
      ? PLAYERS.filter(
          (p) =>
            p.name_ru.toLowerCase().includes(query.toLowerCase()) ||
            p.name_en.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5)
      : [];

  const clues = room.clues as GridClue[];
  const finished = room.status === "finished";

  // --- Рендер одной доски (my = кликабельно, their = read-only) ---
  const renderBoard = (
    board: (string | null)[],
    title: string,
    titleExtra: string,
    interactive: boolean,
    boardKey: "host" | "guest"
  ) => (
    <section
      className={`rounded-2xl border p-4 ${
        interactive
          ? "border-stone-200 bg-white/70"
          : "border-stone-200 bg-white/40 opacity-80"
      }`}
    >
      <h3 className={`text-sm font-bold tracking-wide ${interactive ? "text-stone-700" : "text-stone-500"}`}>
        {title}{" "}
        <span className="text-xs font-normal text-stone-500">
          {titleExtra}
        </span>
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {board.map((val, i) => {
          const clue = clues[i];
          const isCellFinished = finished || !!val;
          if (interactive) {
            return (
              <button
                key={i}
                disabled={finished}
                onClick={() => {
                  if (!val) {
                    setPicker({ cell: i, board: boardKey });
                    setQuery("");
                  }
                }}
                className={`min-h-[92px] rounded-xl border p-2 text-left transition relative ${
                  val
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-dashed border-stone-300 bg-stone-50 hover:border-stone-500 hover:bg-white"
                }`}
              >
                <small className="block text-[9px] tracking-wider text-stone-400">
                  {clue?.label?.toUpperCase()}
                </small>
                <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">
                  {clue?.value}
                </div>
                {val ? (
                  <div className="mt-1 text-sm font-bold text-emerald-700 truncate">
                    ✓ {val}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-stone-400">+ добавить</div>
                )}
              </button>
            );
          }
          return (
            <div
              key={i}
              className={`min-h-[72px] rounded-xl border p-2 ${
                val ? "border-sky-300 bg-sky-50" : "border-stone-200 bg-stone-50/50"
              }`}
            >
              <small className="block text-[9px] tracking-wider text-stone-400">
                {clue?.label?.toUpperCase()}
              </small>
              <div className="text-[11px] text-stone-400 mt-0.5 line-clamp-2">
                {clue?.value}
              </div>
              {val ? (
                <div className="mt-1 text-sm font-bold text-sky-700 truncate">
                  {val}
                </div>
              ) : (
                <div className="mt-1 text-xs text-stone-300 animate-pulse">
                  {finished ? "—" : "ждёт…"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );

  const hostSeatName = (room.players ?? []).find((p) => p.seat === "host")?.name;
  const guestSeatName = (room.players ?? []).find((p) => p.seat === "guest")?.name;

  return (
    <div className="space-y-4">
      {solo && (
        <div className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-800">
          🧪 Соло-тест: обе доски управляете вы — играйте X и O по очереди.
        </div>
      )}

      {/* Доска X (host) */}
      {renderBoard(
        room.host_board as (string | null)[],
        solo ? "ВАША ДОСКА — X" : role === "host" ? "ВАША ДОСКА" : "ДОСКА СОПЕРНИКА",
        solo || role === "host"
          ? `(вы${solo ? "" : " — X"})${hostSeatName ? " · " + hostSeatName : ""}`
          : `(соперник — X)${hostSeatName ? " · " + hostSeatName : ""}`,
        solo || role === "host",
        "host"
      )}

      {/* Picker */}
      {picker && !finished && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-xl">
            <h4 className="font-bold text-lg">Кто подходит?</h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Клетка: <b>{clues[picker.cell]?.label}</b> — <b>{clues[picker.cell]?.value}</b>
              {solo && (
                <span className="ml-2 text-amber-600">· доска {picker.board === "host" ? "X" : "O"}</span>
              )}
            </p>
            <div className="relative mt-3">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Начните вводить имя…"
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm outline-none focus:border-stone-500"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl overflow-hidden shadow-lg">
                  {suggestions.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          onPlace(picker.cell, p.name_ru, picker.board);
                          setPicker(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-stone-50 flex justify-between"
                      >
                        <span className="font-medium">{p.name_ru}</span>
                        <span className="text-xs text-stone-400">{p.country}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  if (query.trim()) {
                    onPlace(picker.cell, query.trim(), picker.board);
                    setPicker(null);
                  }
                }}
                className="flex-1 rounded-xl bg-stone-900 text-white py-2.5 text-sm font-semibold hover:bg-stone-700"
              >
                ОК — {query.trim() || "…"}
              </button>
              <button
                onClick={() => setPicker(null)}
                className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Доска O (guest): в соло — моя, в обычном режиме — соперника */}
      {renderBoard(
        room.guest_board as (string | null)[],
        solo ? "ВАША ДОСКА — O" : role === "host" ? "ДОСКА СОПЕРНИКА" : "ВАША ДОСКА",
        solo || role === "guest"
          ? `(вы${solo ? "" : " — O"})${guestSeatName ? " · " + guestSeatName : ""}`
          : `(соперник — O)${guestSeatName ? " · " + guestSeatName : ""}`,
        solo || role === "guest",
        "guest"
      )}

      {/* Result */}
      {finished && (
        <div
          className={`rounded-2xl p-5 text-center text-lg font-bold ${
            isDraw
              ? "bg-stone-200 text-stone-700"
              : iWon
              ? "bg-emerald-500 text-white"
              : "bg-amber-200 text-amber-900"
          }`}
        >
          {isDraw ? "🤝 Ничья!" : iWon ? "🏆 ПОБЕДА!" : "😔 Поражение"}
        </div>
      )}

      {finished && (
        <div className="flex justify-center">
          <Link
            href="/grid/online"
            className="rounded-xl bg-stone-900 text-white px-6 py-3 text-sm font-semibold hover:bg-stone-700"
          >
            ↩ В Лобби
          </Link>
        </div>
      )}
    </div>
  );
}
