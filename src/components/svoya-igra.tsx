"use client";

// ============================================================
// СВОЯ ИГРА — онлайн-компонент (2–6 игроков)
// ============================================================
// Архитектура:
//   - движок (engine.ts) — single source of truth по логике
//   - Postgres (svoya_rooms.state jsonb) — single source of truth по данным
//   - realtime-канал svoya-${roomId} + polling 1s (fallback)
//   - все действия идут через applyAndSave (read-then-write + движок)
//
// UI-фазы (отражают room.status):
//   lobby → board → question → reveal → finished
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase";
import { usePlayerName } from "@/lib/use-player-name";
import { useProgression } from "@/lib/progression/use-progression";
import {
  createRoom,
  toPublicRoom,
  type SvoyaRoom,
  type SvoyaAction,
} from "@/lib/svoya/engine";
import {
  SVAYA_CATEGORIES,
  SVAYA_VALUES,
  SVAYA_QUESTIONS,
  findQuestion,
  type SvoyaCategory,
  type PublicQuestion,
} from "@/lib/svoya/questions";
import {
  applyAndSave,
  autoAdvanceAndSave,
  loadRoom,
  loadRoomByCode,
  makeCode,
  saveRoom,
} from "@/lib/svoya/room";

const ANSWER_OPTIONS = [10, 20, 30, 60];

/** Стабильный ID игрока: один на вкладку (sessionStorage), переживает перезагрузку. */
function getMyId(): string {
  if (typeof window === "undefined") return "p" + Math.random().toString(36).slice(2, 10);
  const KEY = "svoya_player_id";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = "p" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

/** Сохранить id текущей комнаты (переживает перезагрузку вкладки). */
function saveRoomIdToStorage(roomId: string): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("svoya_room_id", roomId); } catch { /* ignore */ }
}
function getRoomIdFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem("svoya_room_id"); } catch { return null; }
}
function clearRoomIdFromStorage(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem("svoya_room_id"); } catch { /* ignore */ }
}

export function SvoyaIgra() {
  const params = useParams<{ code?: string }>();
  const joinCodeParam = params.code as string | undefined;
  const cameByLink = Boolean(joinCodeParam);

  const sbClient = useRef<SupabaseClient | null>(null);
  if (sbClient.current === null) sbClient.current = getSupabaseBrowser();
  const sb = sbClient.current;

  const [myId] = useState<string>(() => getMyId());
  const { name: myName, setName: setMyName } = usePlayerName("svoya_player_name");
  const myNameRef = useRef(myName);
  myNameRef.current = myName;

  const [room, setRoom] = useState<SvoyaRoom | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [joinName, setJoinName] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<15 | 25>(25);

  const roomRef = useRef<SvoyaRoom | null>(null);
  roomRef.current = room;
  const { reportResult } = useProgression();
  const reportedRef = useRef(false);

  // ---------- Хелперы ----------

  const setErr = useCallback((e: string) => setError(e), []);

  /** Применить действие через движок (read-then-write) и обновить локальный state. */
  const act = useCallback(
    async (action: SvoyaAction, { silent = false }: { silent?: boolean } = {}) => {
      const r = roomRef.current;
      if (!r || !sb) return null;
      const res = await applyAndSave(sb, r.id, action);
      if (res.room) setRoom(res.room);
      if (!res.ok && !silent) setError(res.error ?? "Ошибка");
      return res;
    },
    [sb]
  );

  // ---------- Хост: создать комнату ----------
  const handleCreate = useCallback(async () => {
    if (!sb) { setErr("Supabase не настроен."); return; }
    setErr("");
    setBusy(true);
    try {
      const numCats = mode === 15 ? 3 : 5;
      // Случайные категории из 8
      const allCats = Object.keys(SVAYA_CATEGORIES) as SvoyaCategory[];
      const cats: SvoyaCategory[] = [];
      const pool = [...allCats];
      while (cats.length < numCats && pool.length > 0) {
        const i = Math.floor(Math.random() * pool.length);
        cats.push(pool.splice(i, 1)[0]);
      }
      // Доска: numCats × 5 ячеек
      const board = cats.flatMap((cat) =>
        SVAYA_VALUES.map((value) => {
          const q = SVAYA_QUESTIONS.find((x) => x.cat === cat && x.value === value);
          return { cat, value, qId: q?.id ?? `${cat}-${value}`, taken: false };
        })
      );
      const name = myNameRef.current.trim().slice(0, 32) || "Хост";
      // Retry-цикл: генерируем код, пробуем INSERT. Если код занят
      // (unique constraint) — берём новый код и пробуем снова (до 5 раз).
      let saved: { ok: boolean; error?: string; room?: SvoyaRoom } | null = null;
      let finalCode = "";
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = makeCode();
        const newRoom = createRoom({ id: "", code, hostId: myId, hostName: name, categories: cats, board, answerSeconds: 20, mode });
        const res = await saveRoom(sb, newRoom);
        if (res.ok && res.room) {
          saved = res;
          finalCode = code;
          break;
        }
        // Если ошибка unique violation — пробуем с новым кодом
        if (res.error && (res.error.includes("unique") || res.error.includes("duplicate key"))) {
          continue;
        }
        // Другая ошибка — не ретраим
        saved = res;
        break;
      }
      if (!saved || !saved.ok || !saved.room) {
        setErr("Ошибка сохранения: " + (saved?.error ?? "не удалось создать комнату"));
        return;
      }
      setRoom(saved.room);
      saveRoomIdToStorage(saved.room.id);
      setInviteLink(`${window.location.origin}/svoya/join/${finalCode}`);
      setMsg(`Комната ${finalCode} создана! Отправь ссылку друзьям (2–6 игроков).`);
    } catch (e) {
      setErr("Ошибка создания комнаты: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [sb, myId, mode, setErr]);

  // ---------- Гость: подключиться ----------
  const handleJoin = useCallback(async () => {
    if (!sb) { setErr("Supabase не настроен."); return; }
    const code = (joinCodeParam ?? "").trim().toUpperCase();
    setErr("");
    setBusy(true);
    try {
      const r = await loadRoomByCode(sb, code);
      if (!r) { setErr("Комната не найдена. Проверьте код."); return; }
      const name = (joinName || myNameRef.current).trim().slice(0, 32);
      if (!name) { setErr("Введите имя."); return; }

      if (r.players.some((p) => p.id === myId)) {
        // Rejoin — уже в комнате
        setRoom(r);
        saveRoomIdToStorage(r.id);
        setInviteLink(`${window.location.origin}/svoya/join/${r.code}`);
        setMsg(`С возвращением, ${name}!`);
        return;
      }
      const res = await applyAndSave(sb, r.id, { type: "join", playerId: myId, name });
      if (!res.ok || !res.room) { setErr(res.error ?? "Не удалось подключиться."); return; }
      setRoom(res.room);
      saveRoomIdToStorage(res.room.id);
      setInviteLink(`${window.location.origin}/svoya/join/${res.room.code}`);
      setMsg(`Вы в игре как «${name}»! Ждите старта.`);
    } catch (e) {
      setErr("Ошибка подключения: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [sb, myId, joinCodeParam, joinName, setErr]);

  // ---------- Действия игры ----------
  const handleStart = useCallback(async () => {
    const res = await act({ type: "start", actorId: myId });
    if (res?.ok) setMsg("");
  }, [act, myId]);

  const handlePick = useCallback(async (cat: number, val: number) => {
    await act({ type: "pick", actorId: myId, cat, val }, { silent: true });
  }, [act, myId]);

  const myAnsweredRef = useRef(false);
  const myAnswered = room?.current
    ? room.current.answers[myId] !== undefined
    : false;
  myAnsweredRef.current = myAnswered;

  const handleOption = useCallback(async (optionId: number) => {
    // Блокируем повторные нажатия: если я уже ответил — игнорируем
    if (myAnsweredRef.current) return;
    // Отправляем ответ — движок зафиксирует и обновит комнату
    await act({ type: "answer", actorId: myId, optionId }, { silent: true });
  }, [act, myId]);

  const handleSkip = useCallback(async () => {
    await act({ type: "skip", actorId: myId });
  }, [act, myId]);

  const handleTransfer = useCallback(async (toId: string) => {
    await act({ type: "transfer", actorId: myId, toPlayerId: toId });
  }, [act, myId]);

  const handleLeave = useCallback(async () => {
    const r = roomRef.current;
    if (!r || !sb) return;
    await applyAndSave(sb, r.id, { type: "leave", playerId: myId });
    clearRoomIdFromStorage();
    setRoom(null);
    setMsg("");
    setInviteLink("");
  }, [sb, myId]);

  // ---------- Realtime ----------
  useEffect(() => {
    if (!sb || !room?.id) return;
    const roomId = room.id;
    const ch = sb
      .channel(`svoya-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "svoya_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as { state?: SvoyaRoom } | null;
          if (row?.state) setRoom(row.state);
        }
      )
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [sb, room?.id]);

  // ---------- Auto-reconnect: подхватить комнату после перезагрузки ----------
  useEffect(() => {
    if (!sb || room) return; // уже в комнате
    const savedId = getRoomIdFromStorage();
    if (!savedId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await loadRoom(sb, savedId);
        if (cancelled) return;
        if (r) {
          // Комната найдена — проверяем, что мы ещё в ней
          if (r.players.some((p) => p.id === myId)) {
            setRoom(r);
          } else {
            clearRoomIdFromStorage();
          }
        } else {
          clearRoomIdFromStorage();
        }
      } catch {
        if (!cancelled) clearRoomIdFromStorage();
      }
    })();
    return () => { cancelled = true; };
  }, [sb, room, myId]);

  // ---------- Polling + серверный таймер (1с) ----------
  const advancingRef = useRef(false);
  useEffect(() => {
    if (!sb || !room?.id) return;
    const roomId = room.id;
    const t = setInterval(async () => {
      try {
        const fresh = await loadRoom(sb, roomId);
        if (!fresh) return;
        setRoom(fresh);
        // nextAt просрочен → продвигаем (идемпотентно)
        if (fresh.nextAt && Date.now() >= new Date(fresh.nextAt).getTime() && !advancingRef.current) {
          advancingRef.current = true;
          try {
            const res = await autoAdvanceAndSave(sb, roomId);
            if (res.room) setRoom(res.room);
          } finally {
            advancingRef.current = false;
          }
        }
      } catch { /* ignore */ }
    }, 1000);
    return () => clearInterval(t);
  }, [sb, room?.id]);

  // ---------- Прогрессия: при finished ----------
  useEffect(() => {
    if (!room || room.status !== "finished") return;
    if (reportedRef.current) return;
    const myScore = room.scores[myId] ?? 0;
    const winners = room.players.filter(
      (p) => (room.scores[p.id] ?? 0) === myScore && myScore === Math.max(...room.players.map((p) => room.scores[p.id] ?? 0))
    );
    const won = winners.length > 0 && winners.some((p) => p.id === myId);
    reportedRef.current = true;
    clearRoomIdFromStorage();
    void reportResult({
      gameId: "svoya-igra",
      won,
      score: myScore,
      metadata: { gamesPlayed: 1 },
    });
  }, [room?.status, room, myId, reportResult]);

  // ---------- Вычисления ----------
  const iAmHost = room?.hostId === myId;
  const iAmIn = room ? room.players.some((p) => p.id === myId) : false;
  const answeredCount = room?.current ? Object.keys(room.current.answers).length : 0;
  const totalActive = room?.players.length ?? 0;

  const turnPlayerName = useMemo(() => {
    if (!room || room.status !== "board") return null;
    const pid = room.turnQueue[room.turnIndex % Math.max(1, room.turnQueue.length)];
    return room.players.find((p) => p.id === pid)?.name ?? null;
  }, [room]);

  const currentQuestion: PublicQuestion | null = useMemo(() => {
    if (!room?.current) return null;
    const q = findQuestion(room.current.qId);
    if (!q) return null;
    const { answer: _a, ...pub } = q;
    return pub;
  }, [room?.current]);

  const currentQuestionFull = room?.current ? findQuestion(room.current.qId) : null;

  const takenCount = room ? room.board.filter((c) => c.taken).length : 0;

  const sortedPlayers = useMemo(() => {
    if (!room) return [];
    return [...room.players].sort((a, b) => (room.scores[b.id] ?? 0) - (room.scores[a.id] ?? 0));
  }, [room]);

  const remainingSec = room?.nextAt
    ? Math.max(0, Math.ceil((new Date(room.nextAt).getTime() - Date.now()) / 1000))
    : 0;

  // Тикер для таймера (500мс)
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((x) => x + 1), 500);
    return () => clearInterval(t);
  }, []);

  const myTurn = room?.status === "board" && turnPlayerName === room.players.find((p) => p.id === myId)?.name;

  // ======================= RENDER =======================

  return (
    <div className="space-y-5 text-white">
      {/* Шапка */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <small className="text-[11px] tracking-[0.2em] text-cyan-400/70">
            СВОЯ ИГРА · 2–6 ИГРОКОВ
          </small>
          <h1 className="text-3xl font-black">
            <em className="font-light italic text-cyan-400">СВОЯ ИГРА</em> ОНЛАЙН
          </h1>
        </div>
        {room && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/40">Код:</span>
            <button
              onClick={() => navigator.clipboard?.writeText(room.code)}
              className="rounded-lg bg-cyan-600 text-white font-mono font-bold px-3 py-1.5 hover:bg-cyan-500 transition active:scale-95"
              title="Скопировать код"
            >
              {room.code}
            </button>
            <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              {room.players.length}/6
            </span>
          </div>
        )}
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}
      {msg && !error && <div className="rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-sm px-4 py-3 whitespace-pre-line">{msg}</div>}

      {/* ---------- Стартовый экран: хост ---------- */}
      {(!room || !iAmIn) && !cameByLink && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 max-w-md">
          <h3 className="font-bold text-lg">Создать комнату</h3>
          <p className="mt-1 text-sm text-white/50">
            Вы будете хостом. Друзья подключаются по ссылке (2–6 игроков).
          </p>
          <input
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
            placeholder="Ваше имя"
            className="mt-4 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-base text-white outline-none placeholder:text-white/25 focus:border-cyan-500/50"
          />
          {/* Режим: 15 или 25 вопросов */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-white/40">Вопросов:</span>
            {([15, 25] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                  mode === m
                    ? "bg-cyan-600 border-cyan-500 text-white"
                    : "border-white/15 text-white/50 hover:border-cyan-500/50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={handleCreate}
            disabled={busy}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-bold py-3 hover:from-cyan-500 hover:to-cyan-600 transition active:scale-[0.98] disabled:opacity-40"
          >
            СОЗДАТЬ КОМНАТУ
          </button>
        </div>
      )}

      {/* ---------- Стартовый экран: гость по ссылке ---------- */}
      {cameByLink && !room && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 max-w-md">
          <h3 className="font-bold text-lg">Подключиться к игре</h3>
          <div className="mt-2 text-sm text-white/50">
            Комната: <span className="font-mono font-bold text-cyan-300">{(joinCodeParam ?? "").toUpperCase()}</span>
          </div>
          <input
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="Ваше имя"
            className="mt-4 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-base text-white outline-none placeholder:text-white/25 focus:border-cyan-500/50"
          />
          <button
            onClick={handleJoin}
            disabled={busy}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-bold py-3 hover:from-cyan-500 hover:to-cyan-600 transition active:scale-[0.98] disabled:opacity-40"
          >
            ПОДКЛЮЧИТЬСЯ
          </button>
        </div>
      )}

      {/* ---------- Лобби ---------- */}
      {room && room.status === "lobby" && iAmIn && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white">Игроки ({room.players.length}/6)</h3>
            <span className="text-xs text-white/40">{room.mode} вопросов · Таймер: {room.answerSeconds}с</span>
          </div>

          {/* Таймер ответа (хост) */}
          {iAmHost && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-white/40">Таймер:</span>
              {ANSWER_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={async () => {
                    const r = roomRef.current;
                    if (!r || !sb) return;
                    const fresh = { ...r, answerSeconds: s };
                    const saved = await saveRoom(sb, fresh);
                    if (saved.ok) setRoom(fresh);
                  }}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition ${
                    room.answerSeconds === s
                      ? "bg-cyan-600 border-cyan-500 text-white"
                      : "border-white/15 text-white/50 hover:border-cyan-500/50"
                  }`}
                >
                  {s}с
                </button>
              ))}
            </div>
          )}

          {/* Ссылка для приглашения */}
          {inviteLink && (
            <div className="mt-4 rounded-xl bg-cyan-500/10 border border-cyan-500/25 p-4">
              <div className="text-xs font-semibold text-cyan-300 tracking-wide">🔗 ССЫЛКА ДЛЯ ПРИГЛАШЕНИЯ</div>
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  onClick={(e) => e.currentTarget.select()}
                  className="flex-1 rounded-lg border border-cyan-500/30 bg-black/30 px-3 py-2 text-sm font-mono outline-none text-cyan-200"
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(inviteLink);
                    setMsg("Ссылка скопирована!");
                  }}
                  className="rounded-lg bg-cyan-600 text-white text-sm font-semibold px-4 py-2 hover:bg-cyan-500 transition active:scale-95"
                >
                  📋 Копировать
                </button>
              </div>
            </div>
          )}

          {/* Категории доски */}
          <div className="mt-4">
            <div className="text-xs text-white/40">Категории ({room.mode === 15 ? "3" : "5"} из 8):</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {room.categories.map((c) => (
                <span key={c} className="text-xs px-2 py-1 rounded-full bg-white/8 border border-white/10 text-white/60">
                  {SVAYA_CATEGORIES[c]}
                </span>
              ))}
            </div>
          </div>

          <ul className="mt-4 grid sm:grid-cols-2 gap-2">
            {room.players.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white/70">
                <span className={`w-2 h-2 rounded-full ${p.isHost ? "bg-emerald-400" : "bg-cyan-400"}`} />
                <span className="font-medium">{p.name}</span>
                {p.isHost && <span className="text-[10px] text-white/30">👑 хост</span>}
                {p.id === myId && <span className="text-[10px] text-cyan-300">(вы)</span>}
                {/* Хост может передать хоста */}
                {iAmHost && p.id !== myId && (
                  <button
                    onClick={() => handleTransfer(p.id)}
                    className="ml-auto text-[10px] text-white/30 hover:text-amber-300 transition"
                    title="Передать хоста"
                  >
                    → хост
                  </button>
                )}
              </li>
            ))}
          </ul>

          {iAmHost ? (
            <button
              onClick={handleStart}
              disabled={room.players.length < 2}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold py-3 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-30 transition active:scale-[0.98]"
            >
              НАЧАТЬ ИГРУ ({room.mode === 15 ? "3×5" : "5×5"})
            </button>
          ) : (
            <div className="mt-5 rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/40 animate-pulse">
              Ждём старта от хоста…
            </div>
          )}
          <button
            onClick={handleLeave}
            className="mt-2 text-xs text-white/25 hover:text-red-300 transition"
          >
            Выйти из комнаты
          </button>
        </div>
      )}

      {/* ---------- Доска (классическая «Своя игра») ---------- */}
      {room && room.status === "board" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">
              Ходит: <b className={myTurn ? "text-emerald-300" : "text-cyan-300"}>{turnPlayerName ?? "—"}</b>
            </span>
            <span className="text-white/40">Выбрано: {takenCount}/{room.board.length}</span>
          </div>

          {myTurn && (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-4 py-2.5 text-sm text-emerald-300 font-semibold">
              🎯 Ваш ход! Выберите категорию и номинал.
            </div>
          )}

          {/* Табло: категории слева (строки), номиналы сверху (столбцы) */}
          <div className="overflow-x-auto rounded-2xl border-2 border-cyan-500/30 bg-[#070e1a]">
            <div className="min-w-[540px] grid" style={{ gridTemplateColumns: `minmax(120px,1fr) repeat(5, minmax(72px,1fr))` }}>
              {/* Шапка: угол + номиналы */}
              <div className="bg-[#0a1628]" />
              {SVAYA_VALUES.map((val) => (
                <div
                  key={val}
                  className="h-11 flex items-center justify-center text-sm sm:text-base font-black text-cyan-200/90 border-b border-cyan-500/20 bg-[#0a1628]"
                >
                  {val}
                </div>
              ))}

              {/* Строки: категория + 5 ячеек */}
              {room.categories.map((cat, ci) => (
                <div key={cat} className="contents">
                  {/* Название категории (слева) */}
                  <div className={`flex items-center justify-center px-3 py-2.5 text-xs sm:text-sm font-bold text-white/90 border-b border-r border-cyan-500/20 leading-tight text-center bg-[#0d1f3c] ${
                    ci === room.categories.length - 1 ? "border-b-0" : ""
                  }`}>
                    {SVAYA_CATEGORIES[cat]}
                  </div>
                  {/* 5 ячеек номиналов */}
                  {SVAYA_VALUES.map((val, vi) => {
                    const cell = room.board[ci * 5 + vi];
                    return (
                      <button
                        key={val}
                        disabled={!myTurn || !cell || cell.taken}
                        onClick={() => handlePick(ci, val)}
                        className={`h-14 sm:h-16 flex items-center justify-center text-sm sm:text-lg font-black transition active:scale-[0.96] border-b border-r border-cyan-500/20 ${
                          ci === room.categories.length - 1 ? "border-b-0" : ""
                        }
                        ${
                          cell?.taken
                            ? "bg-[#060d18] text-white/10 cursor-default"
                            : myTurn
                            ? "bg-[#0d2a52] text-cyan-300 hover:bg-[#123d72] cursor-pointer"
                            : "bg-[#0a1e3e] text-cyan-200/40 cursor-default"
                        }`}
                      >
                        {cell?.taken ? "✓" : val}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Вопрос ---------- */}
      {room && room.status === "question" && room.current && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">
              Выбрал: <b className="text-cyan-300">{room.players.find((p) => p.id === room.current!.pickedBy)?.name}</b>
              {" · "}{SVAYA_CATEGORIES[room.categories[room.current.cat]]} · {room.current.val}
            </span>
            <span className={`font-bold ${remainingSec <= 5 ? "text-red-400" : "text-white/60"}`}>
              ⏱ {remainingSec}с
            </span>
          </div>

          {/* Счётчик ответивших */}
          <div className="text-center text-sm text-white/50">
            Ответили: <b className="text-cyan-300">{answeredCount}</b> из {totalActive}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
            <h2 className="text-xl sm:text-2xl font-bold">{currentQuestion?.q ?? "Загрузка вопроса…"}</h2>
          </div>

          {/* 4 варианта ответа — крупные кнопки */}
          {currentQuestion && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  disabled={myAnswered || !iAmIn}
                  onClick={() => handleOption(idx)}
                  className={`rounded-2xl border-2 px-5 py-4 text-base sm:text-lg font-bold text-left transition active:scale-[0.97] ${
                    myAnswered
                      ? "border-white/10 bg-white/5 text-white/30 cursor-default"
                      : iAmIn
                      ? "border-cyan-500/40 bg-gradient-to-br from-cyan-600/60 to-cyan-800/60 text-white hover:from-cyan-500 hover:to-cyan-700 cursor-pointer"
                      : "border-white/10 bg-white/5 text-white/40 cursor-default"
                  }`}
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/30 text-sm font-black mr-3">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {myAnswered && (
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-3 text-sm text-white/60 text-center">
              ✓ Ваш ответ зафиксирован. Ожидаем остальных…
            </div>
          )}

          {/* Кнопка пропуска (хост) */}
          {iAmHost && (
            <button
              onClick={handleSkip}
              className="w-full rounded-xl bg-stone-600/60 text-white font-semibold py-2.5 hover:bg-stone-500/60 transition"
            >
              ⏭ Пропустить (−{room.current.val} тому, кто выбрал)
            </button>
          )}
        </div>
      )}

      {/* ---------- REVEAL ---------- */}
      {room && room.status === "reveal" && room.current && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">
              {SVAYA_CATEGORIES[room.categories[room.current.cat]]} · {room.current.val}
            </span>
            <span className="text-white/50">⏱ {remainingSec}с до следующего хода</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold">{currentQuestion?.q ?? "—"}</h2>

            {/* Показываем все 4 варианта с подсветкой правильного */}
            {currentQuestion && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentQuestion.options.map((opt, idx) => {
                  const isCorrect = idx === 0;
                  let cls = "border-white/10 bg-white/5 text-white/30";
                  if (isCorrect) cls = "border-emerald-500/60 bg-emerald-500/15 text-emerald-200";
                  return (
                    <div key={idx} className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold ${cls}`}>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/30 text-[11px] font-black mr-2">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {opt}
                      {isCorrect && <span className="ml-2 text-emerald-300">✓ правильный</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Результаты каждого игрока */}
            <div className="space-y-1.5">
              {room.players.map((p) => {
                const ans = room.current!.answers[p.id];
                const q = currentQuestion;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      ans
                        ? ans.correct
                          ? "bg-emerald-500/10 border border-emerald-500/20"
                          : "bg-red-500/10 border border-red-500/20"
                        : "bg-white/5 border border-white/10"
                    }`}
                  >
                    <span className="font-semibold">{p.name}</span>
                    <span className={ans ? (ans.correct ? "text-emerald-300" : "text-red-300") : "text-white/30"}>
                      {ans
                        ? `${ans.correct ? "✓" : "✗"} ${q ? q.options[ans.optionId] : ""} · ${ans.correct ? "+" : "−"}${room.current!.val}`
                        : "не ответил"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="text-sm text-white/50">
                💡 {currentQuestion?.explanation}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Финал ---------- */}
      {room && room.status === "finished" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
          <h2 className="text-center text-3xl font-black">🏁 ФИНАЛ</h2>
          <div className="mt-5 space-y-2 max-w-md mx-auto">
            {sortedPlayers.map((p, idx) => {
              const isWinner = p.id === myId && (room.scores[p.id] ?? 0) === Math.max(...room.players.map((x) => room.scores[x.id] ?? 0));
              const isTop = idx === 0;
              return (
                <div
                  key={p.id}
                  className={`rounded-xl px-4 py-3 flex items-center justify-between text-sm ${
                    isTop ? "bg-amber-500/15 border border-amber-500/30" : "bg-white/5 border border-white/10"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🎯"}</span>
                    <b className={p.id === myId ? "text-cyan-300" : ""}>
                      {p.name} {isWinner ? "🏆" : ""}
                    </b>
                  </span>
                  <b className={isTop ? "text-amber-300" : ""}>{room.scores[p.id] ?? 0}</b>
                </div>
              );
            })}
          </div>

          {/* Ничья */}
          {(() => {
            const maxScore = Math.max(...room.players.map((x) => room.scores[x.id] ?? 0));
            const winners = room.players.filter((p) => (room.scores[p.id] ?? 0) === maxScore);
            if (winners.length > 1) {
              return (
                <div className="mt-4 text-center text-sm text-amber-300/80">
                  🤝 Ничья! Победили: {winners.map((p) => p.name).join(", ")}
                </div>
              );
            }
            return null;
          })()}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {iAmHost && (
              <button
                onClick={handleStart}
                className="rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 text-white px-6 py-3 text-sm font-bold hover:from-cyan-500 hover:to-cyan-600 transition"
              >
                🔄 Новая игра (те же игроки)
              </button>
            )}
            <button
              onClick={handleLeave}
              className="rounded-xl bg-white/10 text-white/70 px-6 py-3 text-sm font-semibold hover:bg-white/15 transition"
            >
              ↩ Выйти в лобби
            </button>
          </div>
        </div>
      )}

      {/* ---------- Таблица лидеров (на board/question/reveal) ---------- */}
      {room && (room.status === "board" || room.status === "question" || room.status === "reveal") && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
          <h3 className="text-xs tracking-wider text-cyan-400/70">ТАБЛИЦА ЛИДЕРОВ</h3>
          <ul className="mt-2 space-y-1.5">
            {sortedPlayers.map((p, idx) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-center leading-5 text-[11px] font-bold ${
                    idx === 0 ? "bg-amber-400 text-black" : idx === 1 ? "bg-white/15 text-white/70" : idx === 2 ? "bg-amber-700 text-white" : "bg-white/8 text-white/40"
                  }`}>{idx + 1}</span>
                  <span className={p.id === myId ? "font-bold text-cyan-300" : "text-white/50"}>
                    {p.name} {p.isHost && "👑"}
                  </span>
                </span>
                <b className={p.id === myId ? "text-cyan-300" : "text-white/60"}>{room.scores[p.id] ?? 0}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-white/25 max-w-md">
        {isSupabaseConfigured
          ? "Онлайн-игра через Supabase Realtime. Откройте в 2+ окнах для проверки."
          : "⚠️ Supabase не настроен — онлайн-режим не работает."}
      </p>
    </div>
  );
}
