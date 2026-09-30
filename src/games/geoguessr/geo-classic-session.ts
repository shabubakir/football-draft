// ============================================================
// GEOGUESSR LITE — сохранение незавершённой партии (localStorage)
//
// Версионирование: STORAGE_KEY содержит версию (v1). При смене
// формата — новая версия, старые сохранения не читаются.
//
// Сохраняется после: confirm (ответ), nextRound (переход).
// Удаляется: после finishGame (итог), restart (новая игра),
// при невалидных данных при восстановлении.
// ============================================================

import { LOCATIONS } from "./locations";
import type { GeoRoundResult } from "./geo-engine";

const STORAGE_KEY = "geoguessr-lite-session-v1";

export interface GeoClassicSession {
  version: 1;
  /** Номер текущего раунда (1-based) */
  round: number;
  /** id текущей локации */
  currentId: string;
  /** id использованных локаций (без текущей) */
  usedIds: string[];
  /** Завершённые раунды */
  history: GeoRoundResult[];
  /** Фаза: playing (ждём ответа) | revealed (показываем результат) */
  phase: "playing" | "revealed";
  /** Результат текущего раунда (если phase=revealed) */
  roundResult: GeoRoundResult | null;
  /** Временная метка сохранения */
  savedAt: number;
}

function isValidLocationId(id: string): boolean {
  return LOCATIONS.some((l) => l.id === id);
}

function isValidSession(s: unknown): s is GeoClassicSession {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  if (o.version !== 1) return false;
  if (typeof o.round !== "number" || o.round < 1 || o.round > 5) return false;
  if (typeof o.currentId !== "string" || !isValidLocationId(o.currentId)) return false;
  if (!Array.isArray(o.usedIds)) return false;
  if (!o.usedIds.every((x) => typeof x === "string")) return false;
  if (!Array.isArray(o.history)) return false;
  if (o.phase !== "playing" && o.phase !== "revealed") return false;
  // history.length:
  //   phase=playing  → round-1 (текущий раунд ещё не завершён)
  //   phase=revealed → round   (текущий раунд уже в history после confirm)
  const histLen = (o.history as unknown[]).length;
  const expected = o.phase === "revealed" ? (o.round as number) : (o.round as number) - 1;
  if (histLen !== expected) return false;
  return true;
}

export function loadSession(): GeoClassicSession | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidSession(parsed)) {
      // Повреждённые/устаревшие данные — чистим
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

export function saveSession(s: GeoClassicSession) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
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
