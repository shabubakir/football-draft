"use client";

// ============================================================
// CS2 MAP GUESS — dark tactical client
// Modes: "guess" (10 rounds, pick map from 8) and "where"
// (minimap + place point, distance scoring).
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Nav } from "@/components/nav";
import { useProgression } from "@/lib/progression/use-progression";
import {
  type Difficulty,
  type GameMode,
  type MapLocation,
  type MapShape,
  MAP_NAMES,
  TOTAL_ROUNDS,
  WHERE_TOTAL_ROUNDS,
  scoreCorrect,
  scoreDistance,
  distanceBetween,
  pickRoundLocations,
  getMinimapShapes,
  type MinimapShape,
} from "@/lib/cs2-map-guess";

// ---------- Guest stats (localStorage) ----------

const GUEST_KEY = "cs2-map-guest-stats-v1";

interface GuestStats {
  gamesPlayed: number;
  bestScore: number;
  totalCorrect: number;
  totalRounds: number;
  bestStreak: number;
}

function loadGuestStats(): GuestStats {
  if (typeof window === "undefined") return emptyGuest();
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (!raw) return emptyGuest();
    const p = JSON.parse(raw) as Partial<GuestStats>;
    return {
      gamesPlayed: Number(p.gamesPlayed) || 0,
      bestScore: Number(p.bestScore) || 0,
      totalCorrect: Number(p.totalCorrect) || 0,
      totalRounds: Number(p.totalRounds) || 0,
      bestStreak: Number(p.bestStreak) || 0,
    };
  } catch {
    return emptyGuest();
  }
}

function emptyGuest(): GuestStats {
  return { gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalRounds: 0, bestStreak: 0 };
}

function saveGuestStats(s: GuestStats) {
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

// ---------- Shape renderers ----------

function ShapeEl({ s }: { s: MapShape }) {
  switch (s.type) {
    case "rect":
      return (
        <rect
          x={s.x}
          y={s.y}
          width={s.w}
          height={s.h}
          rx={s.rx ?? 0}
          fill={s.fill}
        />
      );
    case "circle":
      return <circle cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} />;
    case "line":
      return (
        <line
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={s.stroke}
          strokeWidth={s.width / 100}
        />
      );
    case "text":
      return (
        <text
          x={s.x}
          y={s.y}
          fontSize={s.size / 100}
          fill={s.fill}
          textAnchor={s.anchor ?? "middle"}
          fontFamily="monospace"
        >
          {s.text}
        </text>
      );
  }
}

function ScreenshotView({ loc }: { loc: MapLocation }) {
  return (
    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-cyan-500/30 bg-[#0b0d12]">
      <svg viewBox="0 0 1 1" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <rect x="0" y="0" width="1" height="1" fill="#0b0d12" />
        {/* Tactical grid */}
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={(i + 1) * 0.1}
            y1="0"
            x2={(i + 1) * 0.1}
            y2="1"
            stroke="rgba(34,211,238,0.06)"
            strokeWidth="0.002"
          />
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1="0"
            y1={(i + 1) * 0.2}
            x2="1"
            y2={(i + 1) * 0.2}
            stroke="rgba(34,211,238,0.06)"
            strokeWidth="0.002"
          />
        ))}
        {loc.shapes.map((s, i) => (
          <ShapeEl key={i} s={s} />
        ))}
        {/* Location marker */}
        <circle cx={loc.x} cy={loc.y} r="0.018" fill="none" stroke={loc.accent} strokeWidth="0.004" />
        <circle cx={loc.x} cy={loc.y} r="0.007" fill={loc.accent} />
        {/* Crosshair at center */}
        <g stroke={loc.accent} strokeWidth="0.003" opacity="0.9">
          <line x1="0.47" y1="0.5" x2="0.53" y2="0.5" />
          <line x1="0.5" y1="0.47" x2="0.5" y2="0.53" />
        </g>
        <circle cx="0.5" cy="0.5" r="0.012" fill="none" stroke={loc.accent} strokeWidth="0.002" opacity="0.7" />
      </svg>
      {/* HUD corner labels */}
      <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400/70 uppercase tracking-widest">
        TACTICAL FEED
      </div>
      <div className="absolute top-2 right-2 text-[10px] font-mono text-cyan-400/40">
        ● LIVE
      </div>
      <div className="absolute bottom-2 left-2 text-[10px] font-mono text-white/30">
        {loc.difficulty.toUpperCase()}
      </div>
    </div>
  );
}

function MinimapView({
  map,
  point,
  correct,
  showLine,
  onSvgClick,
  svgRef,
}: {
  map: string;
  point: { x: number; y: number } | null;
  correct: { x: number; y: number } | null;
  showLine: boolean;
  onSvgClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}) {
  const shapes = getMinimapShapes(map);
  return (
    <svg
      ref={svgRef}
      onClick={onSvgClick}
      viewBox="0 0 1 1"
      className="w-full aspect-square rounded-xl border border-cyan-500/25 bg-[#0b0d12]"
      preserveAspectRatio="xMidYMid meet"
      style={{ cursor: onSvgClick ? "crosshair" : "default" }}
    >
      {shapes.map((s: MinimapShape, i: number) => {
        if (s.type === "rect") {
          return (
            <rect
              key={i}
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              rx={s.rx ?? 0}
              fill={s.fill}
              stroke="rgba(34,211,238,0.15)"
              strokeWidth="0.003"
            />
          );
        }
        if (s.type === "circle") {
          return (
            <circle
              key={i}
              cx={s.cx}
              cy={s.cy}
              r={s.r}
              fill={s.fill}
              stroke="rgba(34,211,238,0.15)"
              strokeWidth="0.003"
            />
          );
        }
        if (s.type === "line") {
          return (
            <line
              key={i}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={s.stroke}
              strokeWidth={s.strokeWidth ?? 0.005}
            />
          );
        }
        if (s.type === "path") {
          return (
            <path
              key={i}
              d={s.d}
              fill={s.fill ?? "none"}
              stroke={s.stroke}
              strokeWidth={s.strokeWidth ?? 0.005}
              opacity={s.opacity ?? 1}
            />
          );
        }
        return null;
      })}
      {/* Grid overlay */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={`gv${i}`}
          x1={(i + 1) * 0.1}
          y1="0"
          x2={(i + 1) * 0.1}
          y2="1"
          stroke="rgba(34,211,238,0.05)"
          strokeWidth="0.002"
        />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={`gh${i}`}
          x1="0"
          y1={(i + 1) * 0.1}
          x2="1"
          y2={(i + 1) * 0.1}
          stroke="rgba(34,211,238,0.05)"
          strokeWidth="0.002"
        />
      ))}
      {/* Correct point + line */}
      {correct && (
        <g>
          {showLine && point && (
            <line
              x1={point.x}
              y1={point.y}
              x2={correct.x}
              y2={correct.y}
              stroke="#f97316"
              strokeWidth="0.006"
              strokeDasharray="0.02 0.015"
            />
          )}
          <circle cx={correct.x} cy={correct.y} r="0.02" fill="none" stroke="#22d3ee" strokeWidth="0.006" />
          <circle cx={correct.x} cy={correct.y} r="0.008" fill="#22d3ee" />
        </g>
      )}
      {/* Player point */}
      {point && (
        <g>
          <circle cx={point.x} cy={point.y} r="0.018" fill="none" stroke="#f97316" strokeWidth="0.005" />
          <circle cx={point.x} cy={point.y} r="0.006" fill="#f97316" />
        </g>
      )}
    </svg>
  );
}

// ---------- Game state ----------

type Phase = "menu" | "playing" | "result";

interface RoundOutcome {
  correct: boolean;
  points: number;
  location?: string;
  chosen?: string;
  dist?: number;
}

export function MapGuessClient() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<GameMode>("guess");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [roundIdx, setRoundIdx] = useState(0);
  const [rounds, setRounds] = useState<MapLocation[]>([]);
  const [score, setScore] = useState(0);
  const [outcomes, setOutcomes] = useState<RoundOutcome[]>([]);
  const [feedback, setFeedback] = useState<RoundOutcome | null>(null);
  // Where mode
  const [placedPoint, setPlacedPoint] = useState<{ x: number; y: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const { reportResult } = useProgression();
  const [guest, setGuest] = useState<GuestStats>(emptyGuest());

  const totalRounds = mode === "guess" ? TOTAL_ROUNDS : WHERE_TOTAL_ROUNDS;
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setGuest(loadGuestStats());
  }, []);

  // ---------- Start game ----------
  const startGame = useCallback(() => {
    const pool: MapLocation[] = [];
    const used = new Set<string>();
    for (let i = 0; i < totalRounds; i++) {
      const batch = pickRoundLocations(difficulty, 1, used);
      const l = batch[0];
      if (!l) break;
      used.add(l.id);
      pool.push(l);
    }
    setRounds(pool);
    setRoundIdx(0);
    setScore(0);
    setOutcomes([]);
    setFeedback(null);
    setPlacedPoint(null);
    setConfirmed(false);
    setPhase("playing");
  }, [difficulty, totalRounds]);

  // ---------- Guess mode answer ----------
  const answerGuess = useCallback(
    (mapName: string) => {
      if (phase !== "playing" || mode !== "guess" || !rounds[roundIdx] || feedback) return;
      const loc = rounds[roundIdx];
      const correct = mapName === loc.map;
      const points = correct ? scoreCorrect() : 0;
      const outcome: RoundOutcome = { correct, points, location: loc.location, chosen: mapName };
      setFeedback(outcome);
      setOutcomes((prev) => [...prev, outcome]);
      setScore((s) => s + points);
    },
    [phase, mode, rounds, roundIdx, feedback]
  );

  // ---------- Where mode ----------
  const onMinimapClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (confirmed) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const vbW = 1;
      const vbH = 1;
      // Account for "meet" letterboxing: scale + offset
      const scale = Math.min(rect.width / vbW, rect.height / vbH);
      const offX = (rect.width - scale * vbW) / 2;
      const offY = (rect.height - scale * vbH) / 2;
      const x = (e.clientX - rect.left - offX) / scale;
      const y = (e.clientY - rect.top - offY) / scale;
      setPlacedPoint({
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
      });
    },
    [confirmed]
  );

  const confirmPoint = useCallback(() => {
    if (!placedPoint || confirmed || phase !== "playing" || mode !== "where") return;
    const loc = rounds[roundIdx];
    if (!loc) return;
    const dist = distanceBetween(placedPoint.x, placedPoint.y, loc.x, loc.y);
    const points = scoreDistance(dist);
    const correct = dist <= 0.15;
    const outcome: RoundOutcome = { correct, points, location: loc.location, dist };
    setConfirmed(true);
    setFeedback(outcome);
    setOutcomes((prev) => [...prev, outcome]);
    setScore((s) => s + points);
  }, [placedPoint, confirmed, phase, mode, rounds, roundIdx]);

  // ---------- Next round / finish ----------
  const nextRound = useCallback(() => {
    setFeedback(null);
    setPlacedPoint(null);
    setConfirmed(false);
    if (roundIdx + 1 >= totalRounds) {
      finishGame();
    } else {
      setRoundIdx((i) => i + 1);
    }
  }, [roundIdx, totalRounds]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const finishGame = useCallback(() => {
    const correctCount = outcomes.filter((o) => o.correct).length;
    const streak = useMemoStreak(outcomes);
    const won = correctCount >= totalRounds / 2;

    // Guest stats
    const nextGuest: GuestStats = {
      gamesPlayed: guest.gamesPlayed + 1,
      bestScore: Math.max(guest.bestScore, score),
      totalCorrect: guest.totalCorrect + correctCount,
      totalRounds: guest.totalRounds + totalRounds,
      bestStreak: Math.max(guest.bestStreak, streak),
    };
    setGuest(nextGuest);
    saveGuestStats(nextGuest);

    // Progression
    void reportResult({
      gameId: "cs2-map-guess",
      won,
      score,
      metadata: {
        correct: correctCount,
        wrong: totalRounds - correctCount,
        streak,
        mode: mode === "guess" ? 1 : 2,
        difficulty: difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3,
      },
    });

    setPhase("result");
  }, [outcomes, score, guest, totalRounds, difficulty, mode, reportResult]);

  const restart = useCallback(() => {
    setPhase("menu");
    setFeedback(null);
    setOutcomes([]);
    setPlacedPoint(null);
    setConfirmed(false);
    setScore(0);
    setRoundIdx(0);
  }, []);

  const loc = rounds[roundIdx];

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: "linear-gradient(180deg, #0b0d12 0%, #10141c 50%, #0b0d12 100%)",
      }}
    >
      {/* Background pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(34,211,238,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(34,211,238,0.04) 40px)",
        }}
      />
      <Nav dark />
      <div className="relative max-w-5xl mx-auto px-4 pb-16">
        {/* HUD header */}
        <div className="mt-6 mb-6 rounded-2xl border border-cyan-500/25 bg-white/[0.03] px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-widest text-cyan-300">
                CS2 <span className="text-orange-400">MAP GUESS</span>
              </h1>
              <p className="text-[11px] font-mono text-white/40 tracking-widest uppercase mt-0.5">
                {mode === "guess" ? "GUESS THE MAP" : "WHERE EXACTLY?"} ·{" "}
                {difficulty.toUpperCase()}
              </p>
            </div>
            {phase === "playing" && (
              <div className="flex items-center gap-4 font-mono text-sm">
                <div className="text-white/50">
                  ROUND <span className="text-cyan-300 font-bold">{Math.min(roundIdx + 1, totalRounds)}/{totalRounds}</span>
                </div>
                <div className="text-white/50">
                  SCORE <span className="text-orange-400 font-bold text-lg">{score}</span>
                </div>
              </div>
            )}
          </div>
          {/* Progress bar */}
          {phase === "playing" && (
            <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-300"
                style={{ width: `${((roundIdx + (feedback ? 1 : 0)) / totalRounds) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* MENU */}
        {phase === "menu" && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => setMode("guess")}
                className={`text-left rounded-2xl border p-5 transition ${
                  mode === "guess"
                    ? "border-cyan-400 bg-cyan-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-cyan-500/40"
                }`}
              >
                <div className="text-lg font-bold tracking-wider">GUESS THE MAP</div>
                <p className="text-sm text-white/50 mt-1">
                  10 раундов. Посмотри тактический скриншот и выбери карту из 8. +100 за верный ответ.
                </p>
              </button>
              <button
                onClick={() => setMode("where")}
                className={`text-left rounded-2xl border p-5 transition ${
                  mode === "where"
                    ? "border-orange-400 bg-orange-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-orange-500/40"
                }`}
              >
                <div className="text-lg font-bold tracking-wider">WHERE EXACTLY?</div>
                <p className="text-sm text-white/50 mt-1">
                  Скриншот + миникарта. Поставь точку в нужное место и нажми CONFIRM. Чем ближе — тем больше очков.
                </p>
              </button>
            </div>

            {/* Difficulty */}
            <div>
              <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Сложность</div>
              <div className="flex gap-2">
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-4 py-2 rounded-lg font-mono text-sm uppercase tracking-wider border transition ${
                      difficulty === d
                        ? "border-cyan-400 bg-cyan-500/15 text-cyan-300"
                        : "border-white/10 bg-white/[0.03] text-white/50 hover:border-cyan-500/40"
                    }`}
                  >
                    {d === "easy" ? "Легко" : d === "medium" ? "Средне" : "Сложно"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full sm:w-auto px-10 py-3.5 rounded-xl font-bold tracking-widest text-white transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}
            >
              ▶ НАЧАТЬ
            </button>

            {/* Guest stats */}
            {guest.gamesPlayed > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">
                  Твоя статистика (гость)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-cyan-300">{guest.gamesPlayed}</div>
                    <div className="text-[10px] text-white/40">ИГР</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-400">{guest.bestScore}</div>
                    <div className="text-[10px] text-white/40">РЕКОРД</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">
                      {guest.totalRounds > 0
                        ? Math.round((guest.totalCorrect / guest.totalRounds) * 100)
                        : 0}
                      %
                    </div>
                    <div className="text-[10px] text-white/40">ТОЧНОСТЬ</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-cyan-300">{guest.bestStreak}</div>
                    <div className="text-[10px] text-white/40">СЕРИЯ</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PLAYING */}
        {phase === "playing" && loc && (
          <div className="space-y-5">
            {/* Screenshot */}
            <ScreenshotView loc={loc} />

            {/* Feedback banner */}
            {feedback && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm font-mono flex items-center gap-3 ${
                  feedback.correct
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                }`}
              >
                <span className="text-lg">{feedback.correct ? "✔" : "✘"}</span>
                <span>
                  {feedback.correct ? "ВЕРНО" : "МИМО"} · {feedback.location} · +{feedback.points}
                  {feedback.dist !== undefined && (
                    <span className="text-white/50"> · dist {Math.round(feedback.dist * 100)}%</span>
                  )}
                </span>
              </div>
            )}

            {/* Guess mode: map buttons */}
            {mode === "guess" && !feedback && (
              <div>
                <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">
                  Какая это карта?
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MAP_NAMES.map((m) => (
                    <button
                      key={m}
                      onClick={() => answerGuess(m)}
                      className="px-3 py-3 rounded-lg font-mono text-sm tracking-wider border border-white/10 bg-white/[0.03] text-white/70 hover:border-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Where mode: minimap + confirm */}
            {mode === "where" && (
              <div className="space-y-3">
                {!confirmed ? (
                  <>
                    <div className="text-xs font-mono text-white/40 uppercase tracking-widest">
                      {placedPoint
                        ? "Точка поставлена. Жми CONFIRM."
                        : "Кликни по миникарте, чтобы поставить точку"}
                    </div>
                    <MinimapView
                      map={loc.map}
                      point={placedPoint}
                      correct={null}
                      showLine={false}
                      onSvgClick={onMinimapClick}
                      svgRef={svgRef}
                    />
                    <button
                      onClick={confirmPoint}
                      disabled={!placedPoint}
                      className="px-8 py-3 rounded-xl font-bold tracking-widest text-white transition disabled:opacity-40 hover:brightness-110"
                      style={{ background: "linear-gradient(135deg, #ea580c, #c2410c)" }}
                    >
                      CONFIRM
                    </button>
                  </>
                ) : (
                  <>
                    <MinimapView
                      map={loc.map}
                      point={placedPoint}
                      correct={{ x: loc.x, y: loc.y }}
                      showLine
                    />
                  </>
                )}
              </div>
            )}

            {/* Next button */}
            {feedback && (
              <button
                onClick={nextRound}
                className="px-8 py-3 rounded-xl font-bold tracking-widest text-white transition hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}
              >
                {roundIdx + 1 >= totalRounds ? "РЕЗУЛЬТАТ →" : "ДАЛЬШЕ →"}
              </button>
            )}
          </div>
        )}

        {/* RESULT */}
        {phase === "result" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-cyan-500/25 bg-white/[0.03] p-8 text-center">
              <div className="font-mono text-xs text-white/40 uppercase tracking-widest">Итог · {totalRounds} раундов</div>
              <div className="text-5xl font-black text-cyan-300 my-3">{score}</div>
              <div className="text-sm text-white/50 mb-5">
                Верно: <span className="text-emerald-400 font-bold">{outcomes.filter((o) => o.correct).length}</span> /{" "}
                {totalRounds} · Ошибки: <span className="text-rose-400 font-bold">{outcomes.filter((o) => !o.correct).length}</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {outcomes.map((o, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-mono border ${
                      o.correct
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "border-rose-500/40 bg-rose-500/15 text-rose-300"
                    }`}
                    title={`Раунд ${i + 1}: ${o.location ?? ""} +${o.points}`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={restart}
                className="px-6 py-3 rounded-xl font-bold tracking-widest text-white transition hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}
              >
                ↻ ЕЩЁ РАЗ
              </button>
              <button
                onClick={() => setPhase("menu")}
                className="px-6 py-3 rounded-xl font-bold tracking-widest text-white/60 border border-white/10 hover:text-white hover:border-white/30 transition"
              >
                МЕНЮ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Streak helper ----------
function useMemoStreak(outcomes: RoundOutcome[]): number {
  let best = 0;
  let cur = 0;
  for (const o of outcomes) {
    if (o.correct) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}
