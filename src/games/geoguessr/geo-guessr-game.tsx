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

type Phase = "playing" | "revealed" | "done";

export function GeoGuessrGame() {
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("playing");
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<GeoLocation>(() =>
    pickClassicRound(LOCATIONS, new Set())
  );
  const [guess, setGuess] = useState<[number, number] | null>(null);
  const [roundResult, setRoundResult] = useState<GeoRoundResult | null>(null);
  const [history, setHistory] = useState<GeoRoundResult[]>([]);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [finalResult, setFinalResult] = useState<GeoGameResult | null>(null);
  const [stats, setStats] = useState<GeoStats | null>(null);

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
    setHistory((h) => [...h, result]);
    setPhase("revealed");
  }, [guess, phase, current]);

  const nextRound = useCallback(() => {
    if (round >= ROUNDS_PER_GAME) {
      const result = finishGame(history);
      const stats = saveGeoGameResult(result);
      setFinalResult(result);
      setStats(stats);
      setPhase("done");
      return;
    }
    const next = pickClassicRound(LOCATIONS, usedIds);
    setUsedIds((s) => new Set(s).add(current.id));
    setCurrent(next);
    setRound((r) => r + 1);
    setGuess(null);
    setRoundResult(null);
    setImgLoaded(false);
    setImgFailed(false);
    setPhase("playing");
  }, [round, history, usedIds, current]);

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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <small className="text-[11px] tracking-[0.2em] text-stone-500">
            GEOGUESSR LITE
          </small>
          <h2 className="text-2xl font-black text-stone-900">
            РАУНД {round} <span className="text-stone-400 font-light">/ {ROUNDS_PER_GAME}</span>
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
                    ? "bg-emerald-500"
                    : i === round - 1 && phase === "playing"
                    ? "bg-stone-900"
                    : "bg-stone-300"
                }`}
              />
            ))}
          </div>
          <div className="rounded-xl bg-stone-900 text-white px-4 py-2 text-center min-w-[92px]">
            <div className="text-[10px] tracking-[0.15em] text-stone-400">СЧЁТ</div>
            <div className="text-lg font-black leading-none">
              {formatScore(totalScore)}
            </div>
          </div>
        </div>
      </div>

      {/* ===== ФОТО ===== */}
      <div className="mt-4 rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 relative">
        <div className="relative w-full aspect-[16/9] sm:aspect-[2/1]">
          {!imgLoaded && !imgFailed && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-800">
              <span className="text-stone-400 text-sm animate-pulse">
                Загружаем место…
              </span>
            </div>
          )}
          {imgFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-800 px-6 text-center">
              <span className="text-4xl">🗺️</span>
              <span className="text-stone-300 text-sm">
                Не удалось загрузить фото — попробуй ещё раз или переподключись
              </span>
              <button
                type="button"
                onClick={() => {
                  setImgFailed(false);
                  setImgLoaded(false);
                }}
                className="mt-1 rounded-lg bg-stone-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-500"
              >
                ПОВТОРИТЬ ЗАГРУЗКУ
              </button>
            </div>
          )}
          {!imgFailed && (
            <img
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
      <div className="mt-3 rounded-2xl overflow-hidden border border-stone-200 bg-white relative">
        <div className="h-[300px] sm:h-[340px]">
          <GeoMap
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
              className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-300 disabled:text-stone-500 text-white text-base sm:text-lg font-black tracking-wide px-6 py-4 transition shadow-sm"
            >
              {guess ? "ПОДТВЕРДИТЬ ОТВЕТ" : "СТАВЬ ТОЧКУ НА КАРТЕ"}
            </button>
            {guess && (
              <p className="text-xs text-stone-500 text-center">
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
      className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-all duration-500 ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-stone-100 p-4">
          <small className="text-[10px] tracking-[0.15em] text-stone-500">ТВОЙ ОТВЕТ</small>
          <div className="mt-1 font-black text-stone-900 text-lg leading-tight">
            {result.guess.latitude.toFixed(2)}°, {result.guess.longitude.toFixed(2)}°
          </div>
        </div>
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
          <small className="text-[10px] tracking-[0.15em] text-rose-500">ПРАВИЛЬНЫЙ ОТВЕТ</small>
          <div className="mt-1 font-black text-stone-900 text-lg leading-tight">
            {result.location.city}, {result.location.country}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <small className="text-[10px] tracking-[0.15em] text-stone-500">РАССТОЯНИЕ</small>
          <div className="text-xl font-black text-stone-900">
            {formatDistance(result.distanceKm)}
          </div>
        </div>
        <div className="text-right">
          <small className="text-[10px] tracking-[0.15em] text-stone-500">ОЧКИ</small>
          <div className="text-xl font-black text-emerald-600">
            {formatScore(result.points)} <span className="text-stone-400 text-sm font-light">/ {MAX_ROUND_POINTS}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-4 w-full rounded-2xl bg-stone-900 hover:bg-stone-700 text-white text-base sm:text-lg font-black tracking-wide px-6 py-4 transition"
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
      <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-8 text-center">
          <small className="text-[11px] tracking-[0.25em] text-emerald-200">
            GEOGUESSR LITE
          </small>
          <div className="mt-3 text-5xl font-black tracking-tight">
            {formatScore(result.total)}
            <span className="text-2xl font-light text-emerald-200"> / {formatScore(result.maxTotal)}</span>
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
                <span className="text-stone-500">
                  {i + 1}. {r.location.city}, {r.location.country}
                </span>
                <span className="font-semibold text-stone-800">
                  {formatDistance(r.distanceKm)} · {r.points}
                </span>
              </div>
            ))}
          </div>

          {/* общая статистика */}
          <div className="mt-5 rounded-xl bg-stone-100 p-4">
            <small className="text-[10px] tracking-[0.15em] text-stone-500">
              ТВОЯ СТАТИСТИКА
            </small>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <span>Игр сыграно: <b>{stats.gamesPlayed}</b></span>
              <span>Лучший результат: <b>{formatScore(stats.bestScore)}</b></span>
              <span>Средний счёт: <b>{stats.gamesPlayed ? formatScore(Math.round(stats.totalScore / stats.gamesPlayed)) : "—"}</b></span>
              <span>Идеальных (≤1 км): <b>{stats.perfect}</b></span>
            </div>
          </div>

          <button
            type="button"
            onClick={onRestart}
            className="mt-6 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-black tracking-wide px-6 py-4 transition"
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
    <div className="rounded-xl bg-stone-50 border border-stone-200 p-3">
      <small className="text-[9px] tracking-[0.12em] text-stone-500">{label}</small>
      <div className="mt-1 text-lg font-black text-stone-900">{value}</div>
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
