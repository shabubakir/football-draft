// ============================================================
// СВОЯ ИГРА — чистый игровой движок (state machine)
// ============================================================
// Движок — чистая функция: (room, action) => { room, ok, error? }
// Никаких副作用 (side effects). Все проверки прав, фаз, гонок — здесь.
//
// Состояния: lobby → board → question → reveal → board … → finished
//
// Акции (actions):
//   join        — игрок входит в лобби
//   leave       — игрок выходит (хост → передача хоста)
//   start       — хост начинает игру (≥2 игроков)
//   pick        — игрок со своего хода выбирает ячейку
//   answer      — игрок выбирает вариант (optionIndex 0..3), движок сам проверяет
//   skip        — хост пропускает вопрос (таймаут авто-вердикта)
//   transfer    — хост передаёт хоста
//   finish      — хост завершает игру досрочно
//
// Все мутации пишут ЦЕЛИКОМ (scores, board, players) — нет
// частичных обновлений, нет подделки очков.
// ============================================================

import type { SvoyaCategory, SvoyaQuestion } from "./questions";

// ---------- Типы комнаты ----------

export type SvoyaPhase = "lobby" | "board" | "question" | "reveal" | "finished";

export interface SvoyaPlayer {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number; // epoch ms — для детерминированной очереди
}

export interface SvoyaCell {
  cat: SvoyaCategory;
  value: number; // 100..500
  qId: string;
  taken: boolean;
  takenBy?: string;
}

export interface SvoyaCurrent {
  cat: number;      // индекс категории (0-4)
  val: number;      // 100..500
  qId: string;
  pickedBy: string;
  /** Индекс выбранного варианта (0..3). 0 = правильный. */
  chosenOption?: number;
  correct?: boolean;
  revealed?: boolean;
}

export interface SvoyaRoom {
  id: string;
  code: string;
  status: SvoyaPhase;
  hostId: string;
  answerSeconds: number;
  seed: number;
  categories: SvoyaCategory[]; // 5 категорий доски (порядок)
  players: SvoyaPlayer[];
  board: SvoyaCell[];          // 25 ячеек: [cat*5 + valueIdx]
  scores: Record<string, number>;
  turnQueue: string[];         // порядок ходов (playerId)
  turnIndex: number;
  current: SvoyaCurrent | null;
  nextAt: string | null;       // ISO
  createdAt: string;
}

// ---------- Акции ----------

export type SvoyaAction =
  | { type: "join"; playerId: string; name: string }
  | { type: "leave"; playerId: string }
  | { type: "start"; actorId: string }
  | { type: "pick"; actorId: string; cat: number; val: number }
  | { type: "answer"; actorId: string; optionIndex: number }
  | { type: "skip"; actorId: string }
  | { type: "transfer"; actorId: string; toPlayerId: string }
  | { type: "finish"; actorId: string };

export interface EngineResult {
  room: SvoyaRoom;
  ok: boolean;
  error?: string;
  /** События для UI (не обязательны). */
  events?: string[];
}

// ---------- Вспомогательные ----------

const PHASES: SvoyaPhase[] = ["lobby", "board", "question", "reveal", "finished"];

export function isValidPhase(p: unknown): p is SvoyaPhase {
  return typeof p === "string" && (PHASES as string[]).includes(p);
}

export function cloneRoom(r: SvoyaRoom): SvoyaRoom {
  return {
    ...r,
    players: r.players.map((p) => ({ ...p })),
    board: r.board.map((c) => ({ ...c })),
    scores: { ...r.scores },
    turnQueue: [...r.turnQueue],
    current: r.current ? { ...r.current } : null,
  };
}

/** Нормализация ответа: нижний регистр, trim, сжатие пробелов, без пунктуации. */
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:()"«»"'’‘“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Игрок со своим ходом (текущий). */
/** Категория как строка (тип-экспорт для UI/тестов). */
export type { SvoyaCategory } from "./questions";

export function turnPlayer(r: SvoyaRoom): SvoyaPlayer | null {
  if (r.status !== "board" || r.turnQueue.length === 0) return null;
  const pid = r.turnQueue[r.turnIndex % r.turnQueue.length];
  return r.players.find((p) => p.id === pid) ?? null;
}

/** Следующий игрок в очереди (двигает turnIndex). */
export function advanceTurn(r: SvoyaRoom): void {
  if (r.turnQueue.length > 0) {
    r.turnIndex = (r.turnIndex + 1) % r.turnQueue.length;
  }
}

/** Числовой индекс номинала (0..4). */
export function valueIndex(val: number): number {
  return Math.floor(val / 100) - 1;
}

/** Индекс ячейки в board (cat*5 + valueIdx). */
export function cellIndex(cat: number, val: number): number {
  return cat * 5 + valueIndex(val);
}

// ---------- Создание комнаты ----------

export function createRoom(opts: {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  categories: SvoyaCategory[];
  board: SvoyaCell[];
  answerSeconds?: number;
  now?: Date;
}): SvoyaRoom {
  const now = opts.now ?? new Date();
  return {
    id: opts.id,
    code: opts.code,
    status: "lobby",
    hostId: opts.hostId,
    answerSeconds: opts.answerSeconds ?? 20,
    seed: Math.floor(Math.random() * 1_000_000),
    categories: opts.categories.slice(0, 5),
    players: [
      { id: opts.hostId, name: opts.hostName, isHost: true, joinedAt: now.getTime() },
    ],
    board: opts.board.map((c) => ({ ...c })),
    scores: { [opts.hostId]: 0 },
    turnQueue: [opts.hostId],
    turnIndex: 0,
    current: null,
    nextAt: null,
    createdAt: now.toISOString(),
  };
}

// ---------- ГЛАВНАЯ ФУНКЦИЯ ----------

/**
 * Применяет действие к комнате. Возвращает новую комнату (immutable).
 * Никогда не мутирует исходный room.
 */
export function applyAction(
  room: SvoyaRoom,
  action: SvoyaAction,
  questions?: Map<string, SvoyaQuestion>
): EngineResult {
  const r = cloneRoom(room);
  const err = (msg: string): EngineResult => ({ room: r, ok: false, error: msg });

  // Защита от невалидного состояния
  if (!isValidPhase(r.status)) return err("Невалидная фаза комнаты");

  switch (action.type) {
    case "join":
      return doJoin(r, action);
    case "leave":
      return doLeave(r, action);
    case "start":
      return doStart(r, action);
    case "pick":
      return doPick(r, action, questions);
    case "answer":
      return doAnswer(r, action);
    case "skip":
      return doSkip(r, action);
    case "transfer":
      return doTransfer(r, action);
    case "finish":
      return doFinish(r, action);
    default:
      return err("Неизвестное действие");
  }
}

// ---------- Реализация акций ----------

function doJoin(r: SvoyaRoom, a: { playerId: string; name: string }): EngineResult {
  if (r.status !== "lobby") return { room: r, ok: false, error: "Игра уже началась" };
  if (r.players.length >= 6) return { room: r, ok: false, error: "Комната полная (макс. 6)" };
  if (r.players.some((p) => p.id === a.playerId)) {
    return { room: r, ok: false, error: "Вы уже в комнате" };
  }
  const name = a.name.trim().slice(0, 32) || "Игрок";
  r.players.push({ id: a.playerId, name, isHost: false, joinedAt: Date.now() });
  r.scores[a.playerId] = 0;
  r.turnQueue.push(a.playerId);
  return { room: r, ok: true, events: ["joined"] };
}

function doLeave(r: SvoyaRoom, a: { playerId: string }): EngineResult {
  const idx = r.players.findIndex((p) => p.id === a.playerId);
  if (idx === -1) return { room: r, ok: false, error: "Игрок не в комнате" };

  const isHost = r.players[idx].isHost;
  r.players.splice(idx, 1);
  delete r.scores[a.playerId];
  r.turnQueue = r.turnQueue.filter((id) => id !== a.playerId);

  // Передача хоста (детерминированно: первый по joinedAt)
  if (isHost && r.players.length > 0) {
    const newHost = [...r.players].sort((x, y) => x.joinedAt - y.joinedAt)[0];
    for (const p of r.players) p.isHost = p.id === newHost.id;
    r.hostId = newHost.id;
    return { room: r, ok: true, events: ["host-transferred"] };
  }

  // Очистить текущий вопрос, если его выбрал ушедший
  if (r.current?.pickedBy === a.playerId) {
    r.current = null;
    if (r.status === "question" || r.status === "reveal") {
      r.status = "board";
      r.nextAt = null;
    }
  }

  // Если никого не осталось — комната в пустом лобби
  if (r.players.length === 0) {
    r.status = "lobby";
    r.current = null;
    r.nextAt = null;
    r.turnQueue = [];
    r.turnIndex = 0;
  } else if (r.status === "board" || r.status === "question" || r.status === "reveal") {
    // Двигаем очередь, если ушёл игрок со своим ходом
    if (r.turnQueue.length > 0) {
      r.turnIndex = r.turnIndex % r.turnQueue.length;
    }
  }

  return { room: r, ok: true, events: ["left"] };
}

function doStart(r: SvoyaRoom, a: { actorId: string }): EngineResult {
  if (r.status !== "lobby") return { room: r, ok: false, error: "Игра уже идёт" };
  if (r.players.find((p) => p.id === a.actorId)?.isHost !== true) {
    return { room: r, ok: false, error: "Только хост может начать" };
  }
  if (r.players.length < 2) return { room: r, ok: false, error: "Нужно минимум 2 игрока" };
  // Очистка доски
  for (const c of r.board) { c.taken = false; c.takenBy = undefined; }
  r.status = "board";
  r.current = null;
  r.turnQueue = r.players.map((p) => p.id);
  r.turnIndex = 0;
  r.nextAt = null;
  return { room: r, ok: true, events: ["started"] };
}

function doPick(
  r: SvoyaRoom,
  a: { actorId: string; cat: number; val: number },
  _questions?: Map<string, SvoyaQuestion>
): EngineResult {
  if (r.status !== "board") return { room: r, ok: false, error: "Можно выбирать только на доске" };
  const tp = turnPlayer(r);
  if (!tp) return { room: r, ok: false, error: "Нет игрока на ходу" };
  if (tp.id !== a.actorId) {
    return { room: r, ok: false, error: `Не ваш ход. Ход: ${tp.name}` };
  }
  // Проверки координат
  if (a.cat < 0 || a.cat >= 5) return { room: r, ok: false, error: "Некорректная категория" };
  const vIdx = valueIndex(a.val);
  if (vIdx < 0 || vIdx >= 5) return { room: r, ok: false, error: "Некорректный номинал" };
  const ci = cellIndex(a.cat, a.val);
  const cell = r.board[ci];
  if (!cell) return { room: r, ok: false, error: "Ячейка не найдена" };
  if (cell.taken) return { room: r, ok: false, error: "Вопрос уже выбран" };

  cell.taken = true;
  cell.takenBy = a.actorId;
  r.status = "question";
  r.current = {
    cat: a.cat,
    val: a.val,
    qId: cell.qId,
    pickedBy: a.actorId,
  };
  // Таймер ответа
  r.nextAt = new Date(Date.now() + r.answerSeconds * 1000).toISOString();
  return { room: r, ok: true, events: ["picked"] };
}

/**
 * Ответ на вопрос: игрок выбирает один из 4 вариантов (optionIndex 0..3).
 * Движок САМ проверяет правильность:
 *   - optionIndex === 0 → правильный (options[0] — всегда верный)
 *   - optionIndex !== 0 → неправильный
 * Очки начисляются/снимаются автоматически, фаза → reveal.
 * Клиенту НЕ доверяется определение правильного ответа.
 */
function doAnswer(r: SvoyaRoom, a: { actorId: string; optionIndex: number }): EngineResult {
  if (r.status !== "question") return { room: r, ok: false, error: "Нет активного вопроса" };
  if (!r.current) return { room: r, ok: false, error: "Нет активного вопроса" };
  // Двойной ответ
  if (r.current.chosenOption !== undefined) {
    return { room: r, ok: false, error: "Ответ уже дан" };
  }
  // Валидация индекса
  if (!Number.isInteger(a.optionIndex) || a.optionIndex < 0 || a.optionIndex > 3) {
    return { room: r, ok: false, error: "Некорректный вариант ответа" };
  }
  // Любой игрок может ответить (как в настоящей игре — голосует любой)
  const correct = a.optionIndex === 0; // options[0] — всегда правильный
  const val = r.current.val;
  const who = r.current.pickedBy;
  if (correct) {
    r.scores[who] = (r.scores[who] ?? 0) + val;
  } else {
    r.scores[who] = (r.scores[who] ?? 0) - val;
  }
  r.current.chosenOption = a.optionIndex;
  r.current.correct = correct;
  r.current.revealed = true;
  r.status = "reveal";
  r.nextAt = new Date(Date.now() + 10_000).toISOString(); // 10 c на REVEAL
  return { room: r, ok: true, events: ["answered"] };
}

function doSkip(r: SvoyaRoom, a: { actorId: string }): EngineResult {
  // Хост или авто-таймаут: вопрос без ответа → штраф тому, кто выбрал
  if (r.status !== "question") return { room: r, ok: false, error: "Нет активного вопроса" };
  if (!r.current) return { room: r, ok: false, error: "Нет активного вопроса" };
  const isHost = r.players.find((p) => p.id === a.actorId)?.isHost === true;
  if (!isHost) return { room: r, ok: false, error: "Только хост может пропустить" };
  const val = r.current.val;
  const who = r.current.pickedBy;
  r.scores[who] = (r.scores[who] ?? 0) - val;
  r.current.correct = false;
  r.current.revealed = true;
  r.status = "reveal";
  r.nextAt = new Date(Date.now() + 10_000).toISOString();
  return { room: r, ok: true, events: ["skipped"] };
}

function doTransfer(r: SvoyaRoom, a: { actorId: string; toPlayerId: string }): EngineResult {
  if (r.players.find((p) => p.id === a.actorId)?.isHost !== true) {
    return { room: r, ok: false, error: "Только хост может передать" };
  }
  const target = r.players.find((p) => p.id === a.toPlayerId);
  if (!target) return { room: r, ok: false, error: "Игрок не найден" };
  for (const p of r.players) p.isHost = p.id === a.toPlayerId;
  r.hostId = a.toPlayerId;
  return { room: r, ok: true, events: ["host-transferred"] };
}

function doFinish(r: SvoyaRoom, a: { actorId: string }): EngineResult {
  if (r.status === "finished") return { room: r, ok: false, error: "Игра уже завершена" };
  if (r.players.find((p) => p.id === a.actorId)?.isHost !== true) {
    return { room: r, ok: false, error: "Только хост может завершить" };
  }
  r.status = "finished";
  r.current = null;
  r.nextAt = null;
  return { room: r, ok: true, events: ["finished"] };
}

// ---------- Автотаймаут (вызывается клиентом, видящим просроченный nextAt) ----------

/**
 * Продвигает комнату, если nextAt просрочен. Идемпотентно.
 * Используется polling-циклом любого клиента.
 */
export function autoAdvance(
  room: SvoyaRoom,
  now?: Date
): { room: SvoyaRoom; advanced: boolean; error?: string } {
  const t = now ?? new Date();
  if (!room.nextAt) return { room, advanced: false };
  const nextMs = new Date(room.nextAt).getTime();
  if (!Number.isFinite(nextMs) || t.getTime() < nextMs) {
    return { room, advanced: false };
  }
  // Просрочено — продвигаем
  const r = cloneRoom(room);
  if (r.status === "question") {
    // Таймаут: штраф тому, кто выбрал (как skip)
    if (r.current) {
      const val = r.current.val;
      const who = r.current.pickedBy;
      r.scores[who] = (r.scores[who] ?? 0) - val;
      r.current.correct = false;
      r.current.revealed = true;
    }
    r.status = "reveal";
    r.nextAt = new Date(t.getTime() + 10_000).toISOString();
  } else if (r.status === "reveal") {
    // REVEAL → BOARD (следующий ход) или FINISHED
    if (r.board.every((c) => c.taken)) {
      r.status = "finished";
      r.current = null;
      r.nextAt = null;
    } else {
      r.status = "board";
      r.current = null;
      r.nextAt = null;
      advanceTurn(r);
    }
  }
  return { room: r, advanced: true };
}

// ---------- Результаты ----------

export interface SvoyaResultRow {
  playerId: string;
  name: string;
  score: number;
  isWinner: boolean;
  isHost: boolean;
}

/** Таблица результатов с обработкой ничьей (все макс = победители). */
export function computeResults(r: SvoyaRoom): SvoyaResultRow[] {
  const rows: SvoyaResultRow[] = r.players.map((p) => ({
    playerId: p.id,
    name: p.name,
    score: r.scores[p.id] ?? 0,
    isHost: p.isHost,
    isWinner: false,
  }));
  const max = rows.reduce((m, x) => Math.max(m, x.score), -Infinity);
  for (const row of rows) row.isWinner = row.score === max;
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return rows;
}

// ---------- Публичная payload (без секретных полей) ----------

/**
 * Что отправляется клиентам. Правильный ответ (answer[]) НЕ утекает —
 * он только в движке. До REVEAL клиент видит только текст вопроса.
 */
export function toPublicRoom(r: SvoyaRoom) {
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    hostId: r.hostId,
    answerSeconds: r.answerSeconds,
    categories: r.categories,
    players: r.players,
    board: r.board.map((c) => ({
      cat: c.cat, value: c.value, qId: c.qId,
      taken: c.taken, takenBy: c.takenBy,
    })),
    scores: r.scores,
    turnQueue: r.turnQueue,
    turnIndex: r.turnIndex,
    current: r.current ? {
      cat: r.current.cat,
      val: r.current.val,
      qId: r.current.qId,
      pickedBy: r.current.pickedBy,
      chosenOption: r.current.chosenOption,
      correct: r.current.correct,
      revealed: r.current.revealed,
    } : null,
    nextAt: r.nextAt,
  };
}
