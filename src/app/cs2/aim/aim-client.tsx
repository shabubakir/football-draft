"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { playClick, preloadSounds, setMuted } from "@/lib/audio";
import { useProgression } from "@/lib/progression/use-progression";

// ---------- Константы ----------
const ROUND_SECONDS = 30;
// 4 тира мишеней: чем меньше — тем больше очков
const TIER = [
  { d: 130, color: "#4b69ff", pts: 3 }, // blue — самая частая
  { d: 100, color: "#8847ff", pts: 3 }, // purple
  { d: 70, color: "#d32ce6", pts: 5 }, // pink
  { d: 50, color: "#eb4b4b", pts: 7 }, // red — редкая, самая точная
] as const;
const TIER_WEIGHTS = [130, 100, 70, 50] as const; // сумма 350

type Phase = "idle" | "countdown" | "playing" | "finished";

type AimStats = {
  gamesPlayed: number;
  bestScore: number;
  bestReaction: number; // ms (меньше = лучше)
  bestAccuracy: number; // %
};

const AIM_KEY = "cs2-aim-stats-v1";

function loadAim(): AimStats {
  if (typeof window === "undefined") return emptyAim();
  try {
    const raw = window.localStorage.getItem(AIM_KEY);
    if (!raw) return emptyAim();
    const p = JSON.parse(raw);
    return {
      gamesPlayed: Number(p.gamesPlayed) || 0,
      bestScore: Number(p.bestScore) || 0,
      bestReaction: Number(p.bestReaction) || 0,
      bestAccuracy: Number(p.bestAccuracy) || 0,
    };
  } catch {
    return emptyAim();
  }
}
function emptyAim(): AimStats {
  return { gamesPlayed: 0, bestScore: 0, bestReaction: 0, bestAccuracy: 0 };
}
function saveAim(s: AimStats) {
  try {
    window.localStorage.setItem(AIM_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

type Result = {
  hits: number;
  misses: number;
  accuracy: number; // %
  avgMs: number;
  bestMs: number;
  score: number;
};

export function CS2AimClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(3);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [target, setTarget] = useState<{ x: number; y: number; tier: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [stats, setStats] = useState<AimStats>(emptyAim());
  const [soundOn, setSoundOn] = useState(true);

  const { reportResult } = useProgression();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reactTimesRef = useRef<number[]>([]);
  const spawnAtRef = useRef(0);
  const runningRef = useRef(false);
  const lastClickRef = useRef(0); // анти-двойной-клик (60ms)
  const hitsRef = useRef(0);
  const missRef = useRef(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    preloadSounds();
    setStats(loadAim());
  }, []);

  // ---------- Мишень: позиция в % от арены, не вылезает за края ----------
  const spawnTarget = useCallback(() => {
    const w = Math.random() * 350;
    let tier = 0;
    if (w < 130) tier = 0;
    else if (w < 230) tier = 1;
    else if (w < 300) tier = 2;
    else tier = 3;

    const t = TIER[tier];
    // Поле, чтобы мишень (диаметр t.d px) не вылезла: считаем в %
    // На мобильной ширине 360px: d=130 → 36% → pad 18%. Это ок.
    const arenaW = arenaWRef.current ?? 600;
    const padPct = (t.d / 2 / arenaW) * 100 + 1;
    const x = padPct + Math.random() * (100 - padPct * 2);
    const y = padPct + Math.random() * (100 - padPct * 2);
    spawnAtRef.current = performance.now();
    setTarget({ x, y, tier });
  }, []);

  const arenaWRef = useRef<number>(0);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    const measure = () => {
      arenaWRef.current = el.clientWidth;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stopTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (cdRef.current) {
      clearInterval(cdRef.current);
      cdRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimers(), [stopTimers]);

  // ---------- Старт ----------
  const startGame = useCallback(() => {
    if (runningRef.current || phase === "countdown") return;
    playClick();
    setPhase("countdown");
    setCount(3);
    setScore(0);
    setHits(0);
    setMisses(0);
    setTarget(null);
    setResult(null);
    setTimeLeft(ROUND_SECONDS);
    reactTimesRef.current = [];
    hitsRef.current = 0;
    missRef.current = 0;
    scoreRef.current = 0;
    lastClickRef.current = 0;

    let c = 3;
    cdRef.current = setInterval(() => {
      c -= 1;
      setCount(c);
      if (c <= 0) {
        if (cdRef.current) {
          clearInterval(cdRef.current);
          cdRef.current = null;
        }
        setPhase("playing");
        runningRef.current = true;
        spawnTarget();

        const startedAt = Date.now();
        timerRef.current = setInterval(() => {
          const left = ROUND_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
          if (left <= 0) {
            stopTimers();
            runningRef.current = false;
            const rt = reactTimesRef.current;
            const hN = hitsRef.current;
            const mN = missRef.current;
            const sN = scoreRef.current;
            const total = hN + mN;
            const accuracy = total > 0 ? (hN / total) * 100 : 0;
            const avg = rt.length > 0 ? rt.reduce((a, b) => a + b, 0) / rt.length : 0;
            const best = rt.length > 0 ? Math.min(...rt) : 0;
            setResult({ hits: hN, misses: mN, accuracy, avgMs: avg, bestMs: best, score: sN });
            setTarget(null);
            setPhase("finished");

            // Статистика (localStorage)
            const prev = loadAim();
            const next: AimStats = {
              gamesPlayed: prev.gamesPlayed + 1,
              bestScore: Math.max(prev.bestScore, sN),
              bestReaction:
                best > 0 ? (prev.bestReaction > 0 ? Math.min(prev.bestReaction, best) : best) : prev.bestReaction,
              bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
            };
            setStats(next);
            saveAim(next);

            // Report to progression system
            void reportResult({
              gameId: "cs2-aim",
              won: sN >= 800,
              score: sN,
              metadata: {
                reaction: best > 0 ? Math.round(best) : 0,
                accuracy: Math.round(accuracy),
              },
            });
          } else {
            setTimeLeft(left);
          }
        }, 200);
      }
    }, 1000);
  }, [phase, spawnTarget, stopTimers]);

  // ---------- Попадание ----------
  const onTargetDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (!runningRef.current) return;
      const now = performance.now();
      if (now - lastClickRef.current < 60) return; // один клик = одно попадание
      lastClickRef.current = now;

      const rt = now - spawnAtRef.current;
      reactTimesRef.current.push(rt);
      const pts = TIER[target?.tier ?? 0].pts;
      hitsRef.current += 1;
      scoreRef.current += pts;
      setHits(hitsRef.current);
      setScore(scoreRef.current);
      playClick();
      spawnTarget();
    },
    [spawnTarget, target]
  );

  // ---------- Промах (клик мимо) ----------
  const onMissDown = useCallback(() => {
    if (!runningRef.current) return;
    const now = performance.now();
    if (now - lastClickRef.current < 60) return;
    lastClickRef.current = now;
    missRef.current += 1;
    setMisses(missRef.current);
  }, []);

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
              CS2 <span className="text-[#ffd700]">AIM</span>
            </h1>
            <p className="text-sm text-stone-400 mt-1">
              Кликай по мишеням {ROUND_SECONDS} секунд — считаем реакцию, точность и счёт
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

        {/* Личная статистика */}
        <div className="mt-4 grid grid-cols-4 gap-2 max-w-xl">
          <MiniStat label="Игр" value={String(stats.gamesPlayed)} />
          <MiniStat label="Best score" value={String(stats.bestScore)} accent="#ffd700" />
          <MiniStat label="Best react" value={stats.bestReaction > 0 ? `${stats.bestReaction.toFixed(0)}ms` : "—"} accent="#4ade80" />
          <MiniStat label="Best acc" value={stats.bestAccuracy > 0 ? `${stats.bestAccuracy.toFixed(0)}%` : "—"} accent="#8847ff" />
        </div>

        {/* HUD во время игры */}
        {phase === "playing" && (
          <div className="mt-4 grid grid-cols-4 gap-2 max-w-2xl mx-auto">
            <Hud label="TIME" value={`${timeLeft}s`} accent={timeLeft <= 5 ? "#ef4444" : "#fff"} />
            <Hud label="SCORE" value={String(score)} accent="#ffd700" />
            <Hud label="HITS" value={String(hits)} accent="#4ade80" />
            <Hud label="ACC" value={hits + misses > 0 ? `${((hits / (hits + misses)) * 100).toFixed(0)}%` : "—"} />
          </div>
        )}

        {/* Арена */}
        <div className="mt-5">
          <div
            ref={arenaRef}
            onPointerDown={onMissDown}
            className="relative w-full h-[55vh] min-h-[320px] max-h-[560px] rounded-xl border overflow-hidden select-none touch-none"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(255,215,0,0.04) 0%, rgba(10,10,10,0.9) 70%), #0a0a0a",
              borderColor: phase === "playing" ? "rgba(255,215,0,0.35)" : "rgba(255,255,255,0.1)",
              cursor: phase === "playing" ? "crosshair" : "default",
            }}
          >
            {/* сетка */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            {/* Мишень */}
            {phase === "playing" && target && (
              <div
                onPointerDown={onTargetDown}
                className="absolute z-10 cursor-crosshair"
                style={{
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                  width: TIER[target.tier].d,
                  height: TIER[target.tier].d,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${TIER[target.tier].color} 0%, ${TIER[target.tier].color}88 55%, transparent 72%)`,
                    boxShadow: `0 0 30px ${TIER[target.tier].color}66`,
                    animation: "aim-pop-in 0.12s ease-out",
                  }}
                >
                  <div
                    className="absolute rounded-full"
                    style={{
                      inset: "22%",
                      background: `radial-gradient(circle, #fff 0%, ${TIER[target.tier].color} 60%)`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Overlay: idle */}
            {phase === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-stone-950/60 backdrop-blur-[2px]">
                <div className="text-[10px] font-black tracking-[0.3em] text-[#ffd700] uppercase">
                  TACTICAL SHOOTER
                </div>
                <p className="text-stone-400 text-sm max-w-sm text-center px-6">
                  Попади в как можно больше мишеней за {ROUND_SECONDS} секунд. Чем быстрее реакция — тем выше счёт.
                </p>
                <button
                  onClick={startGame}
                  className="px-12 py-4 rounded-xl font-black text-lg tracking-wider bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-stone-950 hover:scale-105 transition shadow-lg shadow-[#ffd700]/20"
                >
                  START
                </button>
              </div>
            )}

            {/* Overlay: countdown */}
            {phase === "countdown" && (
              <div className="absolute inset-0 flex items-center justify-center bg-stone-950/70 backdrop-blur-sm">
                <div key={count} className="text-8xl font-black text-[#ffd700]" style={{ animation: "aim-pop-in 0.3s ease-out" }}>
                  {count}
                </div>
              </div>
            )}

            {/* Overlay: finished */}
            {phase === "finished" && result && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-stone-950/85 backdrop-blur-sm p-6">
                <div className="text-[10px] font-black tracking-[0.3em] text-[#ffd700] uppercase">
                  Result
                </div>
                <div className="text-5xl font-black text-white">{result.score}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-md">
                  <ResBox label="Hits" value={String(result.hits)} color="#4ade80" />
                  <ResBox label="Misses" value={String(result.misses)} color="#ef4444" />
                  <ResBox label="Accuracy" value={`${result.accuracy.toFixed(0)}%`} color="#8847ff" />
                  <ResBox label="Avg reaction" value={result.avgMs > 0 ? `${result.avgMs.toFixed(0)}ms` : "—"} color="#4b69ff" />
                  <ResBox label="Best reaction" value={result.bestMs > 0 ? `${result.bestMs.toFixed(0)}ms` : "—"} color="#d32ce6" />
                  <ResBox label="Score" value={String(result.score)} color="#ffd700" />
                </div>
                <button
                  onClick={startGame}
                  className="mt-2 px-10 py-3.5 rounded-xl font-black text-base tracking-wider bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-stone-950 hover:scale-105 transition shadow-lg shadow-[#ffd700]/20"
                >
                  PLAY AGAIN
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Подсказка */}
        {phase === "idle" && (
          <p className="text-center text-xs text-stone-600 mt-3">
            Работает и на ПК (мышь), и на мобильном (тап)
          </p>
        )}

        <style jsx global>{`
          @keyframes aim-pop-in {
            0% { transform: scale(0.4); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </main>
  );
}

// ---------- UI helpers ----------
function Hud({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-2.5 rounded-lg bg-white/[0.05] border border-white/10">
      <span className="text-[9px] font-black text-stone-500 tracking-widest">{label}</span>
      <span className="text-lg font-black" style={{ color: accent ?? "#fff" }}>
        {value}
      </span>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center px-2 py-2 rounded-lg bg-white/[0.04] border border-white/10">
      <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider truncate w-full text-center">{label}</span>
      <span className="text-sm font-black" style={{ color: accent ?? "#fff" }}>
        {value}
      </span>
    </div>
  );
}

function ResBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center py-3 rounded-lg border" style={{ background: `${color}12`, borderColor: `${color}40` }}>
      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">{label}</span>
      <span className="text-xl font-black" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
