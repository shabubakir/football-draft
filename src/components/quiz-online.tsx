"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { shuffleQuestions, type QuizTopic } from "@/lib/quiz";

type QuizPhase = "lobby" | "playing" | "reveal" | "end";
type Role = "host" | "guest";

type Player = {
  id: string;
  name: string;
  isHost: boolean;
};

type QuizRoom = {
  id: string;
  code: string;
  status: "lobby" | "playing" | "finished";
  current_q: number;
  q_state: "answering" | "reveal";
  host_name: string;
  players: Player[];
  scores: Record<string, number>;
  answers: Record<number, Record<string, number>>; // { questionIndex: { playerId: optionIndex } }
  seed?: number; // порядок вопросов — общий для всех
  topic?: "football" | "geo"; // тема вопросов (футбол / география)
  rematch_votes?: Record<string, boolean>; // { playerId: да/нет } — голос за реванш
  next_at?: string | null; // ISO время, когда нужно продвинуть (серверный таймер)
};

const TOTAL_QUESTIONS = 10;
const ANSWER_SECONDS = 10;
const ANSWER_SECONDS_IMAGE = 15;
const REVEAL_SECONDS = 4;

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function uid() {
  // Стабильный ID игрока (переживает перезагрузку страницы)
  // ВАЖНО: ID генерируем каждый раз — чтобы в разных вкладках были разные игроки
  // (для тестирования онлайн-игры в 2+ окнах)
  if (typeof window !== "undefined") {
    // Генерируем новый ID при каждой загрузке страницы
    const id = "p" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem("quiz_player_id", id);
    return id;
  }
  return "p" + Math.random().toString(36).slice(2, 10);
}

export function QuizOnline() {
  const sbRef = useRef<SupabaseClient | null>(null);
  const params = useParams<{ join?: string; [key: string]: string | string[] | undefined }>();
  const joinParam = (params.join as string | undefined) ?? (params["j"] as string | undefined) ?? "";
  const cameByLink = Boolean(joinParam);
  const [role, setRole] = useState<Role>("host");
  const [myId, setMyId] = useState<string>(() => uid());
  const [myName, setMyName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("quiz_player_name") ?? "";
  });
  useEffect(() => {
    if (myName) localStorage.setItem("quiz_player_name", myName);
  }, [myName]);
  const [joinCode, setJoinCode] = useState(joinParam);
  const [room, setRoom] = useState<QuizRoom | null>(null);
  const [phase, setPhase] = useState<QuizPhase>("lobby");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [joinedByLink, setJoinedByLink] = useState(false);
  const [topic, setTopic] = useState<QuizTopic>("football");

  const [questions, setQuestions] = useState<ReturnType<typeof shuffleQuestions>>([]);
  const [brokenImgs, setBrokenImgs] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(ANSWER_SECONDS);
  const [revealLeft, setRevealLeft] = useState(REVEAL_SECONDS);

  const roomRef = useRef<QuizRoom | null>(null);
  roomRef.current = room;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  const initSb = useCallback(() => {
    const c = getSupabaseBrowser();
    sbRef.current = c;
    return c;
  }, []);

  // ---------- Хост: создать комнату ----------
  const createRoom = useCallback(async () => {
    setError("");
    const sb = initSb();
    if (!sb) { setError("Supabase не настроен."); return; }
    const name = myName.trim() || "Хост";
    const code = makeCode();
    const seed = Math.floor(Math.random() * 1000000);
    setQuestions(shuffleQuestions(TOTAL_QUESTIONS, seed, topic));

    const { data, error: e } = await sb.from("quiz_rooms").insert({
      code,
      host_name: name,
      players: [{ id: myId, name, isHost: true }],
      scores: { [myId]: 0 },
      answers: {},
      seed,
      topic,
    }).select().single();
    if (e || !data) { setError("Ошибка: " + (e?.message ?? "?")); return; }
    const r = data as QuizRoom;
    console.log("QUIZ DEBUG: Created room, seed in DB =", r.seed, "expected seed =", seed);
    if (r.seed !== seed) {
      console.warn("QUIZ WARNING: Seed mismatch! Fixing...");
      await sb.from("quiz_rooms").update({ seed }).eq("id", r.id);
      r.seed = seed;
    }
    const link = `${window.location.origin}/j/${code}`;
    setRoom(r);
    setInviteLink(link);
    setPhase("lobby");
    setMsg(`Комната создана! Ссылка для друзей:\n${link}`);
  }, [initSb, myName, myId, topic]);

  // ---------- Гость: подключиться ----------
  // myName через ref — чтобы auto-join (запущенный один раз при старте)
  // брал ВСЕГДА актуальное имя, даже если пользователь ещё печатает.
  const myNameRef = useRef(myName);
  myNameRef.current = myName;

  const joinRoom = useCallback(async (codeArg?: string, nameArg?: string) => {
    setError("");
    const sb = initSb();
    if (!sb) { setError("Supabase не настроен."); return; }
    const code = (codeArg ?? joinCode).trim().toUpperCase();
    if (code.length < 4) { setError("Введите код из 5 символов."); return; }
    const name = (nameArg ?? myNameRef.current).trim() ||
      (typeof window !== "undefined" && localStorage.getItem("quiz_player_name") || "").trim() ||
      "Игрок " + myId.slice(0, 3);

    const { data, error: e } = await sb
      .from("quiz_rooms").select().eq("code", code).maybeSingle();
    if (e) { setError("Ошибка: " + e.message); return; }
    if (!data) { setError("Комната не найдена."); return; }
    const r = data as QuizRoom;
    // Тема комнаты (футбол по умолчанию для старых комнат)
    const roomTopic: QuizTopic = r.topic === "geo" ? "geo" : "football";
    setTopic(roomTopic);
    // Общий порядок вопросов (из seed комнаты) — одинаковый у всех
    // Защита: если seed не сохранился — генерируем и сохраняем
    if (r.seed === undefined || r.seed === null) {
      const newSeed = Math.floor(Math.random() * 1000000);
      await sb.from("quiz_rooms").update({ seed: newSeed }).eq("id", r.id);
      setQuestions(shuffleQuestions(TOTAL_QUESTIONS, newSeed, roomTopic));
    } else {
      setQuestions(shuffleQuestions(TOTAL_QUESTIONS, r.seed, roomTopic));
    }

    const phaseFromState = (): QuizPhase =>
      r.status === "finished" ? "end" :
      r.status === "playing" ? (r.q_state === "reveal" ? "reveal" : "playing") : "lobby";

    const existing = r.players.find((p) => p.id === myId);
    if (existing) {
      // Уже подключены — просто показываем текущее состояние
      setRole("guest");
      setJoinedByLink(true);
      setRoom(r);
      setPhase(phaseFromState());
      setMsg(`Вы уже в игре как «${existing.name}».`);
      return;
    }

    if (r.status !== "lobby") { setError("Игра уже началась или закончилась."); return; }
    if (r.players.length >= 5) { setError("Комната полная (максимум 5)."); return; }

    const newPlayers = [...r.players, { id: myId, name, isHost: false }];
    const newScores = { ...r.scores, [myId]: 0 };
    const newAnswers = { ...(r.answers ?? {}) };
    const { error: upE } = await sb
      .from("quiz_rooms")
      .update({ players: newPlayers, scores: newScores, answers: newAnswers })
      .eq("id", r.id);
    if (upE) { setError("Не удалось подключиться: " + upE.message); return; }

    setRole("guest");
    setJoinedByLink(true);
    setRoom({ ...r, players: newPlayers, scores: newScores });
    setPhase("lobby");
    setMsg(`Вы в игре как «${name}»! Ждите старта.`);
  }, [initSb, joinCode, myName, myId, questions]);

  // ---------- Хост: старт ----------
  const startGame = useCallback(async () => {
    if (!room || role !== "host") return;
    const sb = initSb();
    if (!sb) return;
    const firstQ = questions[0];
    const answerTime = firstQ?.image ? ANSWER_SECONDS_IMAGE : ANSWER_SECONDS;
    const nextAt = new Date(Date.now() + answerTime * 1000).toISOString();
    await sb.from("quiz_rooms").update({
      status: "playing", q_state: "answering", current_q: 0,
      rematch_votes: null, next_at: nextAt,
    }).eq("id", room.id);
    setPhase("playing");
    setSelected(null);
  }, [room, role, initSb, questions]);

  // ---------- Хост: СОЛО-ТЕСТ (1 игрок, без friends) ----------
  const startSoloTest = useCallback(async () => {
    if (!room || role !== "host") return;
    const sb = initSb();
    if (!sb) return;
    const firstQ = questions[0];
    const answerTime = firstQ?.image ? ANSWER_SECONDS_IMAGE : ANSWER_SECONDS;
    const nextAt = new Date(Date.now() + answerTime * 1000).toISOString();
    await sb.from("quiz_rooms").update({
      status: "playing", q_state: "answering", current_q: 0,
      rematch_votes: null, next_at: nextAt,
    }).eq("id", room.id);
    setPhase("playing");
    setSelected(null);
    setMsg("🧪 Соло-тест запущен — отвечай на все вопросы сам.");
  }, [room, role, initSb, questions]);

  // ---------- Реванш: хост ПРЕДЛАГАЕТ, остальные СОГЛАСОВЫВАЮТ ----------
  const runRematch = useCallback(async (r: QuizRoom) => {
    const sb = initSb();
    if (!sb) return;
    const newSeed = Math.floor(Math.random() * 1000000);
    const newScores: Record<string, number> = {};
    for (const p of r.players) newScores[p.id] = 0;
    const rematchTopic: QuizTopic = r.topic === "geo" ? "geo" : "football";
    const newQs = shuffleQuestions(TOTAL_QUESTIONS, newSeed, rematchTopic);
    setQuestions(newQs);
    const firstQ = newQs[0];
    const answerTime = firstQ?.image ? ANSWER_SECONDS_IMAGE : ANSWER_SECONDS;
    const nextAt = new Date(Date.now() + answerTime * 1000).toISOString();
    await sb
      .from("quiz_rooms")
      .update({
        status: "playing", q_state: "answering", current_q: 0,
        scores: newScores, answers: {}, seed: newSeed, rematch_votes: null,
        next_at: nextAt,
      })
      .eq("id", r.id);
    setPhase("playing");
    setSelected(null);
    lastQRef.current = -1;
    setMsg("🔄 Реванш! Все очки обнулены, новый порядок вопросов.");
  }, [initSb]);

  // Любой игрок: предложить реванш (read-then-write, чтобы не затереть голоса)
  const proposeRematch = useCallback(async () => {
    const r = roomRef.current;
    if (!r || r.status !== "finished") return;
    const sb = initSb();
    if (!sb) return;
    try {
      const { data: fresh } = await sb
        .from("quiz_rooms").select("rematch_votes").eq("id", r.id).maybeSingle();
      const prev = (fresh?.rematch_votes as Record<string, boolean>) ?? {};
      const votes: Record<string, boolean> = { ...prev, [myId]: true };
      // Предлагающий автоматически голосует «да»
      await sb.from("quiz_rooms").update({ rematch_votes: votes }).eq("id", r.id);
      const name = r.players.find((p) => p.id === myId)?.name ?? "Игрок";
      setMsg(`🔄 ${name} предложил реванш. Ждём остальных…`);
    } catch (err) {
      console.error("quiz: proposeRematch error", err);
    }
  }, [myId, initSb]);

  // Любой игрок: проголосовать за/против реванша (read-then-write, голос можно менять)
  const voteRematch = useCallback(async (yes: boolean) => {
    const r = roomRef.current;
    if (!r || r.status !== "finished") return;
    const sb = initSb();
    if (!sb) return;
    try {
      const { data: fresh } = await sb
        .from("quiz_rooms").select("rematch_votes").eq("id", r.id).maybeSingle();
      if (!fresh) return;
      const votes = { ...((fresh.rematch_votes as Record<string, boolean>) ?? {}), [myId]: yes };
      await sb.from("quiz_rooms").update({ rematch_votes: votes }).eq("id", r.id);
    } catch (err) {
      console.error("quiz: voteRematch error", err);
    }
  }, [myId, initSb]);

  // Авто-старт реванша: когда ВСЕ проголосовали «да»
  useEffect(() => {
    const r = roomRef.current;
    if (!r || r.status !== "finished" || !r.rematch_votes) return;
    const allYes = r.players.every((p) => r.rematch_votes?.[p.id] === true);
    if (allYes) {
      const t = setTimeout(() => runRematch(r), 400);
      return () => clearTimeout(t);
    }
  }, [room?.rematch_votes, room?.status, runRematch]);

  // ---------- Прогрессия: reveal + очки + следующий вопрос ----------
  // Read-then-write: всегда берём СВЕЖЕЕ состояние из базы перед PATCH,
  // чтобы не затереть чужие ответы/очки гонкой.
  const advance = useCallback(async (r: QuizRoom, next: "reveal" | "answering" | "finished") => {
    const sb = initSb();
    if (!sb) return;
    const qs = questionsRef.current;

    // Читаем свежее состояние из базы
    const { data: fresh } = await sb
      .from("quiz_rooms").select().eq("id", r.id).maybeSingle();
    if (!fresh) return;
    const f = fresh as QuizRoom;
    // Защита: если фаза уже сменилась — не трогаем
    if (f.status !== "playing") return;
    if (next === "reveal" && f.q_state !== "answering") return;
    if (next !== "reveal" && f.q_state !== "reveal") return;

    if (next === "reveal") {
      // Начисляем очки по СВЕЖИМ answers из базы
      const qIdx = f.current_q;
      const q = qs[qIdx];
      const answersForQ = f.answers?.[qIdx] ?? {};
      const newScores = { ...f.scores };
      if (q) {
        for (const p of f.players) {
          if (answersForQ[p.id] === q.correct) {
            newScores[p.id] = (newScores[p.id] ?? 0) + 10;
          }
        }
      }
      // next_at для reveal: REVEAL_SECONDS
      const nextAt = new Date(Date.now() + REVEAL_SECONDS * 1000).toISOString();
      await sb.from("quiz_rooms").update({ q_state: "reveal", scores: newScores, next_at: nextAt }).eq("id", r.id);
    } else if (next === "answering") {
      const nextQ = f.current_q + 1;
      if (nextQ >= TOTAL_QUESTIONS) {
        await sb.from("quiz_rooms").update({ status: "finished", next_at: null }).eq("id", r.id);
      } else {
        // next_at для answering: ANSWER_SECONDS или ANSWER_SECONDS_IMAGE (если вопрос с картинкой)
        const nextQuestion = questions[nextQ];
        const answerTime = nextQuestion?.image ? ANSWER_SECONDS_IMAGE : ANSWER_SECONDS;
        const nextAt = new Date(Date.now() + answerTime * 1000).toISOString();
        await sb.from("quiz_rooms").update({ q_state: "answering", current_q: nextQ, next_at: nextAt }).eq("id", r.id);
      }
    } else {
      await sb.from("quiz_rooms").update({ status: "finished", next_at: null }).eq("id", r.id);
    }
  }, [initSb]);

  // Ref на advance — чтобы lockAnswer (созданный раньше) мог вызвать актуальную версию
  const advanceRef = useRef<typeof advance | null>(null);
  useEffect(() => { advanceRef.current = advance; }, [advance]);

  // ---------- next_at: только advance() и startGame/runRematch ----------
  // next_at НЕ перезаписывается при каждом ответе — только при смене фазы.
  // Это предотвращает сброс таймера, пока игроки отвечают.
  // Exception: если ВСЕ ответили раньше срока — продвигаем раньше.
  useEffect(() => {
    const r = room;
    if (!r || r.status !== "playing") return;
    
    // Все ответили? Продвигаем раньше (0.5 сек вместо 7)
    const allAnswered = r.players.length > 0 &&
      r.players.every((p) => (r.answers?.[r.current_q] ?? {})[p.id] !== undefined);
    
    if (allAnswered && r.q_state === "answering") {
      // Проверяем, не был ли next_at уже уменьшен
      if (r.next_at) {
        const nextAtMs = new Date(r.next_at).getTime();
        const now = Date.now();
        // Если next_at ещё далеко (> 2 сек), уменьшаем до 0.5 сек
        if (nextAtMs - now > 2000) {
          const newNextAt = new Date(now + 500).toISOString();
          console.log("QUIZ DEBUG: All answered, advancing next_at from", r.next_at, "to", newNextAt);
          initSb()?.from("quiz_rooms").update({ next_at: newNextAt }).eq("id", r.id);
        }
      }
    }
  }, [room?.answers, room?.q_state, room?.status, initSb]);

  // ---------- Таймеры отображения (из next_at, точные) ----------
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((x) => x + 1), 500);
    return () => clearInterval(t);
  }, []);
  const remainingSec = room?.next_at
    ? Math.max(0, Math.ceil((new Date(room.next_at).getTime() - Date.now()) / 1000))
    : 0;
  // Используем remainingSec для отображения (timeLeft / revealLeft)
  useEffect(() => {
    if (phase === "playing") setTimeLeft(remainingSec);
    else if (phase === "reveal") setRevealLeft(remainingSec);
  }, [remainingSec, phase]);

  // ---------- Realtime ----------
  // Клиент создаём при первом рендере (не ждём действий пользователя),
  // чтобы realtime-подписка не теряла события.
  const sbClient = useRef<SupabaseClient | null>(null);
  if (sbClient.current === null) {
    sbClient.current = getSupabaseBrowser();
  }

  useEffect(() => {
    const sb = sbClient.current;
    if (!sb || !room) return;
    const roomId = room.id;
    const ch = sb.channel(`quiz-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const r = payload.new as QuizRoom;
          setRoom((prev) => (prev ? { ...prev, ...r } : r));
          // Фаза всегда синхронизируется из базы
          if (r.status === "finished") {
            setPhase("end");
          } else if (r.status === "playing") {
            setPhase(r.q_state === "reveal" ? "reveal" : "playing");
          }
          // Лобби: если игра уже идёт (например, гость зашёл на середине)
          else if (r.status === "lobby") {
            setPhase((prevPhase) => (prevPhase === "lobby" ? prevPhase : "lobby"));
          }
        }
      )
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [room?.id]);

  // Синхронизация фазы из комнаты (на случай, если событие потеряно)
  useEffect(() => {
    if (!room) return;
    if (room.status === "finished") setPhase("end");
    else if (room.status === "playing") setPhase(room.q_state === "reveal" ? "reveal" : "playing");
    else setPhase("lobby");
  }, [room?.status, room?.q_state, room?.current_q, room?.id]);

  // КРИТИЧНО: при каждом изменении seed/темы — пере-вычисляем вопросы
  // Это гарантирует, что ВСЕ игроки видят ОДИН И ТОТ ЖЕ порядок
  const lastSeedRef = useRef<number | null>(null);
  const lastTopicRef = useRef<QuizTopic | null>(null);
  useEffect(() => {
    if (!room?.seed) return;
    const t: QuizTopic = room.topic === "geo" ? "geo" : "football";
    if (lastSeedRef.current !== room.seed || lastTopicRef.current !== t) {
      lastSeedRef.current = room.seed;
      lastTopicRef.current = t;
      setQuestions(shuffleQuestions(TOTAL_QUESTIONS, room.seed, t));
    }
  }, [room?.seed, room?.topic]);

  // ---------- Polling + серверный таймер ----------
  // Опрашиваем базу каждые 1 сек. Если next_at просрочен — продвигаем игру.
  // Это НАДЁЖНЫЙ механизм: не зависит от setTimeout, не теряется.
  const lastSyncRef = useRef(0);
  const advancingRef = useRef(false);
  useEffect(() => {
    const sb = sbClient.current;
    if (!sb || !room) return;
    const isVoting = room.status === "finished" && !!room.rematch_votes;
    const isPlaying = room.status === "playing";
    if (!isVoting && !isPlaying) return;
    const interval = isVoting ? 500 : 1000;
    const minGap = isVoting ? 350 : 700;
    const roomId = room.id;
    const poll = setInterval(async () => {
      const now = Date.now();
      if (now - lastSyncRef.current < minGap) return;
      try {
        const { data } = await sb.from("quiz_rooms").select().eq("id", roomId).maybeSingle();
        if (!data) return;
        lastSyncRef.current = now;
        const fresh = data as QuizRoom;
        setRoom((prev) => (prev ? { ...prev, ...fresh } : fresh));

        // СЕРВЕРНЫЙ ТАЙМЕР: если next_at просрочен и мы ещё не продвигаем — advance
        if (fresh.status === "playing" && !advancingRef.current) {
          let shouldAdvance = false;
          let reason = "";
          
          if (fresh.next_at) {
            const nextAtMs = new Date(fresh.next_at).getTime();
            if (now >= nextAtMs) {
              shouldAdvance = true;
              reason = "next_at expired";
            }
          } else {
            // FALLBACK: если next_at null — продвигаем только если все ответили (answering)
            // Reveal не продвигаем мгновенно — нужно дождаться 4 сек
            const allAnswered = fresh.players.length > 0 &&
              fresh.players.every((p) => (fresh.answers?.[fresh.current_q] ?? {})[p.id] !== undefined);
            const shouldBeReveal = fresh.q_state === "answering" && allAnswered;
            
            if (shouldBeReveal) {
              shouldAdvance = true;
              reason = "fallback: next_at null, all answered";
            }
          }
          
          if (shouldAdvance) {
            console.log("QUIZ DEBUG: Advancing room", fresh.code, "reason:", reason);
            advancingRef.current = true;
            try {
              if (fresh.q_state === "answering") {
                await advance(fresh, "reveal");
              } else {
                const nextQ = fresh.current_q + 1;
                if (nextQ >= TOTAL_QUESTIONS) await advance(fresh, "finished");
                else await advance(fresh, "answering");
              }
            } finally {
              advancingRef.current = false;
            }
          }
        }
      } catch { /* ignore */ }
    }, interval);
    return () => clearInterval(poll);
  }, [room?.id, room?.status, room?.rematch_votes, advance]);

  // ---------- Авто-join: пришёл по ссылке → сразу подключиться ----------
  // ОТКЛЮЧЕНО: гость вводит имя ПОЛНОСТЬЮ и сам нажимает кнопку.
  // (раньше auto-join срабатывал раньше, чем гость допечатывал имя)

  // Сброс выбора при смене вопроса
  const lastQRef = useRef<number>(-1);
  useEffect(() => {
    if (room && room.status === "playing" && room.q_state === "answering" && room.current_q !== lastQRef.current) {
      lastQRef.current = room.current_q;
      setSelected(null);
    }
  }, [room?.current_q, room?.q_state, room?.status]);

  // ---------- Ответ (можно менять, пока идёт answering) ----------
  // ВАЖНО: читаем свежий answers из БАЗЫ перед PATCH (read-then-write),
  // иначе два одновременных PATCH затрут друг друга (гонка).
  const lockAnswer = useCallback(
    async (optIdx: number) => {
      const r = roomRef.current;
      if (!r || r.q_state !== "answering" || r.status !== "playing") return;
      setSelected(optIdx);
      const sb = sbClient.current;
      if (!sb) {
        setError("⚠️ Supabase недоступен — ответ не сохранён. Перезагрузи страницу.");
        return;
      }
      try {
        // 1. Читаем актуальное состояние из базы
        const { data: fresh } = await sb
          .from("quiz_rooms").select("answers,q_state,current_q").eq("id", r.id).maybeSingle();
        if (!fresh) return;
        // 2. Фаза могла смениться — не пишем
        if (fresh.q_state !== "answering" || fresh.current_q !== r.current_q) return;
        // 3. Собираем новый answers на основе СВЕЖИХ данных
        const qIdx = r.current_q;
        const newAnswers = { ...((fresh.answers as Record<number, Record<string, number>>) ?? {}) };
        newAnswers[qIdx] = { ...(newAnswers[qIdx] ?? {}), [myId]: optIdx };
        // 4. PATCH
        const { error: upE } = await sb
          .from("quiz_rooms").update({ answers: newAnswers }).eq("id", r.id);
        if (upE) {
          console.error("quiz: failed to save answer", upE);
          setError(`⚠️ Ответ не сохранился: ${upE.message}`);
        }
        // СОЛО-РЕЖИМ (1 игрок): сразу ревил, не ждём таймер
        // Короткая задержка 100мс — даём PATCH записаться в БД,
        // чтобы advance() прочитал свежий answer и начислил очки
        if (r.players.length <= 1 && !upE) {
          console.log("QUIZ DEBUG: solo mode — instant reveal");
          setTimeout(() => advanceRef.current?.(r, "reveal"), 150);
        }
      } catch (err) {
        console.error("quiz: lockAnswer error", err);
        setError("⚠️ Не удалось сохранить ответ. Попробуй ещё раз.");
      }
    },
    [myId]
  );

  // ---------- Вычисления ----------
  const q = questions[room?.current_q ?? 0];
  const qIdx = room?.current_q ?? 0;
  const answersForQ: Record<string, number> = room?.answers?.[qIdx] ?? {};
  const answeredCount = room ? room.players.filter((p) => answersForQ[p.id] !== undefined).length : 0;
  const totalPlayers = room?.players.length ?? 0;
  const answerTime = q?.image ? ANSWER_SECONDS_IMAGE : ANSWER_SECONDS;

  const sortedPlayers = Object.entries(room?.scores ?? {})
    .map(([id, score]) => ({
      id,
      score,
      player: room?.players.find((p) => p.id === id),
    }))
    .sort((a, b) => b.score - a.score);

  const iAmHost = role === "host";

  // ======================= RENDER =======================

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <small className="text-[11px] tracking-[0.2em] text-stone-500">
            ВИКТОРИНА · ДО 5 ИГРОКОВ
          </small>
          <h1 className="text-3xl font-black">
            МАТЧ <em className="font-light italic text-stone-500">В РЕАЛЬНОМ ВРЕМЕНИ</em>
          </h1>
        </div>
        {room && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-stone-500">Код:</span>
            <button
              onClick={() => navigator.clipboard?.writeText(room.code)}
              className="rounded-lg bg-stone-900 text-white font-mono font-bold px-3 py-1.5 hover:bg-stone-700"
              title="Скопировать код"
            >
              {room.code}
            </button>
            <span className="text-xs px-2 py-1 rounded-full bg-stone-200 text-stone-600">
              {room.players.length}/5 игроков
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
              Ты подключён как «{room.players.find((p) => p.id === myId)?.name ?? myName}» · Комната {room.code}
            </div>
          </div>
        </div>
      )}

      {/* Лобби */}
      {phase === "lobby" && (
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
                    Введите <b>полное</b> имя — оно будет видно всем игрокам.
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
          ) : role === "host" && room ? (
            /* Хост уже в комнате — только приглашение и игроки */
            null
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-white/70 p-5">
              <h3 className="font-bold text-lg">Создать комнату</h3>
              <p className="mt-1 text-sm text-stone-600">
                Вы будете хостом. Друзья подключатся по ссылке.
              </p>
              <div className="mt-4">
                <div className="text-sm font-semibold text-stone-700">Тема вопросов</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTopic("football")}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      topic === "football"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                    }`}
                  >
                    ⚽ Футбол
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopic("geo")}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      topic === "geo"
                        ? "border-sky-500 bg-sky-50 text-sky-800"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                    }`}
                  >
                    🌍 География
                  </button>
                </div>
              </div>
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
          )}

          {room && (
            <div className="md:col-span-2 rounded-2xl border border-stone-200 bg-white/70 p-5">
              <h3 className="font-bold">Игроки в комнате ({room.players.length}/5)</h3>

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
                        setMsg("Ссылка скопирована! Отправь друзьям.");
                      }}
                      className="rounded-lg bg-sky-600 text-white text-sm font-semibold px-4 py-2 hover:bg-sky-500 transition"
                    >
                      📋 Скопировать
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-sky-600">
                    Отправь эту ссылку друзьям — они смогут подключиться в один клик
                  </p>
                </div>
              )}

              <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                {room.players.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 rounded-xl bg-stone-50 px-4 py-2.5 text-sm">
                    <span className={`w-2 h-2 rounded-full ${p.isHost ? "bg-emerald-500" : "bg-sky-400"}`} />
                    <span className="font-medium">{p.name}</span>
                    {p.isHost && <span className="text-[10px] text-stone-500">(хост)</span>}
                  </li>
                ))}
              </ul>
              {iAmHost && (
                <>
                  <button
                    onClick={startGame}
                    disabled={room.players.length < 2}
                    className="mt-5 w-full rounded-xl bg-emerald-600 text-white font-bold py-3 hover:bg-emerald-500 disabled:opacity-40 transition"
                  >
                    НАЧАТЬ ИГРУ ({TOTAL_QUESTIONS} вопросов)
                  </button>
                  <button
                    onClick={startSoloTest}
                    className="mt-2 w-full rounded-xl bg-amber-500 text-white font-bold py-3 hover:bg-amber-400 transition"
                  >
                    🧪 ТЕСТ (1 игрок) — прогнать самому
                  </button>
                </>
              )}
              {!iAmHost && (
                <div className="mt-5 rounded-xl bg-stone-100 p-4 text-sm text-stone-600 animate-pulse">
                  Ждём старта от хоста…
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Игра */}
      {(phase === "playing" || phase === "reveal") && room && q && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-500">
              Вопрос <b className="text-stone-900">{room.current_q + 1}</b> из {TOTAL_QUESTIONS}
            </span>
            {phase === "playing" && (
              <span className={`text-sm font-bold ${timeLeft <= 3 ? "text-red-600" : "text-stone-700"}`}>
                ⏱ {timeLeft}с{selected !== null && " · твой выбор можно поменять"}
              </span>
            )}
            {phase === "reveal" && (
              <span className="text-sm font-bold text-stone-700">
                ⏱ {revealLeft}с до следующего
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white/80 p-6">
            {q.image && !brokenImgs.has(q.image) && (
              <div className="mb-5 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={q.image}
                  alt="Вопрос"
                  className="max-h-64 w-auto rounded-xl object-cover border-2 border-stone-200"
                  onError={() => setBrokenImgs((prev) => new Set(prev).add(q.image!))}
                />
              </div>
            )}
            {q.image && brokenImgs.has(q.image) && (
              <div className="mb-5 flex justify-center">
                <div className="flex h-40 w-64 items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-100 text-stone-400 text-sm">
                  📷 Картинка не загрузилась
                </div>
              </div>
            )}
            <h2 className="text-xl sm:text-2xl font-bold">{q.q}</h2>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              {q.options.map((opt, i) => {
                const isReveal = phase === "reveal";
                const isCorrect = isReveal && i === q.correct;
                const isMine = isReveal && selected === i;
                return (
                  <button
                    key={i}
                    disabled={phase !== "playing"}
                    onClick={() => lockAnswer(i)}
                    className={`rounded-xl border-2 px-5 py-5 text-left text-base font-medium transition-all active:scale-95 hover:shadow-md ${
                      isCorrect
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : isMine && !isCorrect
                        ? "border-red-400 bg-red-50 text-red-700"
                        : selected === i && phase === "playing"
                        ? "border-stone-900 bg-stone-900 text-white shadow-lg"
                        : "border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50"
                    } disabled:opacity-70`}
                  >
                    <span className="inline-block w-7 h-7 rounded-full bg-stone-100 text-stone-600 text-center leading-7 mr-3 text-sm font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                    {/* Кто выбрал этот вариант (видно в reveal) */}
                    {isReveal && (() => {
                      const voters = room.players.filter((p) => answersForQ[p.id] === i);
                      if (voters.length === 0) return null;
                      return (
                        <span className="block mt-1.5 text-[11px] text-stone-500">
                          👤 {voters.map((p) => p.name).join(", ")}
                        </span>
                      );
                    })()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Прогресс ответов */}
          {phase === "playing" && (
            <div className="rounded-xl bg-white/60 border border-stone-200 px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-stone-600">
                Ответили: <b className="text-stone-900">{answeredCount}</b> из {totalPlayers}
              </span>
              {answeredCount === totalPlayers && totalPlayers > 0 && (
                <span className="text-emerald-600 font-semibold">✓ Все ответили</span>
              )}
            </div>
          )}
          {phase === "reveal" && (
            <div className="rounded-xl bg-white/60 border border-stone-200 px-4 py-3 text-sm text-stone-600">
              Следующий вопрос через <b className="text-stone-900">{revealLeft}с</b>…
            </div>
          )}

          {/* Очки */}
          <div className="rounded-2xl border border-stone-200 bg-white/60 p-4">
            <h3 className="text-xs tracking-wider text-stone-500">ТАБЛИЦА ЛИДЕРОВ</h3>
            <ul className="mt-2 space-y-1.5">
              {sortedPlayers.map(({ id, score, player }, idx) => (
                <li key={id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full text-center leading-5 text-[11px] font-bold ${
                      idx === 0 ? "bg-amber-400 text-white" : idx === 1 ? "bg-stone-300 text-stone-700" : idx === 2 ? "bg-amber-700 text-white" : "bg-stone-100 text-stone-500"
                    }`}>{idx + 1}</span>
                    <span className={id === myId ? "font-bold text-stone-900" : "text-stone-600"}>
                      {player?.name ?? id}
                    </span>
                  </span>
                  <b>{score}</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Финал */}
      {phase === "end" && room && (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-6 text-center">
          <h2 className="text-3xl font-black">🏁 ФИНАЛ</h2>
          <div className="mt-6 space-y-2">
            {sortedPlayers.map(({ id, score, player }, idx) => (
              <div
                key={id}
                className={`rounded-xl px-4 py-3 flex items-center justify-between text-sm ${
                  idx === 0 ? "bg-amber-100 border border-amber-300" : "bg-stone-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🎯"}</span>
                  <b className={id === myId ? "text-emerald-700" : ""}>{player?.name ?? id}</b>
                </span>
                <b className="text-lg">{score}</b>
              </div>
            ))}
          </div>
          {/* Реванш: голосование */}
          <div className="mt-6 space-y-4">
            {!room.rematch_votes && (
              <button
                onClick={proposeRematch}
                className="w-full rounded-xl bg-emerald-600 text-white px-6 py-3 text-sm font-bold hover:bg-emerald-500 transition"
              >
                🔄 Предложить реванш (те же игроки)
              </button>
            )}

            {room.rematch_votes && (() => {
              const votes = room.rematch_votes;
              const yesCount = room.players.filter((p) => votes[p.id] === true).length;
              const noCount = room.players.filter((p) => votes[p.id] === false).length;
              const pending = room.players.length - yesCount - noCount;
              const allYes = room.players.every((p) => votes[p.id] === true);
              const iVoted = votes[myId] !== undefined;
              return (
                <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-stone-700">
                      🔄 Предложен реванш
                    </span>
                    <span className="text-xs text-stone-500">
                      {yesCount}/{room.players.length} за
                    </span>
                  </div>

                  {/* Кто уже проголосовал, кто ещё нет */}
                  <ul className="space-y-1.5">
                    {room.players.map((p) => {
                      const v = votes[p.id];
                      const isMe = p.id === myId;
                      return (
                        <li key={p.id} className="flex items-center justify-between text-sm">
                          <span className={`flex items-center gap-2 ${isMe ? "font-bold text-stone-900" : "text-stone-600"}`}>
                            {p.isHost ? "👑" : "👤"} {p.name}
                            {isMe && <span className="text-[10px] text-stone-400">(ты)</span>}
                          </span>
                          {v === true && <span className="text-emerald-600 font-bold text-xs">✓ Да</span>}
                          {v === false && <span className="text-red-500 font-bold text-xs">✗ Нет</span>}
                          {v === undefined && (
                            <span className="text-[11px] text-amber-600 animate-pulse">… ждём</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* Моя плашка */}
                  {!iVoted ? (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                      ⚠️ Ты ещё не проголосовал!
                    </div>
                  ) : votes[myId] ? (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                      ✓ Ты проголосовал «Да». Ждём остальных… (голос можно поменять)
                    </div>
                  ) : (
                    <div className="rounded-lg bg-stone-100 border border-stone-200 px-3 py-2 text-xs text-stone-500">
                      Ты проголосовал «Нет». (голос можно поменять)
                    </div>
                  )}

                  {/* Кнопки голосования — всегда видны, голос можно менять */}
                  {!allYes && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => voteRematch(true)}
                        className={`flex-1 rounded-xl font-bold py-3 transition ${
                          votes[myId] === true
                            ? "bg-emerald-600 text-white ring-2 ring-emerald-300"
                            : "bg-emerald-600 text-white hover:bg-emerald-500"
                        }`}
                      >
                        ✓ Да, реванш
                      </button>
                      <button
                        onClick={() => voteRematch(false)}
                        className={`flex-1 rounded-xl font-bold py-3 transition ${
                          votes[myId] === false
                            ? "bg-stone-400 text-white ring-2 ring-stone-300"
                            : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                        }`}
                      >
                        ✗ Нет
                      </button>
                    </div>
                  )}

                  {/* Статус */}
                  <div className="text-center text-xs text-stone-500">
                    {allYes ? "Все согласны — запускаем…" : `Ждём: ${pending} из ${room.players.length}`}
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-wrap justify-center gap-3">
              <a href="/quiz/online" className="rounded-xl bg-stone-900 text-white px-6 py-3 text-sm font-semibold hover:bg-stone-700">
                ↩ В лобби (новая комната)
              </a>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-stone-400 max-w-md">
        {isSupabaseConfigured
          ? "Онлайн-викторина через Supabase Realtime. Откройте страницу в 2+ окнах, чтобы протестировать."
          : "⚠️ Supabase не настроен — онлайн-режим не работает."}
      </p>
    </div>
  );
}
