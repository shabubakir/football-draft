"use client";

// ============================================================
// REACTION TEST — Classic mode (5 attempts)
// Random wait 1500–5000 ms, performance.now() timing,
// anti-false-start, focus-loss handling, mouse/touch/Space.
// Architecture prepared for future modes (not implemented).
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Nav } from "@/components/nav";
import { useProgression } from "@/lib/progression/use-progression";
import {
  TOTAL_ATTEMPTS,
  MIN_DELAY_MS,
  MAX_DELAY_MS,
  scoreReaction,
  sanitizeReaction,
} from "@/lib/reaction-test";

// ---------- Guest stats (localStorage) ----------

const GUEST_KEY = "reaction-test-stats-v1";

interface GuestStats {
  gamesPlayed: number;
  bestReaction: number;
  totalAttempts: number;
  falseStarts: number;
  bestStreak: number;
}

function emptyGuest(): GuestStats {
  return { gamesPlayed: 0, bestReaction: 0, totalAttempts: 0, falseStarts: 0, bestStreak: 0 };
}

function loadGuestStats(): GuestStats {
  if (typeof window === "undefined") return emptyGuest();
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (!raw) return emptyGuest();
    const p = JSON.parse(raw) as Partial<GuestStats>;
    return {
      gamesPlayed: Number(p.gamesPlayed) || 0,
      bestReaction: Number(p.bestReaction) || 0,
      totalAttempts: Number(p.totalAttempts) || 0,
      falseStarts: Number(p.falseStarts) || 0,
      bestStreak: Number(p.bestStreak) || 0,
    };
  } catch {
    return emptyGuest();
  }
}

function saveGuestStats(s: GuestStats) {
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

// ---------- State machine ----------

type Phase = "idle" | "waiting" | "ready" | "counted" | "tooEarly" | "finished";
type AttemptResult = number | "early";

export function ReactionTestClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [attempt, setAttempt] = useState(0); // 0-based, 1..5 display
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [aborted, setAborted] = useState(false);

  const { reportResult } = useProgression();
  const [guest, setGuest] = useState<GuestStats>(emptyGuest());
  // Mirror of `guest` for use inside long-lived callbacks (finishTest reads
  // the CURRENT value at call time — no stale-closure risk, and finishTest
  // itself can stay referentially stable).
  const guestRef = useRef<GuestStats>(guest);
  guestRef.current = guest;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextAttemptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalAtRef = useRef(0);
  const lockedRef = useRef(false); // prevents double signals
  const phaseRef = useRef<Phase>("idle"); // mirrors `phase` for race-free reads
  // Keep in sync on every render, EXCEPT while between attempts (counted):
  // a fast follow-up input must NOT see "waiting" (that would be a false
  // start) before the 1300 ms pause elapses.
  if (phase !== "counted") phaseRef.current = phase;
  const attemptRef = useRef(0); // mirrors `attempt` for race-free reads
  attemptRef.current = attempt;
  const attemptsRef = useRef<AttemptResult[]>([]);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const falseStartsRef = useRef(0);

  useEffect(() => {
    setGuest(loadGuestStats());
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (nextAttemptTimer.current) {
      clearTimeout(nextAttemptTimer.current);
      nextAttemptTimer.current = null;
    }
  }, []);

  // startAttempt is referentially STABLE (deps []): it only touches refs,
  // setters and clearTimer (also stable). Everything else in the state
  // machine routes through it via startAttemptRef, so the 1300 ms
  // next-attempt timer can never fire a stale closure.
  const startAttempt = useCallback(() => {
    lockedRef.current = false;
    setAborted(false);
    clearTimer();
    // The "ready" transition is also routed through a ref so that a green
    // timer armed by a previous (now stale) closure still lands on the
    // FRESH phase state: this fires setPhase via the always-current
    // setter path, never through a captured closure.
    setPhase("waiting");
    // Random delay 1500–5000 ms. Re-arms on every call, so a retry that
    // starts before the previous attempt's green timer fires replaces it
    // instead of stacking (a stale timer would fire "ready" on top of a
    // fresh attempt and leave the game stuck).
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    timerRef.current = setTimeout(() => {
      signalAtRef.current = performance.now();
      setPhase("ready");
    }, delay);
  }, [clearTimer]);
  const startAttemptRef = useRef(startAttempt);
  startAttemptRef.current = startAttempt;

  // Begin the full test — referentially STABLE (deps []).
  const startTest = useCallback(() => {
    clearTimer();
    attemptsRef.current = [];
    streakRef.current = 0;
    bestStreakRef.current = 0;
    falseStartsRef.current = 0;
    setResults([]);
    setAttempt(0);
    setLastMs(null);
    startAttemptRef.current();
  }, [clearTimer]);

  // Finish the test.
  //
  // IMPORTANT: this closure depends on `guest` / `reportResult`, so it is
  // recreated on re-render. `handleHit` may hold an OLD version (React may
  // not have committed the latest render when a fast pointerdown arrives),
  // so the actual finish is always delegated through `finishTestRef` —
  // which is kept in sync with the LATEST `finishTest` on every render.
  // Without this, the 5th hit can run a stale `finishTest` that never calls
  // `setPhase("finished")`, leaving the game stuck on "ПОПЫТКА 5/5".
  //
  // Also: `setPhase("finished")` runs FIRST and guest stats are saved
  // SYNCHRONOUSLY, so the result screen and localStorage are guaranteed
  // even if the async `reportResult` hangs (it is raced with a timeout).
  // Referentially STABLE (deps []): guest/reportResult are read from refs.
  // A changing finishTest identity across renders is exactly what caused the
  // 5th-attempt hang (stale-closure/identity race with finishTestRef), so
  // every value it needs must come from refs that are updated in render.
  const finishTest = useCallback(() => {
    const times = attemptsRef.current.filter((r): r is number => typeof r === "number");
    const best = times.length > 0 ? Math.min(...times) : 0;
    const falseStarts = falseStartsRef.current;
    const streak = bestStreakRef.current;
    const won = times.length > 0 && best < 300;
    const guest = guestRef.current;

    // Switch to finished FIRST (sync, BEFORE any guest update) — the UI
    // must not depend on the async report.
    setPhase("finished");
    phaseRef.current = "finished";

    // Guest stats — synchronous, so localStorage is updated even if the
    // async report below never resolves.
    const nextGuest: GuestStats = {
      gamesPlayed: guest.gamesPlayed + 1,
      bestReaction:
        best > 0 ? (guest.bestReaction > 0 ? Math.min(guest.bestReaction, best) : best) : guest.bestReaction,
      totalAttempts: guest.totalAttempts + times.length,
      falseStarts: guest.falseStarts + falseStarts,
      bestStreak: Math.max(guest.bestStreak, streak),
    };
    setGuest(nextGuest);
    saveGuestStats(nextGuest);

    // Report to the progression system, but NEVER let it block the UI:
    // race it with a hard timeout so a hanging auth/fetch can't stall the
    // page (observed in headless test environments).
    const payload = {
      gameId: "reaction-test",
      won,
      score: best,
      metadata: {
        best,
        falseStarts,
        streak,
        attempts: times.length,
      },
    };
    const withTimeout = Promise.race([
      reportResultRef.current(payload).then(() => true, () => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
    ]);
    void withTimeout;
  }, []);

  // Always points to the LATEST finishTest (kept in sync on every render).
  const finishTestRef = useRef<() => void>(() => {});
  finishTestRef.current = finishTest;
  // Stable callback: reportResult is kept in a ref (see below), so this
  // closure can be created ONCE — no dependency on changing hook values.
  const reportResultRef = useRef(reportResult);
  reportResultRef.current = reportResult;

  // Core input handler — called once per attempt.
  //
  // This is the SINGLE most race-sensitive closure in the game. It is a
  // plain function (NOT useCallback) that is recreated on EVERY render, so
  // it can NEVER be stale — every caller routes through a ref that is
  // re-pointed on every render (handleHitRef for the native pointerdown,
  // handleHitRefKey for Space, dispatchImplRef for the unified dispatcher).
  // All mutable state is read from refs; setters are stable.
  function handleHit() {
    if (lockedRef.current) return;
    const phase = phaseRef.current;

    if (phase === "waiting") {
      // False start
      lockedRef.current = true;
      clearTimer();
      falseStartsRef.current += 1;
      streakRef.current = 0;
      setAborted(false);
      setPhase("tooEarly");
      return;
    }

    if (phase === "ready") {
      // Lock FIRST, before any async/slow work — a double signal must never
      // produce two results (anti double-click), even if the value is rejected.
      lockedRef.current = true;
      const raw = performance.now() - signalAtRef.current;
      const ms = sanitizeReaction(raw);
      if (ms === null) {
        // Out of sane bounds — ignore (don't count as attempt).
        if (attemptRef.current >= TOTAL_ATTEMPTS - 1) {
          // This was the final attempt — no more attempts left to retry.
          // Finish the test with the results collected so far (it may be
          // fewer than TOTAL_ATTEMPTS, which is fine: the result screen
          // renders with "N попыток" and best/avg/worst of valid hits).
          setLastMs(null);
          finishTestRef.current();
        } else {
          // Reset the lock so a follow-up input on the same attempt still works.
          lockedRef.current = false;
          setPhase("idle");
        }
        return;
      }
      attemptsRef.current.push(ms);
      streakRef.current += 1;
      if (streakRef.current > bestStreakRef.current) bestStreakRef.current = streakRef.current;
      phaseRef.current = "counted";
      setPhase("counted");
      setLastMs(ms);
      setResults([...attemptsRef.current]);

      if (attemptsRef.current.length >= TOTAL_ATTEMPTS) {
        // Clear the live value once the result screen is up — it has its
        // own best/avg/worst cards, so the line would be redundant.
        setLastMs(null);
        finishTestRef.current();
      } else {
        setAttempt((a) => a + 1);
        // Короткая пауза, затем следующая попытка (via ref — never stale).
        nextAttemptTimer.current = setTimeout(() => {
          startAttemptRef.current();
        }, 1300);
      }
      return;
    }
  }

  // "Continue" from too-early / finished states — referentially STABLE.
  const continueFromTooEarly = useCallback(() => {
    if (attemptsRef.current.length >= TOTAL_ATTEMPTS) {
      finishTestRef.current();
    } else {
      startAttemptRef.current();
    }
  }, []);

  // Keyboard: Space — the listener is attached ONCE (empty deps) and routes
  // every press through handleHitRef, so it can never hold a stale handler.
  const handleHitRefKey = useRef(handleHit);
  handleHitRefKey.current = handleHit;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      e.preventDefault();
      const p = phaseRef.current;
      if (p === "waiting" || p === "ready") {
        handleHitRefKey.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus/visibility loss: cancel the current attempt (no unfair result)
  useEffect(() => {
    const cancel = () => {
      const p = phaseRef.current;
      if (p === "waiting" || p === "ready") {
        clearTimer();
        lockedRef.current = false;
        setAborted(true);
        setPhase("tooEarly");
      }
    };
    const onVis = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // Full tap dispatcher — routes by current phase.
  //
  // `handleHit`, `startTest`, `continueFromTooEarly` are all recreated on
  // every render (their deps change), so this dispatcher must route through
  // refs (dispatchImplRef is re-pointed every render) — otherwise a native
  // pointerdown could be handled by an OLD closure. The dispatcher itself
  // is referentially stable (deps []) so the native listener effect can
  // attach it once and never re-attach.
  const handleHitRef = useRef(handleHit);
  handleHitRef.current = handleHit;
  const startTestRef = useRef(startTest);
  startTestRef.current = startTest;
  const continueRef = useRef(continueFromTooEarly);
  continueRef.current = continueFromTooEarly;
  const dispatchImplRef = useRef<(p: Phase) => void>(() => {});
  dispatchImplRef.current = (p: Phase) => {
    if (p === "waiting" || p === "ready") handleHitRef.current();
    else if (p === "idle") startTestRef.current();
    else if (p === "tooEarly") continueRef.current();
  };
  const dispatchTap = useCallback(() => {
    dispatchImplRef.current(phaseRef.current);
  }, []);

  // Native DOM input listener (the reliable path).
  //
  // React's synthetic onPointerDown only fires if React's event handler is
  // attached AND the render that re-attached it has committed. Under heavy
  // dev-server load a render can be delayed, so a pointerdown that lands in
  // that window is DROPPED — the hit is neither counted nor does it finish
  // the game, leaving it stuck. A native listener is invoked directly by the
  // browser and always fires, so the game stays responsive.
  //
  // `lockedRef` in handleHit absorbs any duplicate signal, so a double path
  // (native + a React handler, if one is ever re-added) can never produce
  // two results.
  const areaRef = useRef<HTMLButtonElement | null>(null);
  const dispatchTapRef = useRef(dispatchTap);
  dispatchTapRef.current = dispatchTap;
  useEffect(() => {
    const btn = areaRef.current;
    if (!btn) return;
    const onNative = (e: PointerEvent) => {
      e.preventDefault();
      dispatchTapRef.current();
    };
    // Capture-phase listener on the BUTTON itself: even if the button is
    // remounted mid-game or the render that attached React handlers is
    // delayed, the browser still delivers the synthetic pointerdown here
    // and we always route it through the current dispatchTap.
    btn.addEventListener("pointerdown", onNative, true);
    return () => btn.removeEventListener("pointerdown", onNative, true);
  }, []);

  // ---------- Derived ----------
  const times = results.filter((r): r is number => typeof r === "number");
  const best = times.length ? Math.min(...times) : 0;
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const worst = times.length ? Math.max(...times) : 0;

  // ---------- Render ----------
  const areaColor =
    phase === "ready"
      ? "linear-gradient(135deg, #16a34a, #15803d)"
      : phase === "tooEarly"
        ? "linear-gradient(135deg, #ef4444, #b91c1c)"
        : "linear-gradient(180deg, #0d1117, #07090c)";

  const areaLabel =
    phase === "idle"
      ? "Жми, чтобы начать"
      : phase === "waiting"
        ? "Жди зелёный…"
        : phase === "ready"
          ? "ЖМИ СЕЙЧАС!"
          : phase === "counted"
            ? "ЗАСЧЁТ"
            : phase === "tooEarly"
              ? aborted
                ? "Потеря фокуса — попытка отменена"
                : "СЛИШКОМ РАНО"
              : "";

  const areaLabelColor =
    phase === "ready" ? "text-white" : phase === "tooEarly" ? "text-white" : "text-white/60";

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: "linear-gradient(180deg, #07090c 0%, #0d1117 50%, #07090c 100%)",
      }}
    >
      {/* Background pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.025) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.025) 40px)",
        }}
      />
      <Nav dark />
      <div className="relative max-w-3xl mx-auto px-4 pb-16">
        {/* Header */}
        <div className="mt-6 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-widest text-green-400">
              ⚡ REACTION <span className="text-white">TEST</span>
            </h1>
            <p className="text-[11px] font-mono text-white/40 tracking-widest uppercase mt-0.5">
              CLASSIC · {TOTAL_ATTEMPTS} ПОПЫТОК
            </p>
          </div>
          {phase !== "idle" && phase !== "finished" && (
            <div className="font-mono text-sm text-white/50">
              ПОПЫТКА <span className="text-green-400 font-bold">{Math.min(attempt + 1, TOTAL_ATTEMPTS)}</span>/{TOTAL_ATTEMPTS}
            </div>
          )}
        </div>

        {/* Mode selector (prepared for future modes) */}
        <div className="flex gap-2 mb-4">
          <span className="px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider bg-green-500/15 border border-green-500/40 text-green-300">
            Classic
          </span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider bg-white/[0.03] border border-white/10 text-white/25 cursor-not-allowed">
            30s · скоро
          </span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider bg-white/[0.03] border border-white/10 text-white/25 cursor-not-allowed">
            Endless · скоро
          </span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider bg-white/[0.03] border border-white/10 text-white/25 cursor-not-allowed">
            Multiplayer · скоро
          </span>
        </div>

        {/* Interactive area */}
        <button
          ref={areaRef}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={areaLabel}
          className="w-full rounded-2xl border border-white/10 transition-colors duration-150 select-none touch-none"
          style={{ background: areaColor, minHeight: 320, cursor: "pointer" }}
        >
          <div className="flex flex-col items-center justify-center min-h-[320px] px-4 text-center">
            <div className={`text-3xl sm:text-4xl font-black tracking-widest ${areaLabelColor}`}>
              {areaLabel}
            </div>
            {phase === "ready" && (
              <div className="mt-3 text-white/80 font-mono text-sm">Клик / тап / Space</div>
            )}
            {phase === "tooEarly" && !aborted && (
              <div className="mt-3 text-white/80 font-mono text-sm">
                Нажал слишком рано — попытка не засчитана. Жми, чтобы повторить.
              </div>
            )}
            {phase === "idle" && (
              <div className="mt-3 text-white/40 font-mono text-xs">
                Жди зелёный сигнал и жми как можно быстрее. {TOTAL_ATTEMPTS} попыток.
              </div>
            )}
          </div>
        </button>

        {/* Live last result — visible from the hit until the next result
            replaces it or the game finishes (startTest / finishTest clear it) */}
        {lastMs !== null && phase !== "finished" && (
          <div className="mt-4 text-center font-mono">
            <span className="text-white/40 text-sm">Последний: </span>
            <span
              className="text-2xl font-black"
              style={{ color: scoreReaction(lastMs).color }}
            >
              {lastMs} ms
            </span>
            <span className="text-white/40 text-sm ml-2">{scoreReaction(lastMs).label}</span>
          </div>
        )}

        {/* Result screen */}
        {phase === "finished" && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-center mb-5">
              <div className="font-mono text-xs text-white/40 uppercase tracking-widest">Результат · {times.length} попыток</div>
              <div className="text-5xl font-black my-3" style={{ color: best ? scoreReaction(best).color : "#fff" }}>
                {best > 0 ? best : "—"} ms
              </div>
              {best > 0 && (
                <div className="font-mono text-sm text-white/60">{scoreReaction(best).label}</div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center mb-5">
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
                <div className="text-2xl font-black text-green-400">{best > 0 ? best : "—"}</div>
                <div className="text-[10px] font-mono text-white/40 uppercase">ЛУЧШИЙ</div>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
                <div className="text-2xl font-black text-cyan-300">{avg || "—"}</div>
                <div className="text-[10px] font-mono text-white/40 uppercase">СРЕДНИЙ</div>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
                <div className="text-2xl font-black text-rose-400">{worst || "—"}</div>
                <div className="text-[10px] font-mono text-white/40 uppercase">ХУДШИЙ</div>
              </div>
            </div>
            {/* Per-attempt bars */}
            <div className="space-y-1.5 mb-6">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 text-right font-mono text-xs text-white/40">{i + 1}</span>
                  <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                    {typeof r === "number" ? (
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(6, Math.min(100, (r / 800) * 100))}%`,
                          background: scoreReaction(r).color,
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-rose-500/30" />
                    )}
                  </div>
                  <span
                    className="w-16 font-mono text-xs text-right"
                    style={{ color: typeof r === "number" ? scoreReaction(r).color : "#f87171" }}
                  >
                    {typeof r === "number" ? `${r} ms` : "Рано"}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={startTest}
                className="flex-1 px-6 py-3 rounded-xl font-bold tracking-widest text-white transition hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
              >
                ↻ ЕЩЁ РАЗ
              </button>
            </div>
          </div>
        )}

        {/* Guest stats (always visible) */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">
            Твоя статистика (гость)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-green-400">{guest.gamesPlayed}</div>
              <div className="text-[10px] text-white/40">ИГР</div>
            </div>
            <div>
              <div className="text-lg font-bold text-cyan-300">
                {guest.bestReaction > 0 ? `${guest.bestReaction} ms` : "—"}
              </div>
              <div className="text-[10px] text-white/40">РЕКОРД</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{guest.totalAttempts}</div>
              <div className="text-[10px] text-white/40">ПОПЫТОК</div>
            </div>
            <div>
              <div className="text-lg font-bold text-rose-400">{guest.falseStarts}</div>
              <div className="text-[10px] text-white/40">РАНО</div>
            </div>
          </div>
        </div>

        {/* How to play */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50 space-y-1">
          <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-1">Как играть</div>
          <p>• Жди, пока поле не станет зелёным — жми как можно быстрее (клик, тап или Space).</p>
          <p>• Нажал рано — попытка не засчитывается и не входит в результат.</p>
          <p>• Переключишь вкладку — текущая попытка отменяется честно.</p>
          <p>• Один сигнал засчитывается один раз — двойной клик не даст два результата.</p>
        </div>
      </div>
    </div>
  );
}
