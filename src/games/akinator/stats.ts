// ============================================================
// FOOTBALL AKINATOR — статистика (localStorage)
// ============================================================

import type { AkinatorStats } from "./types";

const KEY = "fd_akinator_stats_v1";

export const EMPTY_STATS: AkinatorStats = {
  games: 0,
  wins: 0,
  losses: 0,
  totalQuestions: 0,
  bestResult: null,
};

export function loadStats(): AkinatorStats {
  if (typeof window === "undefined") return EMPTY_STATS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_STATS;
    const parsed = JSON.parse(raw);
    return { ...EMPTY_STATS, ...parsed };
  } catch {
    return EMPTY_STATS;
  }
}

export function saveStats(s: AkinatorStats) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // localStorage может быть недоступен (private mode) — тихо игнорируем
  }
}

/** Записать завершённую игру */
export function recordGame(won: boolean, questions: number) {
  const s = loadStats();
  const next: AkinatorStats = {
    ...s,
    games: s.games + 1,
    wins: s.wins + (won ? 1 : 0),
    losses: s.losses + (won ? 0 : 1),
    totalQuestions: s.totalQuestions + questions,
    bestResult:
      won && (s.bestResult === null || questions < s.bestResult)
        ? questions
        : s.bestResult,
    lastPlayed: new Date().toISOString(),
  };
  saveStats(next);
  return next;
}

export function resetStats() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
