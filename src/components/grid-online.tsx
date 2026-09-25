"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomTheme, GRID_THEMES, type GridTheme, type GridClue } from "@/lib/grid";
import { PLAYERS } from "@/lib/players";

type Role = "host" | "guest";
type CellState = "x" | "o" | "me" | "them" | null;

type Room = {
  id: string;
  code: string;
  status: "waiting" | "playing" | "finished";
  seed: number;
  clue_type: string;
  clues: GridClue[];
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

export function GridOnline() {
  const [role, setRole] = useState<Role>("host");
  const [phase, setPhase] = useState<"create" | "join" | "lobby" | "play" | "end">("create");
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [myName, setMyName] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const supabaseRef = useRef<SupabaseClient | null>(null);

  const initSupabase = useCallback(() => {
    const c = getSupabaseBrowser();
    supabaseRef.current = c;
    return c;
  }, []);

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

    const { data, error: e } = await sb.from("grid_rooms").insert({
      code: myCode,
      seed,
      clue_type: "mixed",
      clues,
    }).select().single();

    if (e || !data) {
      setError("Не удалось создать комнату: " + (e?.message ?? "?"));
      return;
    }
    setCode(myCode);
    setRoom(data as Room);
    setPhase("lobby");
    setMsg("Создано! Скинь код другу.");
  }, [initSupabase]);

  // --- Подключение (guest) ---
  const joinRoom = useCallback(async () => {
    setError("");
    const sb = initSupabase();
    if (!sb) {
      setError("Supabase не настроен. Заполните .env.local.");
      return;
    }
    const clean = joinCode.trim().toUpperCase();
    if (clean.length < 4) {
      setError("Введите код из 5 символов.");
      return;
    }
    const { data, error: e } = await sb.from("grid_rooms").select().eq("code", clean).maybeSingle();
    if (e) {
      setError("Ошибка подключения: " + e.message);
      return;
    }
    if (!data) {
      setError("Комната не найдена. Проверьте код.");
      return;
    }
    if (data.status !== "waiting") {
      setError("Игра уже идёт или закончилась. Создайте новую комнату.");
      return;
    }
    setCode(clean);
    setRoom(data as Room);
    setRole("guest");
    setPhase("lobby");
    setMsg("Подключились! Ждите старта.");
  }, [joinCode, initSupabase]);

  // --- Start (только host) ---
  const startGame = useCallback(async () => {
    if (!room || role !== "host") return;
    const sb = initSupabase();
    if (!sb) return;
    await sb.from("grid_rooms").update({ status: "playing" }).eq("id", room.id);
    setPhase("play");
  }, [room, role, initSupabase]);

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
  }, [room?.id]);

  // --- Ход (гость/хост заполняет свою клетку) ---
  const placePlayer = useCallback(
    (cellIdx: number, playerName: string) => {
      if (!room || phase !== "play" || room.status !== "playing") return;
      const boardKey = role === "host" ? "host_board" : "guest_board";
      const board = [...(room[boardKey] as (string | null)[]) ?? Array(9).fill(null)];
      board[cellIdx] = playerName;
      const sb = initSupabase();
      if (!sb) return;
      sb.from("grid_rooms").update({ [boardKey]: board }).eq("id", room.id);
      setRoom({ ...room, [boardKey]: board });
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
              {room.status === "waiting" ? "Ждём соперника" : room.status === "playing" ? "Идёт игра" : "Завершено"}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}
      {msg && !error && (
        <div className="rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-sm px-4 py-3">
          {msg}
        </div>
      )}

      {/* Экран 1: создание / подключение */}
      {phase === "create" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-stone-200 bg-white/70 p-5">
            <h3 className="font-bold text-lg">Создать комнату</h3>
            <p className="mt-1 text-sm text-stone-600">
              Вы будете хостом. Создайте комнату и отправьте код другу.
            </p>
            <input
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
              placeholder="Ваше имя (необязательно)"
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
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC12"
              maxLength={5}
              className="mt-4 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-mono tracking-widest outline-none focus:border-stone-500 uppercase"
            />
            <button
              onClick={joinRoom}
              className="mt-4 w-full rounded-xl bg-stone-900 text-white font-semibold py-3 hover:bg-stone-700 transition"
            >
              ПОДКЛЮЧИТЬСЯ
            </button>
          </div>
        </div>
      )}

      {/* Экран 2: лобби */}
      {phase === "lobby" && room && (
        <div className="rounded-2xl border border-stone-200 bg-white/70 p-6 max-w-lg">
          <h3 className="text-xl font-black">
            КОМНАТА <span className="font-mono bg-stone-900 text-white px-2 py-0.5 rounded-lg">{room.code}</span>
          </h3>
          <p className="mt-2 text-sm text-stone-600">
            {role === "host"
              ? "Отправьте этот код другу. Он подключится как гость. Как только он появится — нажмите «Начать игру»."
              : "Вы подключены как гость. Ждите, пока хост начнёт игру."}
          </p>
          {role === "host" && (
            <button
              onClick={startGame}
              className="mt-5 w-full rounded-xl bg-emerald-600 text-white font-bold py-3 hover:bg-emerald-500 transition"
            >
              НАЧАТЬ ИГРУ
            </button>
          )}
          {role === "guest" && (
            <div className="mt-5 rounded-xl bg-stone-100 p-4 text-sm text-stone-600 animate-pulse">
              Ожидаем старта…
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
  onPlace,
  onFinish,
  iWon,
  isDraw,
}: {
  room: Room;
  theme: GridTheme;
  role: Role;
  onPlace: (i: number, name: string) => void;
  onFinish: (w: "host" | "guest" | "draw") => void;
  iWon: boolean;
  isDraw: boolean;
}) {
  const myBoard = (role === "host" ? room.host_board : room.guest_board) as (string | null)[];
  const theirBoard = (role === "host" ? room.guest_board : room.host_board) as (string | null)[];
  const [pickerCell, setPickerCell] = useState<number | null>(null);
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

  return (
    <div className="space-y-4">
      {/* Моё поле */}
      <section className="rounded-2xl border border-stone-200 bg-white/70 p-4">
        <h3 className="text-sm font-bold tracking-wide text-stone-700">
          ВАША ДОСКА{" "}
          <span className="text-xs font-normal text-stone-500">
            ({role === "host" ? "вы — X" : "вы — O"})
          </span>
        </h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {myBoard.map((val, i) => {
            const clue = clues[i];
            return (
              <button
                key={i}
                disabled={finished}
                onClick={() => {
                  if (!val) {
                    setPickerCell(i);
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
          })}
        </div>
      </section>

      {/* Picker */}
      {pickerCell !== null && !finished && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-xl">
            <h4 className="font-bold text-lg">Кто подходит?</h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Клетка: <b>{clues[pickerCell]?.label}</b> — <b>{clues[pickerCell]?.value}</b>
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
                          onPlace(pickerCell, p.name_ru);
                          setPickerCell(null);
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
                    onPlace(pickerCell, query.trim());
                    setPickerCell(null);
                  }
                }}
                className="flex-1 rounded-xl bg-stone-900 text-white py-2.5 text-sm font-semibold hover:bg-stone-700"
              >
                ОК — {query.trim() || "…"}
              </button>
              <button
                onClick={() => setPickerCell(null)}
                className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Дошка соперника (read-only) */}
      <section className="rounded-2xl border border-stone-200 bg-white/40 p-4 opacity-80">
        <h3 className="text-sm font-bold tracking-wide text-stone-500">
          ДОСКА СОПЕРНИКА{" "}
          <span className="text-xs font-normal">
            ({role === "host" ? "соперник — O" : "соперник — X"})
          </span>
        </h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {theirBoard.map((val, i) => (
            <div
              key={i}
              className={`min-h-[72px] rounded-xl border p-2 ${
                val ? "border-sky-300 bg-sky-50" : "border-stone-200 bg-stone-50/50"
              }`}
            >
              <small className="block text-[9px] tracking-wider text-stone-400">
                {clues[i]?.label?.toUpperCase()}
              </small>
              <div className="text-[11px] text-stone-400 mt-0.5 line-clamp-2">
                {clues[i]?.value}
              </div>
              {val ? (
                <div className="mt-1 text-sm font-bold text-sky-700 truncate">
                  {val}
                </div>
              ) : (
                <div className="mt-1 text-xs text-stone-300 animate-pulse">ждёт…</div>
              )}
            </div>
          ))}
        </div>
      </section>

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
