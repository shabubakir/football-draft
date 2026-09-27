"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { RARITY_COLORS } from "@/lib/cs2";
import { playClick, playReveal, preloadSounds, setMuted, isMuted } from "@/lib/audio";

// ---------- Данные из API ----------
type PricedItem = { n: string; img: string; price: number };
type Round = { a: PricedItem; b: PricedItem };

const TOTAL_ROUNDS = 10;

// ---------- localStorage статистика ----------
type HLStats = {
  gamesPlayed: number;
  bestStreak: number;
  totalCorrect: number;
  totalWrong: number;
};

const HL_KEY = "cs2-hl-stats-v1";

function loadHL(): HLStats {
  if (typeof window === "undefined") return emptyHL();
  try {
    const raw = window.localStorage.getItem(HL_KEY);
    if (!raw) return emptyHL();
    const p = JSON.parse(raw);
    return {
      gamesPlayed: Number(p.gamesPlayed) || 0,
      bestStreak: Number(p.bestStreak) || 0,
      totalCorrect: Number(p.totalCorrect) || 0,
      totalWrong: Number(p.totalWrong) || 0,
    };
  } catch {
    return emptyHL();
  }
}
function emptyHL(): HLStats {
  return { gamesPlayed: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 };
}
function saveHL(s: HLStats) {
  try {
    window.localStorage.setItem(HL_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

// ---------- Разбор имени скина ----------
function splitName(name: string): { weapon: string; finish: string } {
  const idx = name.indexOf(" | ");
  if (idx <= 0) return { weapon: name, finish: "" };
  return { weapon: name.slice(0, idx), finish: name.slice(idx + 3) };
}

function fmtPrice(v: number): string {
  if (v >= 1000) return `$${v.toFixed(0)}`;
  if (v >= 100) return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

// ---------- Одна карточка скина ----------
function SkinPanel({
  item,
  price,
  revealed,
  isCorrect,
  dim,
}: {
  item: PricedItem;
  price: boolean;
  revealed: boolean;
  isCorrect?: boolean;
  dim?: boolean;
}) {
  const { weapon, finish } = splitName(item.n);
  const color = isCorrect ? "#4ade80" : RARITY_COLORS[2];
  return (
    <div
      className={`relative flex-1 min-w-0 rounded-xl border bg-stone-950/70 overflow-hidden transition-all duration-300 ${
        dim ? "opacity-40 scale-[0.98]" : ""
      }`}
      style={{
        borderColor: isCorrect
          ? "rgba(74,222,128,0.5)"
          : revealed
            ? "rgba(255,255,255,0.12)"
            : "rgba(255,215,0,0.25)",
        boxShadow: isCorrect ? "0 0 30px rgba(74,222,128,0.25)" : undefined,
      }}
    >
      <div
        className="aspect-square flex items-center justify-center p-4"
        style={{ background: "linear-gradient(180deg, rgba(255,215,0,0.06) 0%, #0a0a0a 100%)" }}
      >
        <img
          src={item.img}
          alt={item.n}
          className="max-w-full max-h-full object-contain drop-shadow-lg"
          loading="lazy"
        />
      </div>
      <div className="px-3 py-2 border-t border-white/10">
        <div className="text-xs sm:text-sm font-bold text-stone-200 truncate">{weapon}</div>
        {finish && (
          <div className="text-[10px] sm:text-xs font-semibold text-stone-400 truncate">{finish}</div>
        )}
        <div className="mt-1.5 h-6 flex items-center">
          {price ? (
            <span className="text-lg sm:text-xl font-black text-[#4ade80]">{fmtPrice(item.price)}</span>
          ) : (
            <span className="text-lg sm:text-xl font-black text-stone-600 tracking-widest">???</span>
          )}
        </div>
      </div>
      {revealed && isCorrect && (
        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#4ade80] flex items-center justify-center text-stone-950 font-black text-sm shadow-lg">
          ✓
        </div>
      )}
    </div>
  );
}

// ---------- Стат блок ----------
function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10">
      <span className="text-[9px] sm:text-[10px] font-bold text-stone-500 uppercase tracking-wider">{label}</span>
      <span className="text-base sm:text-lg font-black" style={{ color: accent ?? "#fff" }}>
        {value}
      </span>
    </div>
  );
}

export function CS2CompareClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<"ask" | "reveal" | "finished">("ask");
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreakRun, setBestStreakRun] = useState(0);
  // Бонус за близкие цены (<15% разницы): +1 дополнительно
  const [lastBonus, setLastBonus] = useState(false);
  const [history, setHistory] = useState<boolean[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [stats, setStats] = useState<HLStats>(emptyHL());
  const loadedStatsRef = useRef(false);

  useEffect(() => {
    preloadSounds();
    const s = loadHL();
    setStats(s);
    loadedStatsRef.current = true;
  }, []);

  // Загрузка раундов
  const fetchRounds = (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    fetch(`/api/cs2-compare?rounds=${TOTAL_ROUNDS}`)
      .then((r) => {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then((d) => {
        const rs: Round[] = d.rounds ?? [];
        if (rs.length < TOTAL_ROUNDS && silent) {
          // добираем недостающее
          fetch(`/api/cs2-compare?rounds=${TOTAL_ROUNDS - rs.length}`)
            .then((r2) => (r2.ok ? r2.json() : null))
            .then((d2) => {
              const extra = d2?.rounds ?? [];
              const all = [...rs, ...extra];
              setRounds(all.slice(0, TOTAL_ROUNDS));
              setLoading(false);
            })
            .catch(() => setLoading(false));
        } else {
          setRounds(rs.slice(0, TOTAL_ROUNDS));
          setLoading(false);
        }
      })
      .catch(() => {
        setError("Не удалось загрузить цены скинов. Попробуй ещё раз.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const round = rounds[roundIdx];
  const correctSide: "a" | "b" | null =
    round ? (round.a.price > round.b.price ? "a" : "b") : null;

  // Сохранение статистики при завершении
  const finishGame = (finalScore: number, finalBest: number, finalHistory: boolean[]) => {
    const next: HLStats = {
      gamesPlayed: stats.gamesPlayed + 1,
      bestStreak: Math.max(stats.bestStreak, finalBest),
      totalCorrect: stats.totalCorrect + finalHistory.filter(Boolean).length,
      totalWrong: stats.totalWrong + finalHistory.filter((x) => !x).length,
    };
    setStats(next);
    saveHL(next);
  };

  const pick = (side: "a" | "b") => {
    if (!round || phase !== "ask") return;
    playClick();
    setPicked(side);
    setPhase("reveal");
  };

  const nextRound = () => {
    if (!round) return;
    const wasCorrect = picked !== null && picked === correctSide;
    const bonus = wasCorrect && isClose; // +1 за близкие цены
    setLastBonus(bonus);
    const newScore = score + (wasCorrect ? (bonus ? 2 : 1) : 0);
    const newStreak = wasCorrect ? streak + 1 : 0;
    const newBest = Math.max(bestStreakRun, newStreak);
    const newHistory = [...history, wasCorrect];
    setScore(newScore);
    setStreak(newStreak);
    setBestStreakRun(newBest);
    setHistory(newHistory);
    setPicked(null);

    if (roundIdx + 1 >= rounds.length) {
      setPhase("finished");
      finishGame(newScore, newBest, newHistory);
    } else {
      setRoundIdx(roundIdx + 1);
      setPhase("ask");
    }
  };

  const restart = () => {
    setRoundIdx(0);
    setPhase("ask");
    setPicked(null);
    setScore(0);
    setStreak(0);
    setBestStreakRun(0);
    setHistory([]);
    setLastBonus(false);
    playClick();
    fetchRounds();
  };

  // Bonus: близкие цены (разница < 15%) → +1 бонус
  const diffPct = round
    ? Math.abs(round.a.price - round.b.price) / Math.max(round.a.price, round.b.price)
    : 1;
  const isClose = diffPct > 0 && diffPct < 0.15;

  return (
    <main className="min-h-screen bg-stone-950 text-white flex flex-col">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <Nav dark />
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        {/* Заголовок */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              CS2 <span className="text-[#ffd700]">HIGHER / LOWER</span>
            </h1>
            <p className="text-sm text-stone-400 mt-1">
              Какая цена выше? {TOTAL_ROUNDS} раундов · реальные цены скинов
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setMuted(!next);
              }}
              className="p-3 rounded-xl border text-lg transition"
              style={{
                background: soundOn ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)",
                borderColor: soundOn ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)",
              }}
            >
              {soundOn ? "🔊" : "🔇"}
            </button>
            <Link
              href="/cs2"
              className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-bold transition"
            >
              ← КЕЙСЫ
            </Link>
          </div>
        </div>

        {/* Статистика (localStorage) */}
        <div className="mt-4 grid grid-cols-4 gap-2 max-w-xl">
          <Stat label="Игр" value={String(stats.gamesPlayed)} />
          <Stat label="Лучший streak" value={String(stats.bestStreak)} accent="#ffd700" />
          <Stat label="Верно (всего)" value={String(stats.totalCorrect)} accent="#4ade80" />
          <Stat label="Ошибок (всего)" value={String(stats.totalWrong)} accent="#ef4444" />
        </div>

        {/* Загрузка */}
        {loading && (
          <div className="mt-10 rounded-xl border border-white/10 bg-stone-900/60 p-10 text-center">
            <div className="inline-block w-8 h-8 rounded-full border-2 border-[#ffd700] border-t-transparent animate-spin" />
            <p className="text-stone-400 mt-4 text-sm">Загружаем цены скинов…</p>
          </div>
        )}

        {error && !loading && (
          <div className="mt-10 rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <p className="text-red-300 font-bold">{error}</p>
            <button
              onClick={() => fetchRounds()}
              className="mt-4 px-6 py-3 rounded-xl bg-[#ffd700]/15 border border-[#ffd700]/40 text-sm font-bold text-[#ffd700] hover:bg-[#ffd700]/25 transition"
            >
              ПОВТОРИТЬ
            </button>
          </div>
        )}

        {/* ИГРА */}
        {!loading && !error && round && phase !== "finished" && (
          <div className="mt-6 space-y-5">
            {/* Прогресс + счёт */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-bold text-stone-400">
                ROUND <span className="text-white">{roundIdx + 1}</span> / {rounds.length}
              </div>
              <div className="flex items-center gap-2">
                <Stat label="Счёт" value={String(score)} accent="#ffd700" />
                <Stat label="Streak" value={String(streak)} accent="#4ade80" />
                <Stat label="Best" value={String(bestStreakRun)} accent="#8847ff" />
              </div>
            </div>

            {/* Прогресс-бар раундов */}
            <div className="flex gap-1">
              {rounds.map((_, i) => {
                const done = i < history.length;
                const cur = i === roundIdx;
                return (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full"
                    style={{
                      background: done
                        ? history[i]
                          ? "#4ade80"
                          : "#ef4444"
                        : cur
                          ? "#ffd700"
                          : "rgba(255,255,255,0.1)",
                    }}
                  />
                );
              })}
            </div>

            {/* Карточки A / B */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch">
              <SkinPanel
                item={round.a}
                price={phase !== "ask"}
                revealed={phase !== "ask"}
                isCorrect={phase === "reveal" && correctSide === "a"}
                dim={phase === "reveal" && picked === "b"}
              />
              <div className="flex items-center justify-center sm:py-2">
                <span className="text-2xl font-black text-stone-600">VS</span>
              </div>
              <SkinPanel
                item={round.b}
                price={phase !== "ask"}
                revealed={phase !== "ask"}
                isCorrect={phase === "reveal" && correctSide === "b"}
                dim={phase === "reveal" && picked === "a"}
              />
            </div>

            {phase === "ask" && (
              <>
                <p className="text-center text-sm font-bold text-stone-400 uppercase tracking-widest">
                  WHICH IS MORE EXPENSIVE?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => pick("a")}
                    className="py-4 rounded-xl font-black text-sm sm:text-base tracking-wider bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-stone-950 hover:scale-[1.02] transition shadow-lg shadow-[#ffd700]/20"
                  >
                    ← LEFT / A ДОРОЖЕ
                  </button>
                  <button
                    onClick={() => pick("b")}
                    className="py-4 rounded-xl font-black text-sm sm:text-base tracking-wider bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-stone-950 hover:scale-[1.02] transition shadow-lg shadow-[#ffd700]/20"
                  >
                    RIGHT / B ДОРОЖЕ →
                  </button>
                </div>
                {isClose && (
                  <p className="text-center text-xs text-stone-500">
                    💡 Цены близки — за верный ответ <b className="text-[#4ade80]">+1 бонус</b>
                  </p>
                )}
              </>
            )}

            {phase === "reveal" && (
              <div className="space-y-4">
                <div
                  className="rounded-xl border p-4 text-center"
                  style={{
                    borderColor:
                      picked === correctSide ? "rgba(74,222,128,0.5)" : "rgba(239,68,68,0.5)",
                    background:
                      picked === correctSide ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)",
                  }}
                >
                  <div
                    className="text-xl sm:text-2xl font-black"
                    style={{ color: picked === correctSide ? "#4ade80" : "#ef4444" }}
                  >
                    {picked === correctSide ? "✓ CORRECT" : "✗ WRONG"}
                  </div>
                  <div className="text-xs text-stone-400 mt-1">
                    {picked === correctSide
                      ? lastBonus
                        ? "+2 очка (близкие цены: +1 бонус)"
                        : "+1 очко"
                      : "Серия оборвана"}
                  </div>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      if (picked !== correctSide) playReveal(0);
                      nextRound();
                    }}
                    className="px-8 py-3.5 rounded-xl font-black text-sm tracking-wider bg-white/10 hover:bg-white/20 border border-white/10 transition"
                  >
                    {roundIdx + 1 >= rounds.length ? "ИТОГИ →" : "NEXT ROUND →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ФИНАЛ */}
        {!loading && !error && phase === "finished" && (
          <div className="mt-8 rounded-2xl border border-[#ffd700]/30 bg-gradient-to-br from-[#ffd700]/10 via-stone-950/60 to-stone-950/90 p-8 text-center space-y-5">
            <div className="text-[10px] font-black tracking-[0.3em] text-[#ffd700] uppercase">
              Итоги игры
            </div>
            <div className="text-5xl font-black text-white">
              {score}
              <span className="text-2xl text-stone-500"> / {rounds.length}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
              <Stat label="Streak" value={String(bestStreakRun)} accent="#4ade80" />
              <Stat label="Лучший" value={String(Math.max(stats.bestStreak, bestStreakRun))} accent="#ffd700" />
              <Stat label="Игр сыграно" value={String(stats.gamesPlayed)} />
            </div>
            <div className="flex justify-center gap-1">
              {history.map((ok, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black"
                  style={{
                    background: ok ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.2)",
                    color: ok ? "#4ade80" : "#ef4444",
                  }}
                >
                  {ok ? "✓" : "✗"}
                </div>
              ))}
            </div>
            <button
              onClick={restart}
              className="px-10 py-4 rounded-xl font-black text-lg tracking-wider bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-stone-950 hover:scale-105 transition shadow-lg shadow-[#ffd700]/20"
            >
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
