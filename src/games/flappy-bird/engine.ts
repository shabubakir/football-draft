// ============================================================
// FLAPPY BIRD — чистый игровой движок (без React)
// ============================================================
// Физика на фиксированном dt (60 Гц), полностью детерминирован —
// это позволяет юнит-тестить коллизии, очки и скорость.
//
// Координаты: логическое поле 360×640 (ширина×высота).
// Компонент рисует это поле в canvas и масштабирует под экран.
// ============================================================

export const LOGICAL_W = 360;
export const LOGICAL_H = 640;

/** Гравитация: px/с² */
export const GRAVITY = 1400;
/** Импulse при взмахе: px/с (отрицательный — вверх) */
export const FLAP_VY = -420;
/** Максимальная скорость падения: px/с */
export const MAX_FALL = 720;
/** Y позиции земли (небо выше) */
export const GROUND_Y = 576;
/** Y, где птица стартует */
export const BIRD_START_Y = 300;
/** X позиции птицы (фиксированная) */
export const BIRD_X = 84;
/** Полу-размер птицы (для коллизий) */
export const BIRD_R = 15;

/** Ширина трубы */
export const PIPE_W = 70;
/** Минимальный зазор между трубами */
export const GAP_MIN = 158;
/** Максимальный зазор между трубами */
export const GAP_MAX = 186;
/** Минимальный центр зазора */
export const GAP_CENTER_MIN = 170;
/** Максимальный центр зазора */
export const GAP_CENTER_MAX = GROUND_Y - 170;
/** Интервал появления труб (по X): px */
export const PIPE_SPACING = 224;
/** Стартовый отступ первой трубы справа от края экрана (px) —
 *  даёт игроку время на разгон после первого взмаха */
export const FIRST_PIPE_OFFSET = 320;

/** Базовая скорость труб: px/с */
export const BASE_SPEED = 165;
/** Прирост скорости каждые N очков */
export const SPEED_STEP_SCORE = 5;
/** Прирост скорости за шаг: px/с */
export const SPEED_STEP = 16;
/** Максимальная скорость труб: px/с */
export const MAX_SPEED = 300;

export type Phase = "ready" | "playing" | "dead";

export interface Pipe {
  /** X левого края трубы */
  x: number;
  /** Центр зазора (Y) */
  gapCenter: number;
  /** Высота зазора */
  gap: number;
  /** Очко начислено? */
  scored: boolean;
}

export interface Bird {
  y: number;
  vy: number;
  /** Угол наклона для анимации, рад */
  rot: number;
}

export interface EngineState {
  phase: Phase;
  bird: Bird;
  pipes: Pipe[];
  score: number;
  /** Скорость труб (px/с), растёт со счётом */
  speed: number;
  /** Прошедшее время игры, с (для честности анти-читом) */
  elapsed: number;
  /** Детерминированный seed для случайности */
  seed: number;
}

/** Маленький детерминированный PRNG (mulberry32) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Скорость труб для данного счёта (линейный рост до капа) */
export function speedForScore(score: number): number {
  const steps = Math.floor(score / SPEED_STEP_SCORE);
  return Math.min(MAX_SPEED, BASE_SPEED + steps * SPEED_STEP);
}

/** Сгенерировать новую трубу на заданном X */
function makePipe(x: number, rnd: () => number): Pipe {
  const gap = GAP_MIN + rnd() * (GAP_MAX - GAP_MIN);
  const lo = GAP_CENTER_MIN;
  const hi = GAP_CENTER_MAX;
  const gapCenter = lo + rnd() * (hi - lo);
  return { x, gapCenter, gap, scored: false };
}

export function createGame(seed = Date.now() & 0xffffffff): EngineState {
  const rnd = mulberry32(seed);
  const pipes: Pipe[] = [];
  // Первая труба — с большим отступом (время на разгон), дальше — по спейсингу
  for (let i = 0; i < 2; i++) {
    pipes.push(makePipe(LOGICAL_W + FIRST_PIPE_OFFSET + i * PIPE_SPACING, rnd));
  }
  return {
    phase: "ready",
    bird: { y: BIRD_START_Y, vy: 0, rot: 0 },
    pipes,
    score: 0,
    speed: BASE_SPEED,
    elapsed: 0,
    seed,
  };
}

/** Взмах крыльями. Из ready → playing. В dead — игнорируем (перезапуск отдельный). */
export function flap(s: EngineState): EngineState {
  if (s.phase === "dead") return s;
  const bird: Bird = {
    y: s.bird.y,
    vy: FLAP_VY,
    rot: s.bird.rot,
  };
  return { ...s, phase: "playing", bird };
}

/** Коллизия: труба / земля / потолок */
function isDead(bird: Bird, pipes: Pipe[]): boolean {
  // Земля
  if (bird.y + BIRD_R >= GROUND_Y) return true;
  // Потолок (не убиваем, но ограничиваем)
  if (bird.y - BIRD_R <= 0) return true;
  // Трубы: круг-прямоугольник
  for (const p of pipes) {
    const birdLeft = BIRD_X - BIRD_R;
    const birdRight = BIRD_X + BIRD_R;
    // Нет пересечения по X — пропускаем
    if (birdRight < p.x || birdLeft > p.x + PIPE_W) continue;
    const gapTop = p.gapCenter - p.gap / 2;
    const gapBottom = p.gapCenter + p.gap / 2;
    if (bird.y - BIRD_R < gapTop || bird.y + BIRD_R > gapBottom) {
      return true;
    }
  }
  return false;
}

/**
 * Один шаг физики. dt в секундах (обычно 1/60).
 * В phase "ready" птица плавно парит, трубы не двигаются.
 * В phase "dead" ничего не меняем.
 */
export function step(s: EngineState, dt: number): EngineState {
  if (s.phase === "dead") return s;

  // Готовность: лёгкое покачивание
  if (s.phase === "ready") {
    const t = s.elapsed * 3;
    const y = BIRD_START_Y + Math.sin(t) * 6;
    return { ...s, elapsed: s.elapsed + dt, bird: { ...s.bird, y, vy: 0, rot: 0 } };
  }

  // playing
  const bird: Bird = {
    y: s.bird.y,
    vy: Math.min(s.bird.vy + GRAVITY * dt, MAX_FALL),
    rot: 0,
  };
  bird.y += bird.vy * dt;
  // Потолок: фиксируем, но не убиваем
  if (bird.y - BIRD_R < 0) {
    bird.y = BIRD_R;
    if (bird.vy < 0) bird.vy = 0;
  }
  // Угол наклона: вверх при подъёме, вниз при падении
  bird.rot = Math.max(-0.45, Math.min(1.15, bird.vy / 520));

  let pipes = s.pipes;
  let score = s.score;

  // Двигаем трубы влево
  pipes = pipes.map((p) => ({ ...p, x: p.x - s.speed * dt }));

  // Очки: труба прошла мимо птицы
  let scored = false;
  pipes = pipes.map((p) => {
    if (!p.scored && p.x + PIPE_W < BIRD_X - BIRD_R) {
      score += 1;
      scored = true;
      return { ...p, scored: true };
    }
    return p;
  });

  // Удаляем трубы, ушедшие за левый край, добавляем новые справа
  pipes = pipes.filter((p) => p.x + PIPE_W > -20);
  const rnd = mulberry32(s.seed + Math.floor(s.elapsed * 60) * 7919 + pipes.length * 104729);
  // Держим постоянный поток труб: пока самый правый не закрывает
  // область справа за экраном, до генерируем новую на конце.
  let rightmost = pipes.length > 0 ? Math.max(...pipes.map((p) => p.x)) : -PIPE_SPACING;
  let guard = 0;
  while (rightmost < LOGICAL_W + 120 && guard < 8) {
    const nx = rightmost < 0 ? LOGICAL_W : rightmost + PIPE_SPACING;
    pipes = [...pipes, makePipe(nx, rnd)];
    rightmost = nx;
    guard++;
  }

  const speed = speedForScore(score);
  const elapsed = s.elapsed + dt;

  // Коллизия
  if (isDead(bird, pipes)) {
    return { ...s, bird, pipes, score, speed, elapsed, phase: "dead" };
  }

  return { ...s, bird, pipes, score, speed, elapsed };
}

/**
 * Анти-чит: оценка минимально возможного времени для счёта.
 * Каждая пара труб даёт ~1 секунду на низкой скорости. Возвращает
 * true, если elapsed >= score * MIN_TIME_PER_POINT (за вычетом
 * первого зачёта — первая труба приходит быстрее).
 */
export function isValidScore(score: number, elapsed: number): boolean {
  if (score <= 0) return true;
  // Первая пара приходит за ~1.2с, дальше ~ (PIPE_SPACING / speed) сек
  // Средняя скорость по всей игре >= BASE_SPEED, так что maxScore
  // за elapsed секунд ≈ elapsed * (BASE_SPEED / PIPE_SPACING)
  const maxPossible = Math.floor(elapsed * (BASE_SPEED / PIPE_SPACING)) + 3;
  return score <= maxPossible;
}
