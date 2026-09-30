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
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

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
      // 5 случайных категорий из 8
      const allCats = Object.keys(SVAYA_CATEGORIES) as SvoyaCategory[];
      const cats: SvoyaCategory[] = [];
      const pool = [...allCats];
      while (cats.length < 5 && pool.length > 0) {
        const i = Math.floor(Math.random() * pool.length);
        cats.push(pool.splice(i, 1)[0]);
      }
      // Доска: 25 ячеек, вопросы берутся из SVAYA_QUESTIONS
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
        const newRoom = createRoom({ id: "", code, hostId: myId, hostName: name, categories: cats, board, answerSeconds: 20 });
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
      setInviteLink(`${window.location.origin}/svoya/join/${finalCode}`);
      setMsg(`Комната ${finalCode} создана! Отправь ссылку друзьям (2–6 игроков).`);
    } catch (e) {
      setErr("Ошибка создания комнаты: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [sb, myId, setErr]);

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
        setInviteLink(`${window.location.origin}/svoya/join/${r.code}`);
        setMsg(`С возвращением, ${name}!`);
        return;
      }
      const res = await applyAndSave(sb, r.id, { type: "join", playerId: myId, name });
      if (!res.ok || !res.room) { setErr(res.error ?? "Не удалось подключиться."); return; }
      setRoom(res.room);
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

  const handleOption = useCallback(async (idx: number) => {
    // Блокируем повторные нажатия: если уже выбран вариант — игнорируем
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    const res = await act({ type: "answer", actorId: myId, optionIndex: idx });
    // Сбрасываем локальный выбор после обновления комнаты (новое question)
    // Если act вернул ошибку — сбрасываем, чтобы можно было попробовать снова
    if (!res?.ok) {
      setSelectedOption(null);
    }
  }, [act, myId, selectedOption]);

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
    setRoom(null);
    setMsg("");
    setInviteLink("");
  }, [sb, myId]);

  // Сбрасываем локальный выбор варианта при смене вопроса/фазы
  useEffect(() => {
    setSelectedOption(null);
  }, [room?.current?.qId, room?.status]);

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
            <span className="text-xs text-white/40">Таймер ответа: {room.answerSeconds}с</span>
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
            <div className="text-xs text-white/40">Категории (5 из 8):</div>
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
              НАЧАТЬ ИГРУ (5×5)
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

      {/* ---------- Доска ---------- */}
      {room && room.status === "board" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">
              Ходит: <b className={myTurn ? "text-emerald-300" : "text-cyan-300"}>{turnPlayerName ?? "—"}</b>
            </span>
            <span className="text-white/40">Выбрано: {takenCount}/25</span>
          </div>

          {myTurn && (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-4 py-2.5 text-sm text-emerald-300 font-semibold">
              🎯 Ваш ход! Выберите категорию и номинал.
            </div>
          )}

          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {room.categories.map((cat, ci) => (
              <div key={cat} className="space-y-1.5 sm:space-y-2">
                {/* Заголовок категории */}
                <div className="rounded-lg bg-white/10 border border-white/15 px-1 py-2 text-center text-[10px] sm:text-xs font-bold text-white/80 leading-tight">
                  {SVAYA_CATEGORIES[cat]}
                </div>
                {SVAYA_VALUES.map((val) => {
                  const cell = room.board[ci * 5 + SVAYA_VALUES.indexOf(val)];
                  return (
                    <button
                      key={val}
                      disabled={!myTurn || !cell || cell.taken}
                      onClick={() => handlePick(ci, val)}
                      className={`w-full aspect-square sm:aspect-[4/3] rounded-lg text-sm sm:text-lg font-black transition active:scale-[0.96] ${
                        cell?.taken
                          ? "bg-white/3 border border-white/10 text-white/20 cursor-default"
                          : myTurn
                          ? "bg-gradient-to-br from-cyan-600/80 to-cyan-800/80 border border-cyan-500/40 text-white hover:from-cyan-500 hover:to-cyan-700 cursor-pointer"
                          : "bg-white/8 border border-white/10 text-white/40 cursor-default"
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            ))}
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

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
            <h2 className="text-xl sm:text-2xl font-bold">{currentQuestion?.q ?? "Загрузка вопроса…"}</h2>
          </div>

          {/* 4 варианта ответа — крупные кнопки */}
          {currentQuestion && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  disabled={selectedOption !== null || !iAmIn}
                  onClick={() => handleOption(idx)}
                  className={`rounded-2xl border-2 px-5 py-4 text-base sm:text-lg font-bold text-left transition active:scale-[0.97] ${
                    selectedOption !== null
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

          {selectedOption !== null && (
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-3 text-sm text-white/60">
              ⏳ Ответ отправлен…
            </div>
          )}

          {/* Кнопка пропуска (хост) */}
          {iAmHost && selectedOption === null && (
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

            {/* Показываем все 4 варианта с подсветкой */}
            {currentQuestion && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentQuestion.options.map((opt, idx) => {
                  const isCorrect = idx === 0; // options[0] всегда правильный
                  const isChosen = room.current!.chosenOption === idx;
                  let cls = "border-white/10 bg-white/5 text-white/30";
                  if (isCorrect) cls = "border-emerald-500/60 bg-emerald-500/15 text-emerald-200";
                  else if (isChosen) cls = "border-red-500/60 bg-red-500/15 text-red-200";
                  return (
                    <div key={idx} className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold ${cls}`}>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/30 text-[11px] font-black mr-2">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {opt}
                      {isCorrect && <span className="ml-2 text-emerald-300">✓</span>}
                      {isChosen && !isCorrect && <span className="ml-2 text-red-300">✗ ваш выбор</span>}
                    </div>
                  );
                })}
              </div>
            )}

            <div className={`rounded-xl border px-4 py-3 ${
              room.current.correct
                ? "bg-emerald-500/10 border-emerald-500/40"
                : "bg-red-500/10 border-red-500/40"
            }`}>
              <div className="flex items-center gap-2 text-sm font-bold">
                {room.current.correct ? (
                  <span className="text-emerald-300">✓ ВЕРНО · +{room.current.val}</span>
                ) : (
                  <span className="text-red-300">✗ НЕВЕРНО · −{room.current.val}</span>
                )}
                <span className="text-white/40 font-normal ml-auto">
                  ({room.players.find((p) => p.id === room.current!.pickedBy)?.name})
                </span>
              </div>
              <div className="mt-1 text-sm text-white/50">
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
