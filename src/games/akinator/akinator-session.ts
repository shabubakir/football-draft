// ============================================================
// FOOTBALL AKINATOR — сохранение незавершённой партии
//
// EngineState содержит только сериализуемые поля (string[],
// Record<string,number>, number, string, boolean) — JSON-совместим.
//
// Сохраняется: при каждом ответе (handleAnswer), при догадке
// (handleAccept/handleReject).
// Удаляется: при завершении (won/lost/surrender), при newGame.
// ============================================================

import type { EngineState } from "./engine";

const STORAGE_KEY = "fd_akinator_session_v1";

export interface AkinatorSession {
  version: 1;
  state: EngineState;
  started: boolean;
  savedAt: number;
}

function isValidState(s: unknown): s is EngineState {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  if (!Array.isArray(o.candidates)) return false;
  if (typeof o.weights !== "object" || o.weights === null) return false;
  if (!Array.isArray(o.asked)) return false;
  if (typeof o.questionNum !== "number") return false;
  if (
    o.phase !== "playing" &&
    o.phase !== "guessing" &&
    o.phase !== "won" &&
    o.phase !== "lost" &&
    o.phase !== "surrender"
  )
    return false;
  if (typeof o.wrongGuesses !== "number") return false;
  if (typeof o.hardAnswers !== "object" || o.hardAnswers === null) return false;
  return true;
}

function isValidSession(s: unknown): s is AkinatorSession {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  if (o.version !== 1) return false;
  if (typeof o.started !== "boolean") return false;
  return isValidState(o.state);
}

export function loadSession(): AkinatorSession | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidSession(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    // Если партия уже завершена (won/lost/surrender) — не восстанавливаем
    if (parsed.state.phase === "won" || parsed.state.phase === "lost" || parsed.state.phase === "surrender") {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
    return null;
  }
}

export function saveSession(state: EngineState, started: boolean) {
  if (typeof localStorage === "undefined") return;
  // Не сохраняем завершённые партии
  if (state.phase === "won" || state.phase === "lost" || state.phase === "surrender") {
    clearSession();
    return;
  }
  const session: AkinatorSession = {
    version: 1,
    state,
    started,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* приватный режим — игнорируем */
  }
}

export function clearSession() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
