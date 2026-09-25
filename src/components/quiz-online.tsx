"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { shuffleQuestions, QUIZ_QUESTIONS } from "@/lib/quiz";

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
};

const TOTAL_QUESTIONS = 10;
const ANSWER_SECONDS = 15;

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function QuizOnline() {
  const sbRef = useRef<SupabaseClient | null>(null);
  const [role, setRole] = useState<Role>("host");
  const [myId, setMyId] = useState<string>(() => uid());
  const [myName, setMyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<QuizRoom | null>(null);
  const [phase, setPhase] = useState<QuizPhase>("lobby");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // Для хоста — порядок вопросов (общий для всех)
  const [questions, setQuestions] = useState<ReturnType<typeof shuffleQuestions>>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(ANSWER_SECONDS);

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
    const qs = shuffleQuestions(TOTAL_QUESTIONS);
    setQuestions(qs);

    const { data, error: e } = await sb.from("quiz_rooms").insert({
      code,
      host_name: name,
      players: [{ id: myId, name, isHost: true }],
      scores: { [myId]: 0 },
      answers: {},
    }).select().single();
    if (e || !data) { setError("Ошибка: " + (e?.message ?? "?")); return; }
    setRoom(data as QuizRoom);
    setPhase("lobby");
    setMsg(`Комната создана! Код: ${code}. Пришлите друзьям.`);
  }, [initSb, myName, myId]);

  // ---------- Гость: подключиться ----------
  const joinRoom = useCallback(async () => {
    setError("");
    const sb = initSb();
    if (!sb) { setError("Supabase не настроен."); return; }
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) { setError("Введите код из 5 символов."); return; }
    const name = myName.trim() || "Игрок " + myId.slice(0, 3);

    const { data, error: e } = await sb
      .from("quiz_rooms").select().eq("code", code).maybeSingle();
    if (e) { setError("Ошибка: " + e.message); return; }
    if (!data) { setError("Комната не найдена."); return; }
    const r = data as QuizRoom;
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
    setRoom({ ...r, players: newPlayers, scores: newScores });
    setPhase("lobby");
    setMsg(`Вы подключены как «${name}»! Ждите старта.`);
  }, [initSb, joinCode, myName, myId]);

  // ---------- Хост: старт ----------
  const startGame = useCallback(async () => {
    if (!room || role !== "host") return;
    const sb = initSb();
    if (!sb) return;
    await sb.from("quiz_rooms").update({ status: "playing", q_state: "answering", current_q: 0 }).eq("id", room.id);
    setPhase("playing");
    setSelected(null);
  }, [room, role, initSb]);

  // ---------- Хост: завершить раунд (reveal) + начислить очки ----------
  const revealAnswers = useCallback(async () => {
    if (!room || role !== "host") return;
    const sb = initSb();
    if (!sb) return;
    
    const qIdx = room.current_q;
    const q = questions[qIdx];
    if (!q) return;
    
    // Считаем очки: +10 за правильный ответ
    const answersForQ = room.answers?.[qIdx] ?? {};
    const newScores = { ...room.scores };
    for (const player of room.players) {
      const ans = answersForQ[player.id];
      if (ans === q.correct) {
        newScores[player.id] = (newScores[player.id] ?? 0) + 10;
      }
    }
    
    const next = qIdx + 1;
    if (next >= TOTAL_QUESTIONS) {
      await sb.from("quiz_rooms").update({ status: "finished", scores: newScores }).eq("id", room.id);
      setPhase("end");
    } else {
      await sb.from("quiz_rooms").update({ q_state: "reveal", current_q: next, scores: newScores }).eq("id", room.id);
      setPhase("reveal");
    }
  }, [room, role, initSb, questions]);

  // ---------- Хост: следующий вопрос ----------
  const nextQuestion = useCallback(async () => {
    if (!room || role !== "host") return;
    const sb = initSb();
    if (!sb) return;
    await sb.from("quiz_rooms").update({ q_state: "answering" }).eq("id", room.id);
    setPhase("playing");
    setSelected(null);
  }, [room, role, initSb]);

  // ---------- Ответ (каждый игрок — за себя) ----------
  const lockAnswer = useCallback(
    (optIdx: number) => {
      if (!room || selected !== null) return;
      setSelected(optIdx);
      // Сохраняем ответ на сервер
      const sb = initSb();
      if (!sb) return;
      const qIdx = room.current_q;
      const newAnswers = { ...(room.answers ?? {}) };
      newAnswers[qIdx] = { ...(newAnswers[qIdx] ?? {}), [myId]: optIdx };
      sb.from("quiz_rooms").update({ answers: newAnswers }).eq("id", room.id);
    },
    [room, selected, myId, initSb]
  );

  // ---------- Realtime ----------
  useEffect(() => {
    const sb = sbRef.current;
    if (!sb || !room) return;
    const roomId = room.id;
    const ch = sb.channel(`quiz-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const r = payload.new as QuizRoom;
          setRoom((prev) => (prev ? { ...prev, ...r } : r));
          if (r.status === "finished") {
            setPhase("end");
          } else if (r.status === "playing") {
            if (r.q_state === "reveal") setPhase("reveal");
            else setPhase("playing");
            // сбрасываем таймер и выбор при новом вопросе
            if (r.q_state === "answering") {
              setSelected(null);
              setTimeLeft(ANSWER_SECONDS);
            }
          }
        }
      )
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [room?.id]);

  // ---------- Таймер (только на reveal-фазе у хоста; у всех видимый) ----------
  useEffect(() => {
    if (phase !== "playing") return;
    setTimeLeft(ANSWER_SECONDS);
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, room?.current_q]);

  // ---------- Очки ----------
  const q = questions[room?.current_q ?? 0];
  const computeScores = () => {
    return room?.scores ?? {};
  };

  const sortedPlayers = Object.entries(computeScores())
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
      {msg && !error && <div className="rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-sm px-4 py-3">{msg}</div>}

      {/* Лобби */}
      {phase === "lobby" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-stone-200 bg-white/70 p-5">
            <h3 className="font-bold text-lg">Создать комнату</h3>
            <p className="mt-1 text-sm text-stone-600">
              Вы будете хостом. До 4 друзей подключатся по коду.
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
            <p className="mt-1 text-sm text-stone-600">Введите код от хоста.</p>
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
              onClick={joinRoom}
              className="mt-4 w-full rounded-xl bg-stone-900 text-white font-semibold py-3 hover:bg-stone-700 transition"
            >
              ПОДКЛЮЧИТЬСЯ
            </button>
          </div>

          {room && (
            <div className="md:col-span-2 rounded-2xl border border-stone-200 bg-white/70 p-5">
              <h3 className="font-bold">Игроки в комнате ({room.players.length}/5)</h3>
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
                <button
                  onClick={startGame}
                  disabled={room.players.length < 2}
                  className="mt-5 w-full rounded-xl bg-emerald-600 text-white font-bold py-3 hover:bg-emerald-500 disabled:opacity-40 transition"
                >
                  НАЧАТЬ ИГРУ ({TOTAL_QUESTIONS} вопросов)
                </button>
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
              <span className={`text-sm font-bold ${timeLeft <= 5 ? "text-red-600" : "text-stone-700"}`}>
                ⏱ {timeLeft}с
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white/80 p-6">
            <h2 className="text-xl sm:text-2xl font-bold">{q.q}</h2>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correct;
                const isMine = selected === i;
                // Покажем правильный ответ сразу (все видят)
                return (
                  <button
                    key={i}
                    disabled={selected !== null}
                    onClick={() => lockAnswer(i)}
                    className={`rounded-xl border-2 px-4 py-4 text-left text-sm font-medium transition ${
                      isCorrect
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : isMine
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "border-stone-200 bg-white hover:border-stone-400"
                    } disabled:opacity-70`}
                  >
                    <span className="inline-block w-6 h-6 rounded-full bg-stone-100 text-stone-600 text-center leading-6 mr-2 text-xs font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

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

          {iAmHost && phase === "playing" && (
            <button
              onClick={revealAnswers}
              className="w-full rounded-xl bg-amber-500 text-white font-bold py-3 hover:bg-amber-400 transition"
            >
              ОТКРЫТЬ ОТВЕТЫ
            </button>
          )}
          {iAmHost && phase === "reveal" && (
            <button
              onClick={nextQuestion}
              className="w-full rounded-xl bg-stone-900 text-white font-bold py-3 hover:bg-stone-700 transition"
            >
              СЛЕДУЮЩИЙ ВОПРОС →
            </button>
          )}
          {!iAmHost && phase === "reveal" && (
            <div className="rounded-xl bg-stone-100 p-4 text-sm text-stone-600 text-center">
              Правильный ответ открыт. Ждём хоста…
            </div>
          )}
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
          <div className="mt-6 flex justify-center gap-3">
            <a href="/quiz/online" className="rounded-xl bg-stone-900 text-white px-6 py-3 text-sm font-semibold hover:bg-stone-700">
              ↩ В лобби
            </a>
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
