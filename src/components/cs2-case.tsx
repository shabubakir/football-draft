"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  CASES,
  CS2Case,
  OpenResult,
  TrackCell,
  RARITY_NAMES,
  RARITY_COLORS,
  RARITY_ODDS,
  rollCase,
  buildTrack,
  makeRng,
} from "@/lib/cs2";

const ITEM_W = 148; // card width (144px) + gap (4px)

// ---------- Item card component ----------
function ItemCard({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <div
      className="flex-shrink-0 flex flex-col items-center justify-center rounded-lg border overflow-hidden w-36 h-40"
      style={{
        borderColor: `${color}40`,
        background: `linear-gradient(160deg, ${color}18 0%, ${color}05 100%)`,
      }}
    >
      {/* Weapon silhouette */}
      <div className="flex-1 flex items-center justify-center px-2">
        <svg viewBox="0 0 80 28" className="w-24 h-7" fill="none">
          <rect x="2" y="10" width="52" height="8" rx="2" fill={color} opacity="0.55" />
          <rect x="52" y="12" width="24" height="5" rx="1.5" fill={color} opacity="0.35" />
          <rect x="10" y="17" width="10" height="10" rx="2" fill={color} opacity="0.25" />
          <rect x="2" y="8" width="6" height="4" rx="1" fill={color} opacity="0.4" />
        </svg>
      </div>
      <div
        className="w-full text-center px-1.5 py-1.5 text-[9px] leading-tight font-semibold line-clamp-2"
        style={{ color }}
      >
        {label}
      </div>
      <div
        className="h-1 w-full rounded-b-lg"
        style={{ background: color, opacity: 0.6 }}
      />
    </div>
  );
}

// ---------- Main component ----------
export function CS2CaseSimulator() {
  const [selectedCase, setSelectedCase] = useState<CS2Case>(CASES[0]);
  const [spinning, setSpinning] = useState(false);
  const [track, setTrack] = useState<TrackCell[]>([]);
  const [result, setResult] = useState<OpenResult | null>(null);
  const [resultIdx, setResultIdx] = useState(-1);
  const [history, setHistory] = useState<OpenResult[]>([]);
  const [showCasePicker, setShowCasePicker] = useState(false);
  const [search, setSearch] = useState("");

  const [offset, setOffset] = useState(0);
  const animRef = useRef<number | null>(null);

  const filteredCases = CASES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const stopAnimation = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  useEffect(() => () => stopAnimation(), [stopAnimation]);

  const openCase = useCallback(() => {
    if (spinning) return;

    const seed = `cs2-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const rng = makeRng(seed);

    // 1. Roll the result FIRST (real Valve odds)
    const res = rollCase(selectedCase, rng);
    // 2. Target position on the track (95..105 of 120)
    const targetIndex = 95 + Math.floor(rng() * 11);
    // 3. Build track with result placed exactly at targetIndex
    const { cells } = buildTrack(selectedCase, res, targetIndex, rng);

    setTrack(cells);
    setResult(null);
    setResultIdx(-1);
    setSpinning(true);

    // End offset: target card centered in the viewport (center card index = 5)
    const jitter = (rng() - 0.5) * ITEM_W * 0.5;
    const finalOffset = (targetIndex - 5) * ITEM_W + jitter;

    const DURATION = 5200;
    const startTime = performance.now();
    setOffset(0);

    // Ease-out: fast start, slow landing (like CS2)
    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased = easeOutQuint(progress);
      setOffset(-finalOffset * eased);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setResult(res);
        setResultIdx(targetIndex);
        setHistory((h) => [res, ...h].slice(0, 20));
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, [spinning, selectedCase]);

  // Keyboard shortcut: Space to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spinning) {
        e.preventDefault();
        openCase();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [spinning, openCase]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            CS2 <span className="text-[#ffd700]">CASES</span>
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Реальные шансы Valve · 42 кейса · 657 скинов · 1851 нож/перчатки
          </p>
        </div>

        {/* Case selector */}
        <div className="relative">
          <button
            onClick={() => setShowCasePicker(!showCasePicker)}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white hover:bg-white/10 transition flex items-center gap-2"
          >
            <span className="text-[#ffd700]">▣</span>
            {selectedCase.name}
            <span className="text-stone-500 ml-1">▼</span>
          </button>

          {showCasePicker && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-stone-900 border border-white/10 rounded-xl shadow-2xl z-50">
              <div className="p-2 border-b border-white/10 sticky top-0 bg-stone-900">
                <input
                  type="text"
                  placeholder="Поиск кейса..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#ffd700]/50"
                  autoFocus
                />
              </div>
              <div className="p-1">
                {filteredCases.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => {
                      setSelectedCase(c);
                      setShowCasePicker(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      c.name === selectedCase.name
                        ? "bg-[#ffd700]/20 text-[#ffd700]"
                        : "text-stone-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-stone-500 ml-2 text-xs">{c.year}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Odds bar */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.keys(RARITY_ODDS) as unknown as Array<keyof typeof RARITY_ODDS>).map(
          (k) => {
            const t = Number(k) as 0 | 1 | 2 | 3 | 4;
            return (
              <span
                key={k}
                className="px-2.5 py-1 rounded-md font-mono font-bold"
                style={{
                  color: RARITY_COLORS[t],
                  background: `${RARITY_COLORS[t]}15`,
                  border: `1px solid ${RARITY_COLORS[t]}30`,
                }}
              >
                {RARITY_NAMES[t]} {(RARITY_ODDS[t] * 100).toFixed(2)}%
              </span>
            );
          }
        )}
      </div>

      {/* Spin area */}
      <div className="relative">
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-[#ffd700] z-10 shadow-[0_0_10px_#ffd700]" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-[#ffd700] z-10" />

        {/* Track viewport */}
        <div
          className="overflow-hidden rounded-xl border border-white/10 bg-stone-950/80 h-48 sm:h-52 relative"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
          }}
        >
          {track.length > 0 ? (
            <div
              className="flex gap-1 items-center h-full px-1"
              style={{ transform: `translateX(${offset}px)`, willChange: "transform" }}
            >
              {track.map((cell, i) => {
                const isWin = !spinning && result !== null && i === resultIdx;
                return (
                  <div
                    key={i}
                    className={`transition-transform duration-300 ${isWin ? "scale-110 z-10" : ""}`}
                  >
                    <ItemCard label={cell.label} color={cell.color} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-stone-500">
              <div className="text-6xl mb-4">🎰</div>
              <p className="text-lg font-bold">Нажми ПРОКРУТИТЬ</p>
              <p className="text-sm mt-1">или нажми ПРОБЕЛ</p>
            </div>
          )}
        </div>

        {/* Result overlay */}
        {result && !spinning && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 z-20 pointer-events-none">
            <div
              className="text-center bg-stone-950/90 backdrop-blur rounded-xl px-6 py-3 border"
              style={{
                borderColor: `${RARITY_COLORS[result.tier]}60`,
                boxShadow: `0 0 30px ${RARITY_COLORS[result.tier]}30`,
              }}
            >
              <div
                className="text-xl sm:text-2xl font-black"
                style={{ color: RARITY_COLORS[result.tier] }}
              >
                {result.item}
              </div>
              <div
                className="text-xs font-bold mt-1 px-2.5 py-0.5 rounded-full inline-block"
                style={{
                  color: RARITY_COLORS[result.tier],
                  background: `${RARITY_COLORS[result.tier]}20`,
                }}
              >
                {RARITY_NAMES[result.tier]}
                {result.isSt && " · STATTRAK™"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Open button */}
      <div className="flex justify-center">
        <button
          onClick={openCase}
          disabled={spinning}
          className={`px-10 py-4 rounded-xl font-black text-lg tracking-wider transition-all ${
            spinning
              ? "bg-white/5 text-stone-600 cursor-not-allowed"
              : "bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-stone-950 hover:scale-105 shadow-lg shadow-[#ffd700]/20"
          }`}
        >
          {spinning ? "КРУТИМСЯ..." : "🎰 ПРОКРУТИТЬ"}
        </button>
      </div>

      {/* Case contents preview */}
      <div className="bg-white/[0.03] rounded-xl border border-white/5 p-4">
        <h3 className="text-sm font-bold text-stone-400 mb-3 uppercase tracking-wider">
          Содержимое: {selectedCase.name} ({selectedCase.items.length} + {selectedCase.rares.length})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {/* Covert */}
          {selectedCase.items.filter((i) => i.t === 3).map((i) => (
            <div
              key={i.n}
              className="px-2 py-1.5 rounded text-xs font-semibold truncate"
              style={{ color: RARITY_COLORS[3], background: `${RARITY_COLORS[3]}10` }}
            >
              {i.n}
            </div>
          ))}
          {/* Classified */}
          {selectedCase.items.filter((i) => i.t === 2).map((i) => (
            <div
              key={i.n}
              className="px-2 py-1.5 rounded text-xs font-semibold truncate"
              style={{ color: RARITY_COLORS[2], background: `${RARITY_COLORS[2]}10` }}
            >
              {i.n}
            </div>
          ))}
          {/* Restricted */}
          {selectedCase.items.filter((i) => i.t === 1).map((i) => (
            <div
              key={i.n}
              className="px-2 py-1.5 rounded text-xs truncate"
              style={{ color: RARITY_COLORS[1], background: `${RARITY_COLORS[1]}10` }}
            >
              {i.n}
            </div>
          ))}
          {/* Mil-Spec (first 8) */}
          {selectedCase.items.filter((i) => i.t === 0).slice(0, 8).map((i) => (
            <div
              key={i.n}
              className="px-2 py-1.5 rounded text-xs truncate text-stone-500"
              style={{ background: `${RARITY_COLORS[0]}08` }}
            >
              {i.n}
            </div>
          ))}
          {selectedCase.items.filter((i) => i.t === 0).length > 8 && (
            <div className="px-2 py-1.5 rounded text-xs text-stone-600">
              +{selectedCase.items.filter((i) => i.t === 0).length - 8} ещё
            </div>
          )}
          {/* Knives count */}
          <div
            className="px-2 py-1.5 rounded text-xs font-bold"
            style={{ color: RARITY_COLORS[4], background: `${RARITY_COLORS[4]}10` }}
          >
            🗡 {selectedCase.rares.length} ножей/перчаток
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white/[0.03] rounded-xl border border-white/5 p-4">
          <h3 className="text-sm font-bold text-stone-400 mb-3 uppercase tracking-wider">
            История (последние {history.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {history.map((h, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-md text-xs font-semibold"
                style={{
                  color: RARITY_COLORS[h.tier],
                  background: `${RARITY_COLORS[h.tier]}15`,
                  border: `1px solid ${RARITY_COLORS[h.tier]}30`,
                }}
              >
                {h.item}
                {h.isSt && " ★"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
