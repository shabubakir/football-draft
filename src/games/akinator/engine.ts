// ============================================================
// FOOTBALL AKINATOR — движок (алгоритм угадывания) v2
// ============================================================
//
// Две стадии обработки ответа:
//
//  HARD FILTER  — для вопросов с флагом `hard: true`.
//    «Да»  → остаются только сущности, для которых check() === true
//    «Нет» → остаются только сущности, для которых check() === false
//    Сущности с check() === null НЕ исключаются (нет данных ≠ противоречие).
//
//  SCORING      — для всех остальных вопросов и для мягких ответов
//    («скорее да», «скорее нет», «не знаю»).
//    Да = сильный плюс, Скорее да = средний плюс, Не знаю = нейтрально,
//    Скорее нет = средний минус, Нет = сильный минус.
//
//  ANTI-ERROR   — перед каждой догадкой проверяем, что кандидат
//    совместим со ВСЕМИ жёсткими ответами пользователя.
//    Если противоречит хотя бы одному — НЕ ПREDЛАГАЕМ.
//
// ============================================================

import type { Answer, Entity, Question } from "./types";
import { ALL_ENTITIES, ENTITY_MAP, QUESTIONS } from "./data";

// ---------- веса ответов (мягкое скоринг) ----------
const ANSWER_FACTOR: Record<Answer, { yes: number; no: number }> = {
  yes:        { yes: 2.2,  no: 0.4  },
  no:         { yes: 0.4,  no: 2.2  },
  maybe_yes:  { yes: 1.35, no: 0.75 },
  maybe_no:   { yes: 0.75, no: 1.35 },
  unknown:    { yes: 1.06, no: 0.95 },
};

// При «н/д» (у сущности нет данных по свойству) — лёгкий штраф,
// но не вычёркиваем: возможно, у игрока тоже нет точного ответа.
const NA_FACTOR = 0.92;

// ---------- пороговые значения ----------
const GUESS_CONFIDENCE = 0.45;
const MAX_QUESTIONS = 25;
const MAX_GUESS_ROUNDS = 3;
const MIN_QUESTIONS_BEFORE_GUESS = 4;

export interface Weighted {
  id: string;
  weight: number;
}

export interface EngineState {
  /** Идентификаторы кандидатов (подмножество ALL_ENTITIES) */
  candidates: string[];
  /** Текущие веса кандидатов */
  weights: Record<string, number>;
  /** Использованные вопросы (чтобы не повторяться) */
  asked: string[];
  /** Номер текущего вопроса (1-based) */
  questionNum: number;
  /** Фаза */
  phase: "playing" | "guessing" | "won" | "lost" | "surrender";
  /** Идентификатор текущей догадки */
  guessId?: string;
  /** Сколько раз подряд не угадали */
  wrongGuesses: number;
  /** Правильный ответ, если пользователь его назвал */
  correctId?: string;
  /**
   * История жёстких ответов: questionId → "yes" | "no".
   * Используется анти-ошибочным механизмом перед догадкой.
   */
  hardAnswers: Record<string, "yes" | "no">;
}

// ---------- утилиты ----------

/**
 * Оценка «информативности» вопроса:
 * сколько информации (битов) он даст в среднем при текущих весах.
 */
function questionInfoGain(
  q: Question,
  candidates: Entity[],
  weights: Record<string, number>
): number {
  let total = 0;
  let yesMass = 0;
  let noMass = 0;
  let naMass = 0;

  for (const e of candidates) {
    const w = weights[e.id] ?? 1;
    total += w;
    const res = q.check(e);
    if (res === true) yesMass += w;
    else if (res === false) noMass += w;
    else naMass += w;
  }

  if (total <= 0) return 0;

  const py = yesMass / total;
  const pn = noMass / total;

  // Идеальный вопрос делит массу ровно пополам.
  let score = 1 - Math.abs(py - pn);

  // Штраф за много «не знаю» (вопрос не применим к большинству)
  const naRatio = naMass / total;
  score *= 1 - naRatio * 0.7;

  // Штраф за очень мелкие разделения
  if (py < 0.05 && pn < 0.05) score *= 0.5;

  return Math.max(score, 0);
}

/** Выбор лучшего вопроса среди неиспользованных */
function pickQuestion(
  candidates: Entity[],
  weights: Record<string, number>,
  asked: string[]
): Question | null {
  const askedSet = new Set(asked);
  let best: Question | null = null;
  let bestScore = -1;

  const questions = [...QUESTIONS].sort((a, b) => a.id.localeCompare(b.id));

  for (const q of questions) {
    if (askedSet.has(q.id)) continue;
    const score = questionInfoGain(q, candidates, weights);
    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }

  // Если все вопросы уже задавались — разрешаем повторять
  if (!best || bestScore <= 0) {
    for (const q of questions) {
      const score = questionInfoGain(q, candidates, weights) * 0.5;
      if (score > bestScore) {
        bestScore = score;
        best = q;
      }
    }
  }

  return best;
}

/**
 * АНТИ-ОШИБОЧНАЯ ПРОВЕРКА.
 * Возвращает true, если кандидат совместим со ВСЕМИ жёсткими ответами.
 * check() === null не является противоречием (нет данных).
 */
function isCompatibleWithHardAnswers(
  entity: Entity,
  hardAnswers: Record<string, "yes" | "no">
): boolean {
  for (const [qid, answer] of Object.entries(hardAnswers)) {
    const q = QUESTIONS.find((x) => x.id === qid);
    if (!q || !q.hard) continue;
    const res = q.check(entity);
    if (res === null) continue; // нет данных — не противоречие
    if (answer === "yes" && res !== true) return false;
    if (answer === "no" && res !== false) return false;
  }
  return true;
}

/**
 * Топ-кандидат, прошедший анти-ошибочную проверку.
 * Возвращает null, если ни один кандидат не совместим.
 */
function safeTopCandidate(state: EngineState): Weighted | null {
  let best: Weighted | null = null;
  for (const id of state.candidates) {
    const e = ENTITY_MAP.get(id);
    if (!e) continue;
    if (!isCompatibleWithHardAnswers(e, state.hardAnswers)) continue;
    const w = state.weights[id] ?? 0;
    if (!best || w > best.weight) best = { id, weight: w };
  }
  return best;
}

// ---------- публичный API ----------

/** Инициализация новой игры */
export function newGame(): EngineState {
  const weights: Record<string, number> = {};
  const candidates = ALL_ENTITIES.map((e) => e.id);
  for (const e of ALL_ENTITIES) weights[e.id] = 1;
  return {
    candidates,
    weights,
    asked: [],
    questionNum: 0,
    phase: "playing",
    wrongGuesses: 0,
    hardAnswers: {},
  };
}

/**
 * Применяет ответ к состоянию.
 * Возвращает новое состояние (иммутабельно).
 */
export function answer(
  state: EngineState,
  questionId: string,
  answer: Answer
): EngineState {
  const q = QUESTIONS.find((x) => x.id === questionId);
  if (!q) return state;

  const weights = { ...state.weights };
  let candidates: string[];
  const hardAnswers = { ...state.hardAnswers };

  // ---------- СТАДИЯ 1: HARD FILTER ----------
  // Жёсткий ответ (yes/no) на вопрос с hard:true
  const isHardAnswer = q.hard && (answer === "yes" || answer === "no");

  if (isHardAnswer) {
    // Запоминаем жёсткий ответ для анти-ошибочного механизма
    hardAnswers[questionId] = answer;

    // Полностью исключаем противоречащих
    candidates = state.candidates.filter((id) => {
      const e = ENTITY_MAP.get(id)!;
      const res = q.check(e);
      if (res === null) return true; // нет данных — оставляем
      // Да → только true; Нет → только false
      if (answer === "yes") return res === true;
      return res === false;
    });
  } else {
    // ---------- СТАДИЯ 2: SOFT SCORING ----------
    const factor = ANSWER_FACTOR[answer];
    candidates = [...state.candidates];

    for (const id of candidates) {
      const e = ENTITY_MAP.get(id)!;
      const res = q.check(e);
      const w = weights[id] ?? 1;
      let nw: number;
      if (res === true) nw = w * factor.yes;
      else if (res === false) nw = w * factor.no;
      else nw = w * NA_FACTOR;
      weights[id] = nw;
    }

    // Хвост: отбрасываем сущности с ничтожным весом
    const sorted = [...candidates].sort(
      (a, b) => (weights[b] ?? 0) - (weights[a] ?? 0)
    );
    const topW = weights[sorted[0]] ?? 0;
    const threshold = topW * 0.0025;
    const filtered = sorted.filter((id) => (weights[id] ?? 0) >= threshold);
    candidates = filtered.length >= 8 ? filtered : sorted.slice(0, 8);
  }

  // Если жёсткий фильтр оставил слишком мало кандидатов —
  // возвращаем удалённых с нулевым весом обратно, чтобы
  // можно было продолжить игру (игрок мог ошибиться).
  if (candidates.length < 3 && state.candidates.length > 3) {
    const kept = new Set(candidates);
    const removed = state.candidates.filter((id) => !kept.has(id));
    for (const id of removed) {
      candidates.push(id);
      weights[id] = 0.0001;
    }
  }

  const next: EngineState = {
    ...state,
    candidates,
    weights,
    asked: [...state.asked, questionId],
    questionNum: state.questionNum + 1,
    hardAnswers,
  };

  // Проверка: пора гадать?
  const top = safeTopCandidate(next);
  const totalMass = candidates.reduce((s, id) => s + (weights[id] ?? 0), 0);
  const confidence = totalMass > 0 && top ? top.weight / totalMass : 0;

  if (
    top &&
    confidence >= GUESS_CONFIDENCE &&
    state.questionNum >= MIN_QUESTIONS_BEFORE_GUESS
  ) {
    return { ...next, phase: "guessing", guessId: top.id };
  }

  if (state.questionNum >= MAX_QUESTIONS) {
    if (top) {
      return { ...next, phase: "guessing", guessId: top.id };
    }
    // Ни один кандидат не совместим с жёсткими ответами
    return { ...next, phase: "surrender" };
  }

  return next;
}

/** Топ-кандидат по весу (БЕЗ анти-ошибочной проверки — для отладки) */
export function topCandidate(state: EngineState): Weighted | null {
  let best: Weighted | null = null;
  for (const id of state.candidates) {
    const w = state.weights[id] ?? 0;
    if (!best || w > best.weight) best = { id, weight: w };
  }
  return best;
}

/** Топ-кандидат, прошедший анти-ошибочную проверку */
export function safeTopCandidateExport(state: EngineState): Weighted | null {
  return safeTopCandidate(state);
}

/** Топ-N кандидатов (для «почти угадал» / подсказок) */
export function topN(state: EngineState, n = 3): Weighted[] {
  return state.candidates
    .map((id) => ({ id, weight: state.weights[id] ?? 0 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, n);
}

/** Текущий лучший вопрос (вызывается, когда фаза = playing) */
export function currentQuestion(state: EngineState): Question | null {
  if (state.phase !== "playing") return null;
  const candidates = state.candidates
    .map((id) => ENTITY_MAP.get(id)!)
    .filter(Boolean);
  return pickQuestion(candidates, state.weights, state.asked);
}

/**
 * Игрок ответил «Нет, ошибся» на догадку.
 * Полностью исключает угаданную сущность (жёсткий ответ «нет» на «это X?»).
 */
export function rejectGuess(state: EngineState): EngineState {
  const weights = { ...state.weights };
  // Полностью исключаем угаданного
  if (state.guessId) {
    weights[state.guessId] = 0;
  }
  const candidates = state.candidates.filter(
    (id) => (weights[id] ?? 0) > 0
  );
  const next: EngineState = {
    ...state,
    weights,
    candidates,
    phase: "playing",
    guessId: undefined,
    wrongGuesses: state.wrongGuesses + 1,
  };
  if (next.wrongGuesses >= MAX_GUESS_ROUNDS) {
    return { ...next, phase: "surrender" };
  }
  return next;
}

/** Игрок ответил «Да, угадал!» */
export function acceptGuess(state: EngineState): EngineState {
  return { ...state, phase: "won", correctId: state.guessId };
}

/** Игрок назвал правильный ответ сам (после «сдаюсь» или ошибок) */
export function revealAnswer(state: EngineState, entityId: string): EngineState {
  return { ...state, phase: "lost", correctId: entityId };
}
