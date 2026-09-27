// ============================================================
// FOOTBALL AKINATOR — движок (алгоритм угадывания)
// ============================================================
//
// Идея:
//  1. Держим множество кандидатов.
//  2. После каждого ответа пересчитываем «вес» каждого кандидата
//     (вероятность, что это загаданная сущность).
//  3. Вопрос выбирается так, чтобы максимально разделить
//     оставшуюся массу кандидатов (максимальная информативность).
//  4. Когда уверенность в топ-кандидате достаточна — гадаем.
//
// Ответы:
//  - yes / no        — полная уверенность (вес ×2 / ÷2)
//  - maybe_yes / maybe_no — частичная (вес ×1.4 / ÷1.4)
//  - unknown         — почти нейтрально (вес ×1.05 / ÷1.05)
// ============================================================

import type { Answer, Entity, Question } from "./types";
import { ALL_ENTITIES, ENTITY_MAP, QUESTIONS } from "./data";

// ---------- веса ответов ----------
const ANSWER_FACTOR: Record<Answer, { yes: number; no: number }> = {
  yes:        { yes: 2.2, no: 0.4 },
  no:         { yes: 0.4, no: 2.2 },
  maybe_yes:  { yes: 1.35, no: 0.75 },
  maybe_no:   { yes: 0.75, no: 1.35 },
  unknown:    { yes: 1.06, no: 0.95 },
};

// При «н/д» (у сущности нет данных по свойству) — лёгкий штраф,
// но не вычёркиваем: возможно, у игрока тоже нет точного ответа.
const NA_FACTOR = 0.92;

// ---------- пороговые значения ----------
const GUESS_CONFIDENCE = 0.55;    // уверенность, чтобы начать гадать
const MAX_QUESTIONS = 25;         // после этого — финальный догад
const MAX_GUESS_ROUNDS = 3;       // сколько раз гадаем, прежде чем «сдаться»
const MIN_QUESTIONS_BEFORE_GUESS = 4; // минимум вопросов перед первой догадкой

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
}

// ---------- утилиты ----------

/**
 * Оценка «информативности» вопроса:
 * сколько информации (битов) он даст в среднем при текущих весах.
 * По сути — энтропия разделения «да/нет» с учётом весов.
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
  // Мерим близость к балансу: 1 - |py - pn| (чем ближе к 0.5/0.5, тем лучше)
  let score = 1 - Math.abs(py - pn);

  // Штраф за много «не знаю» (вопрос не применим к большинству)
  const naRatio = naMass / total;
  score *= 1 - naRatio * 0.7;

  // Немного штрафруем очень мелкие разделения
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

  // Детерминированный порядок + маленький «шум» по индексу,
  // чтобы при равных scores не всегда выбирался один и тот же.
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

  const factor = ANSWER_FACTOR[answer];
  const weights = { ...state.weights };

  for (const id of state.candidates) {
    const e = ENTITY_MAP.get(id)!;
    const res = q.check(e);
    const w = weights[id] ?? 1;
    let nw: number;
    if (res === true) nw = w * factor.yes;
    else if (res === false) nw = w * factor.no;
    else nw = w * NA_FACTOR;

    weights[id] = nw;
  }
  // Хвост: отбрасываем сущности, ставшие почти невозможными
  // (относительный вес < 0.25% от лучшего), но держим минимум 8.
  const sorted = [...state.candidates].sort(
    (a, b) => (weights[b] ?? 0) - (weights[a] ?? 0)
  );
  const topW = weights[sorted[0]] ?? 0;
  const threshold = topW * 0.0025;
  const candidates =
    sorted.filter((id) => (weights[id] ?? 0) >= threshold).length >= 8
      ? sorted.filter((id) => (weights[id] ?? 0) >= threshold)
      : sorted.slice(0, 8);

  const next: EngineState = {
    ...state,
    candidates,
    weights,
    asked: [...state.asked, questionId],
    questionNum: state.questionNum + 1,
  };

  // Проверка: пора гадать?
  const top = topCandidate(next);
  const totalMass = candidates.reduce((s, id) => s + (weights[id] ?? 0), 0);
  const confidence = totalMass > 0 ? (top ? top.weight / totalMass : 0) : 0;

  if (
    confidence >= GUESS_CONFIDENCE &&
    state.questionNum >= MIN_QUESTIONS_BEFORE_GUESS // минимум 5 вопросов
  ) {
    return { ...next, phase: "guessing", guessId: top!.id };
  }

  if (state.questionNum >= MAX_QUESTIONS) {
    return { ...next, phase: "guessing", guessId: top?.id };
  }

  return next;
}

/** Топ-кандидат по весу */
export function topCandidate(state: EngineState): Weighted | null {
  let best: Weighted | null = null;
  for (const id of state.candidates) {
    const w = state.weights[id] ?? 0;
    if (!best || w > best.weight) best = { id, weight: w };
  }
  return best;
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
 * Слегка понижает вес угаданной сущности и продолжаем игру.
 */
export function rejectGuess(state: EngineState): EngineState {
  const weights = { ...state.weights };
  // Вычёркиваем угаданного и его двойников — тех, кто оказался
  // «почти так же возможен» (в пределах ×3 от веса догадки).
  if (state.guessId) {
    const gw = weights[state.guessId] ?? 1;
    for (const id of state.candidates) {
      const e = ENTITY_MAP.get(id)!;
      const guessE = ENTITY_MAP.get(state.guessId)!;
      const w = weights[id] ?? 0;
      const isTwin =
        e.category === guessE.category &&
        w >= gw * 0.33 &&
        w <= gw * 3;
      if (id === state.guessId || isTwin) {
        weights[id] = 0.0001;
      }
    }
  }
  const candidates = state.candidates.filter(
    (id) => (weights[id] ?? 0) > 0.0005
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
