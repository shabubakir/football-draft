"use client";

// ============================================================
// GEOGUESSR LITE — игровой экран
// 5 раундов: фото → карта → точка → расстояние → очки → итог
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  finishGame,
  formatDistance,
  formatScore,
  haversineKm,
  loadGeoStats,
  MAX_ROUND_POINTS,
  pointsForDistance,
  ROUNDS_PER_GAME,
  pickClassicRound,
  saveGeoGameResult,
  type GeoGameResult,
  type GeoLocation,
  type GeoRoundResult,
  type GeoStats,
} from "./geo-engine";
import { LOCATIONS, geoImageUrl } from "./locations";
import { GeoMap } from "./geo-map";
import { OptimizedImage } from "@/components/optimized-image";
import { useProgression } from "@/lib/progression/use-progression";
import { clearSession, loadSession, saveSession } from "./geo-classic-session";

type Phase = "playing" | "revealed" | "done";

export function GeoGuessrGame() {
  const { reportResult } = useProgression();

  // ---------- Инициализация: пытаемся восстановить сохранённую партию ----------
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("playing");
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<GeoLocation>(() => {
    const saved = loadSession();
    if (saved) {
      const loc = LOCATIONS.find((l) => l.id === saved.currentId);
      if (loc) return loc;
    }
    return pickClassicRound(LOCATIONS, new Set());
  });
  const [guess, setGuess] = useState<[number, number] | null>(null);
  const [roundResult, setRoundResult] = useState<GeoRoundResult | null>(null);
  const [history, setHistory] = useState<GeoRoundResult[]>([]);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [finalResult, setFinalResult] = useState<GeoGameResult | null>(null);
  const [stats, setStats] = useState<GeoStats | null>(null);
  const restoredRef = useRef(false);

  // ---------- Восстановление сохранённой партии (один раз) ----------
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadSession();
    if (!saved) return;
    const loc = LOCATIONS.find((l) => l.id === saved.currentId);
    if (!loc) {
      clearSession();
      return;
    }
    setRound(saved.round);
    setPhase(saved.phase);
    setUsedIds(new Set(saved.usedIds));
    setCurrent(loc);
    setHistory(saved.history);
    setRoundResult(saved.roundResult);
    // guess НЕ восстанавливаем — пользователь заново ставит точку
    setGuess(null);
  }, []);

  const totalScore = useMemo(
    () => history.reduce((s, r) => s + r.points, 0),
    [history]
  );

  const confirm = useCallback(() => {
    if (!guess || phase !== "playing") return;
    const [gLat, gLng] = guess;
    const distanceKm = haversineKm(gLat, gLng, current.latitude, current.longitude);
    const points = pointsForDistance(distanceKm);
    const result: GeoRoundResult = {
      location: current,
      guess: { latitude: gLat, longitude: gLng },
      distanceKm,
      points,
    };
    setRoundResult(result);
    setHistory((h) => {
      const newHistory = [...h, result];
      // Сохраняем после подтверждения ответа
      saveSession({
        version: 1,
        round,
        currentId: current.id,
        usedIds: Array.from(usedIds),
        history: newHistory,
        phase: "revealed",
        roundResult: result,
        savedAt: Date.now(),
      });
      return newHistory;
    });
    setPhase("revealed");
  }, [guess, phase, current, round, usedIds]);

  const nextRound = useCallback(() => {
    if (round >= ROUNDS_PER_GAME) {
      const result = finishGame(history);
      const stats = saveGeoGameResult(result);
      setFinalResult(result);
      setStats(stats);
      setPhase("done");
      clearSession();
      // Report to progression system
      const totalScore = history.reduce((s, r) => s + r.points, 0);
      void reportResult({
        gameId: "geoguessr",
        won: totalScore >= 3000,
        score: totalScore,
      });
      return;
    }
    const next = pickClassicRound(LOCATIONS, usedIds);
    const newUsedIds = new Set(usedIds).add(current.id);
    const newRound = round + 1;
    setUsedIds(newUsedIds);
    setCurrent(next);
    setRound(newRound);
    setGuess(null);
    setRoundResult(null);
    setImgLoaded(false);
    setImgFailed(false);
    setPhase("playing");
    // Сохраняем после перехода к новому раунду
    saveSession({
      version: 1,
      round: newRound,
      currentId: next.id,
      usedIds: Array.from(newUsedIds),
      history,
      phase: "playing",
      roundResult: null,
      savedAt: Date.now(),
    });
  }, [round, history, usedIds, current, reportResult]);

  const restart = useCallback(() => {
    setRound(1);
    setPhase("playing");
    setUsedIds(new Set());
    setCurrent(pickClassicRound(LOCATIONS, new Set()));
    setGuess(null);
    setRoundResult(null);
    setHistory([]);
    setImgLoaded(false);
    setImgFailed(false);
    setFinalResult(null);
    setStats(null);
    clearSession();
  }, []);

  // ==================== ФИНАЛЬНЫЙ ЭКРАН ====================
  if (phase === "done" && finalResult) {
    return (
      <FinalScreen
        result={finalResult}
        stats={stats ?? loadGeoStats()}
        onRestart={restart}
      />
    );
  }

  return (
    <div className="w-full">
      {/* ===== HEADER: название + раунд + счёт ===== */}
      <div className="flex items-center justify-between gap-3 flex-wrap text-white">
        <div>
          <small className="text-[11px] tracking-[0.2em] text-teal-400/70">
            GEOGUESSR LITE
          </small>
          <h2 className="text-2xl font-black">
            РАУНД {round} <span className="text-white/30 font-light">/ {ROUNDS_PER_GAME}</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* progress dots */}
          <div className="flex gap-1.5 mr-2">
            {Array.from({ length: ROUNDS_PER_GAME }).map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition ${
                  i < history.length
                    ? "bg-teal-400"
                    : i === round - 1 && phase === "playing"
                    ? "bg-white/70"
                    : "bg-white/15"
                }`}
              />
            ))}
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-center min-w-[92px]">
            <div className="text-[10px] tracking-[0.15em] text-teal-400/60">СЧЁТ</div>
            <div className="text-lg font-black leading-none text-teal-300">
              {formatScore(totalScore)}
            </div>
          </div>
        </div>
      </div>

      {/* ===== ФОТО ===== */}
      <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 bg-black/30 relative">
        <div className="relative w-full aspect-[16/9] sm:aspect-[2/1]">
          {!imgLoaded && !imgFailed && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-white/40 text-sm animate-pulse">
                Загружаем место…
              </span>
            </div>
          )}
          {imgFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 px-6 text-center">
              <span className="text-4xl">🗺️</span>
              <span className="text-white/50 text-sm">
                Не удалось загрузить фото — попробуй ещё раз или переподключись
              </span>
              <button
                type="button"
                onClick={() => {
                  setImgFailed(false);
                  setImgLoaded(false);
                }}
                className="mt-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition"
              >
                ПОВТОРИТЬ ЗАГРУЗКУ
              </button>
            </div>
          )}
          {!imgFailed && (
            <OptimizedImage
              key={current.id}
              src={geoImageUrl(current.image)}
              referrerPolicy="no-referrer"
              alt={`${current.city}, ${current.country}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgFailed(true)}
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          )}
          {/* лёгкая тень снизу для читаемости */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* ===== КАРТА ===== */}
      <div className="mt-3 rounded-2xl overflow-hidden border border-white/10 bg-black/20 relative">
        <div className="h-[300px] sm:h-[340px]">
          <GeoMap
            roundKey={round}
            center={[25, 10]}
            zoom={2}
            guess={guess}
            onGuessChange={(lat, lng) => setGuess([lat, lng])}
            locked={phase !== "playing"}
            reveal={
              phase === "revealed" && roundResult
                ? {
                    correct: [roundResult.location.latitude, roundResult.location.longitude],
                    correctLabel: `${roundResult.location.city}, ${roundResult.location.country}`,
                    guessLabel: "Твой ответ",
                    distanceText: formatDistance(roundResult.distanceKm),
                    points: roundResult.points,
                  }
                : null
            }
          />
        </div>
      </div>

      {/* ===== ПАНЕЛЬ ДЕЙСТВИЙ ===== */}
      <div className="mt-3">
        {phase === "playing" && (
          <div className="flex flex-col items-stretch gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={!guess}
              className="w-full rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:bg-white/10 disabled:text-white/25 text-white text-base sm:text-lg font-black tracking-wide px-6 py-4 transition active:scale-[0.99] shadow-lg shadow-teal-900/30"
            >
              {guess ? "ПОДТВЕРДИТЬ ОТВЕТ" : "СТАВЬ ТОЧКУ НА КАРТЕ"}
            </button>
            {guess && (
              <p className="text-xs text-white/40 text-center">
                Точка установлена. Можно двигать маркер или кликнуть ещё раз.
              </p>
            )}
          </div>
        )}

        {phase === "revealed" && roundResult && (
          <ResultPanel result={roundResult} onNext={nextRound} isLast={round >= ROUNDS_PER_GAME} />
        )}
      </div>
    </div>
  );
}

// ==================== РЕЗУЛЬТАТ РАУНДА ====================
function ResultPanel({
  result,
  onNext,
  isLast,
}: {
  result: GeoRoundResult;
  onNext: () => void;
  isLast: boolean;
}) {
  const [shown, setShown] = useState(false);
  // простая анимация появления
  useEffectOnce(() => {
    const t = setTimeout(() => setShown(true), 350);
    return () => clearTimeout(t);
  });

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 transition-all duration-500 ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <small className="text-[10px] tracking-[0.15em] text-white/40">ТВОЙ ОТВЕТ</small>
          <div className="mt-1 font-black text-white text-lg leading-tight">
            {result.guess.latitude.toFixed(2)}°, {result.guess.longitude.toFixed(2)}°
          </div>
        </div>
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4">
          <small className="text-[10px] tracking-[0.15em] text-rose-400">ПРАВИЛЬНЫЙ ОТВЕТ</small>
          <div className="mt-1 font-black text-white text-lg leading-tight">
            {result.location.city}, {result.location.country}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <small className="text-[10px] tracking-[0.15em] text-white/40">РАССТОЯНИЕ</small>
          <div className="text-xl font-black text-white">
            {formatDistance(result.distanceKm)}
          </div>
        </div>
        <div className="text-right">
          <small className="text-[10px] tracking-[0.15em] text-white/40">ОЧКИ</small>
          <div className="text-xl font-black text-teal-400">
            {formatScore(result.points)} <span className="text-white/25 text-sm font-light">/ {MAX_ROUND_POINTS}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-base sm:text-lg font-black tracking-wide px-6 py-4 transition active:scale-[0.99] shadow-lg shadow-teal-900/30"
      >
        {isLast ? "ИТОГИ ИГРЫ" : "СЛЕДУЮЩИЙ РАУНД"}
      </button>
    </div>
  );
}

// ==================== ФИНАЛЬНЫЙ ЭКРАН ====================
function FinalScreen({
  result,
  stats,
  onRestart,
}: {
  result: GeoGameResult;
  stats: GeoStats;
  onRestart: () => void;
}) {
  const avg = formatDistance(result.avgDistanceKm);
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
        <div className="bg-gradient-to-br from-teal-700/80 to-emerald-900/80 border-b border-white/10 p-8 text-center">
          <small className="text-[11px] tracking-[0.25em] text-teal-300/70">
            GEOGUESSR LITE
          </small>
          <div className="mt-3 text-5xl font-black tracking-tight text-teal-300">
            {formatScore(result.total)}
            <span className="text-2xl font-light text-white/40"> / {formatScore(result.maxTotal)}</span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="РАУНДОВ" value={String(result.rounds.length)} />
            <Stat label="СРЕДНЯЯ ТОЧНОСТЬ" value={avg} />
            <Stat label="ЛУЧШИЙ РАУНД" value={formatScore(result.bestRound)} />
          </div>

          {/* мини-статистика по раундам */}
          <div className="mt-4 space-y-1.5">
            {result.rounds.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-white/50">
                  {i + 1}. {r.location.city}, {r.location.country}
                </span>
                <span className="font-semibold text-teal-300">
                  {formatDistance(r.distanceKm)} · {r.points}
                </span>
              </div>
            ))}
          </div>

          {/* общая статистика */}
          <div className="mt-5 rounded-xl bg-white/5 border border-white/10 p-4">
            <small className="text-[10px] tracking-[0.15em] text-white/40">
              ТВОЯ СТАТИСТИКА
            </small>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-white/60">
              <span>Игр сыграно: <b className="text-white/80">{stats.gamesPlayed}</b></span>
              <span>Лучший результат: <b className="text-white/80">{formatScore(stats.bestScore)}</b></span>
              <span>Средний счёт: <b className="text-white/80">{stats.gamesPlayed ? formatScore(Math.round(stats.totalScore / stats.gamesPlayed)) : "—"}</b></span>
              <span>Идеальных (≤1 км): <b className="text-white/80">{stats.perfect}</b></span>
            </div>
          </div>

          <button
            type="button"
            onClick={onRestart}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-lg font-black tracking-wide px-6 py-4 transition active:scale-[0.99] shadow-lg shadow-teal-900/30"
          >
            ИГРАТЬ ЕЩЁ
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <small className="text-[9px] tracking-[0.12em] text-white/40">{label}</small>
      <div className="mt-1 text-lg font-black text-teal-300">{value}</div>
    </div>
  );
}

// маленький хелпер: запускать эффект один раз
function useEffectOnce(fn: () => void | (() => void)) {
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    return fn();
  }, [fn]);
}
