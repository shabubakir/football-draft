// ============================================================
// FOOTBALL AKINATOR — движок (алгоритм угадывания) v3
// ============================================================
//
//  HARD FILTER  — жёсткие ответы (Да/Нет на hard-вопросы)
//    записываются в hardAnswers и влияют на ВЕСА (×5.5 / ÷5.5)
//    + исключают прямые противоречия из кандидатов.
//    check() === null НЕ исключает (нет данных ≠ противоречие).
//
//  SOFT SCORING — мягкие ответы и «не знаю»:
//    Да = ×2.2, Скорее да = ×1.35, Не знаю = ×1.06,
//    Скорее нет = ×0.75, Нет = ×0.4, н/д = ×0.92.
//
//  ANTI-ERROR   — догадка может противоречить ТОЛЬКО тем
//    жёстким ответам, по которым у кандидата ЕСТЬ данные
//    (check() !== null). Кандидат «без данных» не противоречит —
//    он просто не получает за это бонус в ранге догадок.
//
//  ПРАВИЛЬНЫЕ ВОПРОСЫ — вопрос, к которому кандидат «не относится»
//    (check() === null), НЕ задаётся ему. Например, когда кандидаты
//    — футболисты, вопросы про стадионы/лиги/турниры отпадают
//    сами собой, без всякой «групповой» логики.
//
// ============================================================

import type { Answer, Entity, Question } from "./types";
import { ALL_ENTITIES, ENTITY_MAP, QUESTIONS } from "./data";

// ---------- веса ответов ----------
const ANSWER_FACTOR: Record<Answer, { yes: number; no: number }> = {
  yes:        { yes: 2.2,  no: 0.4  },
  no:         { yes: 0.4,  no: 2.2  },
  maybe_yes:  { yes: 1.35, no: 0.75 },
  maybe_no:   { yes: 0.75, no: 1.35 },
  unknown:    { yes: 1.06, no: 0.95 },
};

/** Жёсткий ответ: сильный множитель, чтобы кандидаты с данными
 *  «догнали» кандидатов без данных по этому свойству. */
const HARD_FACTOR: Record<Answer, { yes: number; no: number }> = {
  yes:        { yes: 5.5, no: 0.18 },
  no:         { yes: 0.18, no: 5.5 },
  maybe_yes:  { yes: 2.0, no: 0.5 },
  maybe_no:   { yes: 0.5, no: 2.0 },
  unknown:    { yes: 1.0, no: 1.0 },
};

// При «н/д» (у сущности нет данных по свойству) — лёгкий штраф.
const NA_FACTOR = 0.92;

// ---------- пороги ----------
const GUESS_CONFIDENCE = 0.45;
const MAX_QUESTIONS = 25;
const MAX_GUESS_ROUNDS = 3;
const MIN_QUESTIONS_BEFORE_GUESS = 4;
/** Доля массы (yes+no), которая должна «понимать» вопрос,
 *  чтобы он вообще рассматривался. */
const MIN_APPLICABLE_RATIO = 0.3;

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
  /** История жёстких ответов: questionId → "yes" | "no" */
  hardAnswers: Record<string, "yes" | "no">;
}

// ---------- утилиты ----------

/** Считает массу «Да/Нет/н/д» по вопросу среди кандидатов. */
function questionMass(
  q: Question,
  candidates: Entity[],
  weights: Record<string, number>
): { total: number; yesMass: number; noMass: number } {
  let total = 0, yesMass = 0, noMass = 0;
  for (const e of candidates) {
    const w = weights[e.id] ?? 1;
    total += w;
    const res = q.check(e);
    if (res === true) yesMass += w;
    else if (res === false) noMass += w;
  }
  return { total, yesMass, noMass };
}

/**
 * Вопрос применим, если значительная часть (≥ 30%) массы кандидатов
 * по нему имеет данные (Да или Нет). Иначе вопрос «слепой»:
 * большинство ответит «н/д» и информации он не даст.
 */
function isApplicable(
  q: Question,
  candidates: Entity[],
  weights: Record<string, number>
): boolean {
  const { total, yesMass, noMass } = questionMass(q, candidates, weights);
  return total > 0 && (yesMass + noMass) / total >= MIN_APPLICABLE_RATIO;
}

/**
 * Information gain: насколько вопрос делит текущую массу.
 * Идеальный вопрос — ровно пополам. Плюс небольшой бонус
 * за жёсткость (такие вопросы сразу режут базу).
 */
function questionInfoGain(
  q: Question,
  candidates: Entity[],
  weights: Record<string, number>
): number {
  const { total, yesMass, noMass } = questionMass(q, candidates, weights);
  if (total <= 0) return 0;
  const py = yesMass / total;
  const pn = noMass / total;
  let score = 1 - Math.abs(py - pn);
  // штраф, если значимая часть массы «слепая» по этому вопросу
  score *= 1 - ((total - yesMass - noMass) / total) * 0.7;
  // штраф за микроскопические разделения
  if (py < 0.05 && pn < 0.05) score *= 0.5;
  if (q.hard) score *= 1.05; // жёсткий вопрос чуть предпочтительнее
  return Math.max(score, 0);
}

function pickQuestion(
  candidates: Entity[],
  weights: Record<string, number>,
  asked: string[],
  hardAnswers: Record<string, "yes" | "no">
): Question | null {
  const askedSet = new Set(asked);
  // Только применимые вопросы (≥30% кандидатов имеют данные)
  const pool = QUESTIONS.filter((q) => isApplicable(q, candidates, weights));
  const fresh = pool.filter((q) => !askedSet.has(q.id));

  // ---------- Стратегия по количеству кандидатов ----------
  // Меньше 100 сущностей — обычный information gain работает отлично.
  // Когда кандидатов мало (<= 40), info-gain застревает на «слабых»
  // вопросах (например, «Из Японии?» делит 1 к 30), и игра тянется.
  // Поэтому для маленьких пулов переключаемся на «бисекцию»:
  // ищем вопрос, который делит массу кандидатов максимально ровно.

  if (candidates.length <= 40) {
    // Бисекция: ищем вопрос, делящий массу максимально ровно
    let best: Question | null = null;
    let bestScore = -Infinity;

    for (const q of fresh) {
      const { total: t, yesMass, noMass } = questionMass(q, candidates, weights);
      if (t <= 0) continue;
      // Близость к идеальной бисекции: 1 = идеально, 0 = все в одну сторону
      const balance = 1 - Math.abs(yesMass / t - noMass / t);
      // Штраф за «слепых» (check() === null): они не дают информации
      const blindPenalty = ((t - yesMass - noMass) / t) * 0.5;
      const score = balance - blindPenalty;
      if (score > bestScore) { bestScore = score; best = q; }
    }

    if (best) return best;
    // Нет свежих — повторяем, но с приоритетом к лучшим
    for (const q of pool) {
      const { total: t, yesMass, noMass } = questionMass(q, candidates, weights);
      if (t <= 0) continue;
      const balance = 1 - Math.abs(yesMass / t - noMass / t);
      const blindPenalty = ((t - yesMass - noMass) / t) * 0.5;
      if (balance - blindPenalty > bestScore) { bestScore = balance - blindPenalty; best = q; }
    }
    if (best) return best;
    return QUESTIONS[0];
  }

  // ---------- Обычный режим (большие пулы) ----------
  let best: Question | null = null;
  let bestScore = -1;

  for (const q of fresh) {
    const score = questionInfoGain(q, candidates, weights);
    if (score > bestScore) { bestScore = score; best = q; }
  }
  if (!best) {
    for (const q of pool) {
      const score = questionInfoGain(q, candidates, weights) * 0.5;
      if (score > bestScore) { bestScore = score; best = q; }
    }
  }
  if (!best) best = QUESTIONS[0];
  return best;
}

/**
 * АНТИ-ОШИБОЧНАЯ ПРОВЕРКА.
 * Кандидат совместим, если он НЕ ПРОТИВОРЕЧИТ ни одному жёсткому
 * ответу. Отсутствие данных (check() === null) — НЕ противоречие:
 * мы не знаем, но и не можем утверждать обратное.
 */
function isCompatibleWithHardAnswers(
  entity: Entity,
  hardAnswers: Record<string, "yes" | "no">
): boolean {
  for (const [qid, ans] of Object.entries(hardAnswers)) {
    const q = QUESTIONS.find((x) => x.id === qid);
    if (!q || !q.hard) continue;
    const res = q.check(entity);
    if (res === null) continue; // нет данных — противоречия нет (не знаем)
    // У сущности ЕСТЬ данные: жёсткий ответ не совпадает → противоречие.
    // Важно: res === false на вопрос с ответом «Да» — это прямое
    // противоречие (игрок НЕ играл за этот клуб), а не «нет данных».
    if (ans === "yes" && res === false) return false;
    if (ans === "no" && res === true) return false;
  }
  return true;
}

/**
 * Топ-кандидат для догадки.
 *  1. Сначала ищем среди кандидатов, совместимых со ВСЕМИ
 *     жёсткими ответами и имеющих данные по всем жёстким вопросам
 *     («проверенные» кандидаты).
 *  2. Если таких нет — любой непротиворечивый кандидат.
 */
function safeTopCandidate(state: EngineState): Weighted | null {
  let best: Weighted | null = null;
  let bestFallback: Weighted | null = null;
  for (const id of state.candidates) {
    const e = ENTITY_MAP.get(id);
    if (!e) continue;
    const w = state.weights[id] ?? 0;
    if (w <= 0) continue;
    // основной: полная совместимость + данные по всем жёстким
    const hardIds = Object.keys(state.hardAnswers).filter(
      (qid) => QUESTIONS.find((x) => x.id === qid)?.hard
    );
    const fullyKnown = hardIds.every(
      (qid) => QUESTIONS.find((x) => x.id === qid)!.check(e) !== null
    );
    if (fullyKnown) {
      if (isCompatibleWithHardAnswers(e, state.hardAnswers)) {
        if (!best || w > best.weight) best = { id, weight: w };
      }
    } else if (isCompatibleWithHardAnswers(e, state.hardAnswers)) {
      if (!bestFallback || w > bestFallback.weight) bestFallback = { id, weight: w };
    }
  }
  return best ?? bestFallback;
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
 * Применяет ответ к состоянию. Возвращает новое состояние.
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

  const isHardAnswer = q.hard && (answer === "yes" || answer === "no");

  if (isHardAnswer) {
    // Жёсткий ответ запоминаем для анти-ошибочного механизма
    hardAnswers[questionId] = answer;

    // Исключаем прямые противоречия, остальные получают
    // сильный множитель (у кого есть данные) или лёгкий штраф.
    candidates = state.candidates.filter((id) => {
      const e = ENTITY_MAP.get(id)!;
      const res = q.check(e);
      if (res === null) return true; // нет данных — не противоречие
      if (answer === "yes") return res === true;
      return res === false;
    });
    for (const id of candidates) {
      const e = ENTITY_MAP.get(id)!;
      const res = q.check(e);
      const w = weights[id] ?? 1;
      if (res === true) weights[id] = w * HARD_FACTOR[answer].yes;
      else if (res === false) weights[id] = w * HARD_FACTOR[answer].no;
      else weights[id] = w * NA_FACTOR;
    }
  } else {
    // Мягкий скоринг
    const factor = ANSWER_FACTOR[answer];
    candidates = [...state.candidates];
    for (const id of candidates) {
      const e = ENTITY_MAP.get(id)!;
      const res = q.check(e);
      const w = weights[id] ?? 1;
      weights[id] = res === true ? w * factor.yes
        : res === false ? w * factor.no
        : w * NA_FACTOR;
    }
  }

  // Хвост: отбрасываем сущности с ничтожным весом
  const sorted = [...candidates].sort(
    (a, b) => (weights[b] ?? 0) - (weights[a] ?? 0)
  );
  const topW = weights[sorted[0]] ?? 0;
  const threshold = topW * 0.0025;
  const filtered = sorted.filter((id) => (weights[id] ?? 0) >= threshold);
  candidates = filtered.length >= 8 ? filtered : sorted.slice(0, 8);

  // Если жёсткий фильтр оставил слишком мало — возвращаем
  // исключённых с крошечным весом (игрок мог ошибиться).
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

  // Пора гадать?
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
    if (top) return { ...next, phase: "guessing", guessId: top.id };
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

/** Текущий лучший вопрос (фаза = playing) */
export function currentQuestion(state: EngineState): Question | null {
  if (state.phase !== "playing") return null;
  const candidates = state.candidates
    .map((id) => ENTITY_MAP.get(id)!)
    .filter(Boolean);
  return pickQuestion(candidates, state.weights, state.asked, state.hardAnswers);
}

/** Игрок ответил «Нет, ошибся» на догадку */
export function rejectGuess(state: EngineState): EngineState {
  const weights = { ...state.weights };
  if (state.guessId) weights[state.guessId] = 0;
  const candidates = state.candidates.filter((id) => (weights[id] ?? 0) > 0);
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
