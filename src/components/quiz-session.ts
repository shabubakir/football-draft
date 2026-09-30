// ============================================================
// QUIZ — сохранение незавершённой онлайн-партии
//
// Источник истины для комнаты — Supabase (сервер). Локальное
// хранилище хранит только код комнаты, чтобы при перезагрузке
// автоматически подключиться.
//
// Сохраняется: при создании/входе в комнату.
// Удаляется: при выходе, при завершении, при невалидных данных.
// ============================================================

const STORAGE_KEY = "quiz-online-room-code-v1";

export interface QuizSession {
  version: 1;
  code: string;
  savedAt: number;
}

function isValidSession(s: unknown): s is QuizSession {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  if (o.version !== 1) return false;
  if (typeof o.code !== "string" || o.code.length < 4 || o.code.length > 8) return false;
  return true;
}

export function loadSession(): QuizSession | null {
  // Не используем typeof window guard — в тестах vitest нет
  // глобального window, но localStorage доступен как globalThis.localStorage.
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidSession(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as QuizSession;
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
    return null;
  }
}

export function saveSession(code: string) {
  if (typeof localStorage === "undefined") return;
  const session: QuizSession = {
    version: 1,
    code: code.toUpperCase(),
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
