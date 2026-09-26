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

const ITEM_W = 148; // card width (w-36 = 144px) + gap-1 (4px)

// Measure the actual viewport center to align the marker with the winning card
function getViewportCenter(): number {
  if (typeof document === "undefined") return 500;
  const el = document.querySelector("[data-cs2-viewport]");
  if (el) return el.clientWidth / 2;
  return 500;
}

// ---------- Skin card for "items in case" grid ----------
function SkinCard({
  name,
  img,
  tier,
  count,
}: {
  name: string;
  img: string;
  tier: 0 | 1 | 2 | 3 | 4;
  count: number;
}) {
  const odds = RARITY_ODDS[tier] / count;
  const color = RARITY_COLORS[tier];
  const pipeIdx = name.indexOf(" | ");
  const weapon = pipeIdx > 0 ? name.slice(0, pipeIdx) : name;
  const finish = pipeIdx > 0 ? name.slice(pipeIdx + 3) : "";

  return (
    <div
      className="rounded-lg overflow-hidden border bg-stone-950/60 relative group"
      style={{ borderColor: `${color}35` }}
    >
      {/* Odds badge */}
      <div
        className="absolute top-1 right-1 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold"
        style={{ background: "rgba(0,0,0,0.75)", color }}
      >
        {(odds * 100).toFixed(odds * 100 < 0.1 ? 3 : 2)}%
      </div>
      {/* Image */}
      <div
        className="w-full aspect-square flex items-center justify-center p-2"
        style={{ background: `linear-gradient(180deg, ${color}0d 0%, #0a0a0a 100%)` }}
      >
        <img
          src={img}
          alt={name}
          className="max-w-full max-h-full object-contain"
          loading="lazy"
        />
      </div>
      {/* Name */}
      <div className="px-1.5 py-1 border-t" style={{ borderColor: `${color}20` }}>
        <div className="text-[10px] font-bold text-stone-200 truncate">{weapon}</div>
        {finish && (
          <div className="text-[9px] text-stone-500 truncate">{finish}</div>
        )}
      </div>
      {/* Rarity stripe */}
      <div className="h-1 w-full" style={{ background: color, opacity: 0.6 }} />
    </div>
  );
}

// ---------- Item card component ----------
function ItemCard({
  label,
  img,
  color,
  isWin,
}: {
  label: string;
  img: string;
  color: string;
  isWin?: boolean;
}) {
  return (
    <div
      className={`flex-shrink-0 flex flex-col rounded-lg border overflow-hidden w-36 h-44 transition-all duration-300 ${
        isWin ? "scale-110 shadow-xl z-10" : ""
      }`}
      style={{
        borderColor: isWin ? color : `${color}30`,
        boxShadow: isWin ? `0 0 25px ${color}60` : undefined,
        background: `linear-gradient(180deg, ${color}12 0%, #0a0a0a 40%)`,
      }}
    >
      {/* Skin image */}
      <div className="flex-1 flex items-center justify-center px-2 pt-2 overflow-hidden">
        <img
          src={img}
          alt={label}
          className="max-w-full max-h-full object-contain drop-shadow-lg"
          loading="lazy"
          style={{ filter: `drop-shadow(0 2px 8px ${color}40)` }}
        />
      </div>
      {/* Name */}
      <div
        className="px-1.5 py-1 text-[9px] leading-tight font-semibold text-center line-clamp-2"
        style={{ color }}
      >
        {label}
      </div>
      {/* Rarity bar */}
      <div className="h-1.5 w-full" style={{ background: color, opacity: 0.7 }} />
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
  const [tierFilter, setTierFilter] = useState<-1 | 0 | 1 | 2 | 3 | 4>(-1);

  const [offset, setOffset] = useState(0);
  const [hasOpened, setHasOpened] = useState(false);
  const animRef = useRef<number | null>(null);

  const filteredCases = CASES.filter((c) =>
    (c.name ?? "").toLowerCase().includes(search.toLowerCase())
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
    setHasOpened(true);

    const DURATION = 5200;

    // Start: first card at left edge
    setOffset(0);

    // After the track renders, measure the exact pixel position of the target card
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const trackEl = document.querySelector("[data-cs2-track]");
        const viewportEl = document.querySelector("[data-cs2-viewport]");
        if (!trackEl || !viewportEl) return;

        const cards = trackEl.querySelectorAll("[data-cs2-card]");
        const targetCard = cards[targetIndex];
        if (!targetCard) return;

        const trackRect = trackEl.getBoundingClientRect();
        const cardRect = targetCard.getBoundingClientRect();
        const viewportRect = viewportEl.getBoundingClientRect();

        // Where the card's center currently is (relative to viewport left)
        const cardCenterNow = cardRect.left + cardRect.width / 2 - viewportRect.left;
        // Where we want it: center of viewport
        const targetCenter = viewportRect.width / 2;
        // Offset to apply
        const finalOffset = cardCenterNow - targetCenter;

        const startTime = performance.now();
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
      });
    });
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
                      // Reset track & result when switching cases
                      setTrack([]);
                      setResult(null);
                      setResultIdx(-1);
                      setOffset(0);
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

      {/* Before first spin: big case image */}
      {!hasOpened && (
        <div className="relative flex flex-col items-center justify-center rounded-xl border border-white/10 bg-stone-950/80 py-10 sm:py-14">
          {selectedCase.img && (
            <img
              src={selectedCase.img}
              alt={selectedCase.name}
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain drop-shadow-2xl"
              style={{ filter: "drop-shadow(0 8px 32px rgba(255,215,0,0.2))" }}
            />
          )}
          <p className="text-stone-500 mt-4 text-sm">
            Нажми ПРОКРУТИТЬ <span className="text-stone-600">или ПРОБЕЛ</span>
          </p>
        </div>
      )}

      {/* Spin area: shown after first spin */}
      {hasOpened && (
        <div className="relative">
          {/* Center marker */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-[#ffd700] z-10 shadow-[0_0_10px_#ffd700]" />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-[#ffd700] z-10" />

          {/* Track viewport */}
          <div
            data-cs2-viewport
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
                data-cs2-track
                className="flex gap-1 items-center h-full px-1"
                style={{ transform: `translateX(${offset}px)`, willChange: "transform" }}
              >
                {track.map((cell, i) => {
                  const isWin = !spinning && result !== null && i === resultIdx;
                  return (
                    <div key={i} data-cs2-card>
                      <ItemCard
                        label={cell.label}
                        img={cell.img}
                        color={cell.color}
                        isWin={isWin}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {selectedCase.img && (
                  <img
                    src={selectedCase.img}
                    alt={selectedCase.name}
                    className="w-40 h-40 object-contain"
                  />
                )}
              </div>
            )}
          </div>

          {/* Result overlay */}
          {result && !spinning && (
            <div className="absolute inset-0 flex items-end justify-center pb-4 z-20 pointer-events-none">
              <div
                className="flex items-center gap-4 bg-stone-950/95 backdrop-blur rounded-xl px-5 py-3 border"
                style={{
                  borderColor: `${RARITY_COLORS[result.tier]}60`,
                  boxShadow: `0 0 40px ${RARITY_COLORS[result.tier]}40`,
                }}
              >
                <img
                  src={result.img}
                  alt={result.item}
                  className="w-24 h-24 object-contain drop-shadow-xl"
                  style={{ filter: `drop-shadow(0 0 12px ${RARITY_COLORS[result.tier]}60)` }}
                />
                <div>
                  <div
                    className="text-lg sm:text-xl font-black"
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
            </div>
          )}
        </div>
      )}

      {/* Spin button */}
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
          {spinning ? "КРУТИМСЯ..." : "ПРОКРУТИТЬ"}
        </button>
      </div>

      {/* Items in case — full grid with per-skin odds */}
      <div className="bg-white/[0.03] rounded-xl border border-white/5 p-4">
        <h3 className="text-sm font-bold text-stone-300 mb-3 uppercase tracking-wider">
          Предметы в кейсе · {selectedCase.name}
        </h3>

        {/* Tier filter tabs */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setTierFilter(-1)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
              tierFilter === -1
                ? "bg-white/15 border-white/30 text-white"
                : "border-white/10 text-stone-400 hover:bg-white/5"
            }`}
          >
            Все {selectedCase.items.length + selectedCase.rares.length}
          </button>
          {([3, 2, 1, 0] as const).map((t) => {
            const count = selectedCase.items.filter((i) => i.t === t).length;
            if (count === 0) return null;
            return (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                  tierFilter === t
                    ? "text-stone-950"
                    : "text-stone-300 hover:bg-white/5"
                }`}
                style={
                  tierFilter === t
                    ? { background: RARITY_COLORS[t], borderColor: RARITY_COLORS[t] }
                    : { borderColor: `${RARITY_COLORS[t]}40`, color: RARITY_COLORS[t] }
                }
              >
                {RARITY_NAMES[t]} {count}
              </button>
            );
          })}
          <button
            onClick={() => setTierFilter(4)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
              tierFilter === 4
                ? "text-stone-950"
                : "text-stone-300 hover:bg-white/5"
            }`}
            style={
              tierFilter === 4
                ? { background: RARITY_COLORS[4], borderColor: RARITY_COLORS[4] }
                : { borderColor: `${RARITY_COLORS[4]}40`, color: RARITY_COLORS[4] }
            }
          >
            Ножи {selectedCase.rares.length}
          </button>
        </div>

        {/* Skin grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {/* Covert */}
          {(tierFilter === -1 || tierFilter === 3) &&
            selectedCase.items.filter((i) => i.t === 3).map((i) => (
              <SkinCard key={i.n} name={i.n} img={i.img} tier={3} count={selectedCase.items.filter((x) => x.t === 3).length} />
            ))}
          {/* Classified */}
          {(tierFilter === -1 || tierFilter === 2) &&
            selectedCase.items.filter((i) => i.t === 2).map((i) => (
              <SkinCard key={i.n} name={i.n} img={i.img} tier={2} count={selectedCase.items.filter((x) => x.t === 2).length} />
            ))}
          {/* Restricted */}
          {(tierFilter === -1 || tierFilter === 1) &&
            selectedCase.items.filter((i) => i.t === 1).map((i) => (
              <SkinCard key={i.n} name={i.n} img={i.img} tier={1} count={selectedCase.items.filter((x) => x.t === 1).length} />
            ))}
          {/* Mil-Spec */}
          {(tierFilter === -1 || tierFilter === 0) &&
            selectedCase.items.filter((i) => i.t === 0).map((i) => (
              <SkinCard key={i.n} name={i.n} img={i.img} tier={0} count={selectedCase.items.filter((x) => x.t === 0).length} />
            ))}
          {/* Knives / gloves */}
          {(tierFilter === -1 || tierFilter === 4) &&
            selectedCase.rares.map((r) => (
              <SkinCard key={r.n} name={r.n} img={r.img} tier={4} count={selectedCase.rares.length} />
            ))}
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
