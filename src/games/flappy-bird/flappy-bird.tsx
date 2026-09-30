"use client";

// ============================================================
// FLAPPY BIRD — React-компонент (canvas + requestAnimationFrame)
// ============================================================
// - Чистая физика в engine.ts, здесь только отрисовка и ввод.
// - Фиксированный шаг 1/60 с аккумулятором (не ускоряется на
//   высоких мониторах 120/144 Гц).
// - Pause по P/Esc/visibilitychange.
// - Гость: localStorage bestScore. Авторизованный: reportResult.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useProgression } from "@/lib/progression/use-progression";
import { useAuth } from "@/components/auth-provider";
import {
  createGame,
  flap,
  step,
  isValidScore,
  LOGICAL_W,
  LOGICAL_H,
  GROUND_Y,
  BIRD_X,
  BIRD_R,
  PIPE_W,
  type EngineState,
  type Phase,
} from "./engine";

const STORAGE_KEY = "fd_flappy_best_v1";

function loadBest(): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}
function saveBest(v: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(v));
  } catch {
    /* ignore */
  }
}

export function FlappyBirdGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [best, setBest] = useState<number>(() => loadBest());
  const { reportResult } = useProgression();
  const { isGuest } = useAuth();

  // State живёт в ref — чтобы RAF-loop не пересоздавался при ререндерах.
  const stateRef = useRef<EngineState>(createGame());
  const pausedRef = useRef(false);
  const accRef = useRef(0);
  const lastTRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // UI-состояние для React (обновляем редко — только когда меняется)
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const phaseRef = useRef<Phase>("ready");
  const scoreRef = useRef(0);
  const pausedUiRef = useRef(false);
  const reportedRef = useRef(false);

  // ---------- Запуск/остановка цикла ----------
  const startLoop = useCallback(() => {
    if (rafRef.current !== null) return;
    lastTRef.current = null;
    const tick = (t: number) => {
      const state = stateRef.current;
      if (lastTRef.current === null) lastTRef.current = t;
      let dt = (t - lastTRef.current) / 1000;
      lastTRef.current = t;
      // Защита от «прыжка» после background tab (max 100мс на итерацию)
      if (dt > 0.1) dt = 0.1;

      if (!pausedRef.current && state.phase !== "dead") {
        accRef.current += dt;
        const FIXED = 1 / 60;
        let guard = 0;
        while (accRef.current >= FIXED && guard < 8) {
          stateRef.current = step(stateRef.current, FIXED);
          accRef.current -= FIXED;
          guard++;
        }
        if (guard >= 8) accRef.current = 0; // spiral-of-death protection
      }

      draw(canvasRef.current, stateRef.current, pausedRef.current);
      syncUi();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // UI sync: React setState только при изменении
  const syncUi = useCallback(() => {
    const s = stateRef.current;
    if (phaseRef.current !== s.phase) {
      phaseRef.current = s.phase;
      setPhase(s.phase);
      // При смерти — отчёт
      if (s.phase === "dead" && !reportedRef.current) {
        reportedRef.current = true;
        const finalScore = s.score;
        const valid = isValidScore(finalScore, s.elapsed);
        const prevBest = loadBest();
        const record = valid && finalScore > prevBest;
        setIsNewRecord(record);
        if (record) {
          saveBest(finalScore);
          setBest(finalScore);
        }
        // Отчёт в progression (только если авторизован; для гостей no-op)
        void reportResult({
          gameId: "flappy-bird",
          won: valid && finalScore > 0,
          score: valid ? finalScore : 0,
          metadata: {
            valid: valid ? 1 : 0,
            elapsed: Math.round(s.elapsed),
          },
        });
      }
    }
    if (scoreRef.current !== s.score) {
      scoreRef.current = s.score;
      setScore(s.score);
    }
    if (pausedUiRef.current !== pausedRef.current) {
      pausedUiRef.current = pausedRef.current;
      setIsPaused(pausedRef.current);
    }
  }, [reportResult]);

  // ---------- Ввод: Space / click / touch / P ----------
  const doFlap = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === "dead") return; // рестарт отдельной кнопкой
    if (pausedRef.current) return;
    stateRef.current = flap(s);
  }, []);

  const restart = useCallback(() => {
    stateRef.current = createGame();
    reportedRef.current = false;
    accRef.current = 0;
    lastTRef.current = null;
    setIsNewRecord(false);
    pausedRef.current = false;
    setIsPaused(false);
    setScore(0);
    setPhase("ready");
    phaseRef.current = "ready";
    scoreRef.current = 0;
    pausedUiRef.current = false;
  }, []);

  const togglePause = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === "dead" || s.phase === "ready") return;
    pausedRef.current = !pausedRef.current;
    setIsPaused(pausedRef.current);
  }, []);

  // ---------- Монтирование: стартуем цикл, подписываемся на ввод ----------
  useEffect(() => {
    startLoop();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        const s = stateRef.current;
        if (s.phase === "dead") {
          // Space после смерти — рестарт
          restart();
        } else {
          doFlap();
        }
      } else if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        togglePause();
      } else if (e.code === "KeyR") {
        e.preventDefault();
        restart();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    // Потеря фокуса вкладки → авто-пауза (честная игра)
    const onVis = () => {
      if (document.hidden) {
        const s = stateRef.current;
        if (s.phase === "playing") {
          pausedRef.current = true;
          setIsPaused(true);
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);

    // Resize: canvas адаптируется под контейнер
    const onResize = () => {
      resizeCanvas();
    };
    window.addEventListener("resize", onResize);
    resizeCanvas();

    return () => {
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Pointer на canvas ----------
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      if (s.phase === "dead") return;
      doFlap();
    },
    [doFlap]
  );

  // ---------- Resize canvas под контейнер ----------
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = rect.width;
    const cssH = rect.height;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
  }, []);

  // ---------- Блокировка прокрутки на touch ----------
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    // Только внутри игрового canvas
    e.preventDefault();
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-4 select-none">
      {/* Табло: счёт + рекорд */}
      <div className="w-full flex items-center justify-between text-sm">
        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
          <span className="text-white/40 text-xs tracking-widest mr-2">СЧЁТ</span>
          <span className="text-2xl font-black text-cyan-300 tabular-nums">{score}</span>
        </div>
        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
          <span className="text-white/40 text-xs tracking-widest mr-2">РЕКОРД</span>
          <span className="text-2xl font-black text-amber-300 tabular-nums">
            {isNewRecord && score > 0 ? Math.max(score, best) : best}
          </span>
          {isNewRecord && (
            <span className="ml-2 text-[10px] font-bold text-emerald-400 animate-pulse">
              НОВЫЙ!
            </span>
          )}
        </div>
      </div>

      {/* Игровое поле */}
      <div
        ref={wrapRef}
        className="relative w-full max-w-[420px] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-cyan-500/30 shadow-[0_0_60px_-10px_rgba(34,211,238,0.35)]"
        onPointerDown={onPointerDown}
        onTouchMove={onTouchMove}
        style={{ touchAction: "none" }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* OVERLAY: ready */}
        {phase === "ready" && (
          <Overlay>
            <div className="text-6xl mb-4 animate-bounce">🐤</div>
            <h2 className="text-2xl font-black text-white mb-2">GOAL FLAPPY</h2>
            <p className="text-sm text-white/60 mb-6 text-center leading-relaxed">
              Нажми <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-bold">SPACE</kbd>,
              кликни или коснись экрана, чтобы взмахнуть.
              <br />
              Пролети между трубами.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                doFlap();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold text-sm tracking-wider hover:from-cyan-400 hover:to-cyan-500 transition active:scale-95"
            >
              ИГРАТЬ
            </button>
          </Overlay>
        )}

        {/* OVERLAY: paused */}
        {isPaused && phase === "playing" && (
          <Overlay>
            <div className="text-5xl mb-4">⏸️</div>
            <h2 className="text-2xl font-black text-white mb-2">ПАУЗА</h2>
            <p className="text-sm text-white/60 mb-6">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-bold">P</kbd> или{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-bold">ESC</kbd> — продолжить
            </p>
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePause();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-sm hover:bg-cyan-400 transition active:scale-95"
              >
                ПРОДОЛЖИТЬ
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  restart();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="px-6 py-2.5 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition active:scale-95"
              >
                ЗАНОВО
              </button>
            </div>
          </Overlay>
        )}

        {/* OVERLAY: dead */}
        {phase === "dead" && (
          <Overlay>
            <div className="text-5xl mb-3">💥</div>
            <h2 className="text-2xl font-black text-white mb-1">ИГРА ОКОНЧЕНА</h2>
            {isNewRecord ? (
              <div className="text-amber-300 font-bold text-lg mb-4 animate-pulse">
                🏆 Новый рекорд: {score}!
              </div>
            ) : (
              <div className="text-white/50 text-sm mb-4">
                Счёт: <span className="text-white font-bold tabular-nums">{score}</span> · Рекорд:{" "}
                <span className="text-amber-300 font-bold tabular-nums">{best}</span>
              </div>
            )}
            {!isValidScore(score, stateRef.current.elapsed) && (
              <div className="text-xs text-red-400/80 mb-3">
                Результат невалиден — рекорд не сохранён.
              </div>
            )}
            {isGuest && (
              <div className="text-[11px] text-white/30 mb-4">
                Гость: рекорд хранится локально в браузере.
              </div>
            )}
            <div className="flex flex-col gap-2 w-56">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  restart();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold text-sm tracking-wider hover:from-cyan-400 hover:to-cyan-500 transition active:scale-95"
              >
                ↻ ИГРАТЬ СНОВА
              </button>
              <div className="text-center text-[11px] text-white/30">
                или <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">SPACE</kbd>
              </div>
            </div>
          </Overlay>
        )}

        {/* Индикатор паузы по клику (не блокирует ввод) */}
        {phase === "playing" && !isPaused && (
          <div className="absolute top-3 right-3 text-[10px] text-white/30 pointer-events-none">
            P — пауза
          </div>
        )}
      </div>

      {/* Кнопка паузы (для мобильных, где нет клавиатуры) */}
      {phase === "playing" && (
        <button
          onClick={togglePause}
          className="text-xs px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition"
        >
          {isPaused ? "▶ Продолжить" : "⏸ Пауза"}
        </button>
      )}
    </div>
  );
}

// ---------- Overlay ----------
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="flex flex-col items-center px-6">{children}</div>
    </div>
  );
}

// ============================================================
// ОТРИСОВКА — собственный визуал (не оригинал Flappy Bird)
// ============================================================
function draw(canvas: HTMLCanvasElement | null, s: EngineState, paused: boolean) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cw = canvas.width;
  const ch = canvas.height;
  if (cw === 0 || ch === 0) return;

  // Масштаб логического поля → пиксели canvas
  const scale = Math.min(cw / LOGICAL_W, ch / LOGICAL_H);
  const offX = (cw - LOGICAL_W * scale) / 2;
  const offY = (ch - LOGICAL_H * scale) / 2;

  ctx.save();
  ctx.translate(offX, offY);
  ctx.scale(scale, scale);

  // --- Нео-небо (градиент) ---
  const sky = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
  sky.addColorStop(0, "#07101c");
  sky.addColorStop(0.5, "#0a1a2e");
  sky.addColorStop(1, "#0f2438");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // --- Дальний слой: неоновые горы/здания (медленное параллакс) ---
  const t = s.elapsed;
  const farOffset = (t * 12) % 200;
  ctx.fillStyle = "rgba(56, 189, 248, 0.06)";
  for (let i = -1; i < 5; i++) {
    const bx = i * 200 - farOffset;
    drawBuilding(ctx, bx, GROUND_Y - 90, 120, 90);
  }

  // --- Средний слой: неоновые здания ---
  const midOffset = (t * 26) % 160;
  ctx.fillStyle = "rgba(34, 211, 238, 0.1)";
  for (let i = -1; i < 6; i++) {
    const bx = i * 160 - midOffset + 60;
    drawBuilding(ctx, bx, GROUND_Y - 50, 80, 50);
  }

  // --- Звёзды ---
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 24; i++) {
    const sx = (i * 137 + 40) % LOGICAL_W;
    const sy = (i * 89 + 20) % (GROUND_Y - 60);
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + i * 1.7));
    ctx.globalAlpha = 0.15 + tw * 0.35;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;

  // --- Трубы (неон-киберпанк) ---
  for (const p of s.pipes) {
    drawPipe(ctx, p.x, 0, p.gapCenter - p.gap / 2, PIPE_W, p.gap, p.gapCenter + p.gap / 2, GROUND_Y);
  }

  // --- Земля (неоновая сетка) ---
  drawGround(ctx, t);

  // --- Птица (голубой неон) ---
  drawBird(ctx, BIRD_X, s.bird.y, s.bird.rot, t, s.phase);

  ctx.restore();

  // --- Пауза: затемняем ---
  if (paused) {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, cw, ch);
  }
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  w: number,
  h: number
) {
  ctx.fillRect(x, top, w, h);
  // Окна
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      ctx.fillRect(x + 10 + c * (w / 2 - 5), top + 10 + r * 22, w / 3, 8);
    }
  }
}

function drawPipe(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  gapTop: number,
  w: number,
  _gap: number,
  gapBottom: number,
  groundY: number
) {
  // Верхняя труба
  const gradTop = ctx.createLinearGradient(x, 0, x + w, 0);
  gradTop.addColorStop(0, "rgba(34,211,238,0.15)");
  gradTop.addColorStop(0.5, "rgba(34,211,238,0.4)");
  gradTop.addColorStop(1, "rgba(34,211,238,0.15)");
  ctx.fillStyle = gradTop;
  ctx.fillRect(x, top, w, gapTop - top);
  // Обрамление (неон-кромка)
  ctx.strokeStyle = "rgba(34,211,238,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, top, w - 2, gapTop - top);
  // Колпак сверху
  ctx.fillStyle = "rgba(34,211,238,0.5)";
  ctx.fillRect(x - 4, gapTop - 14, w + 8, 14);
  ctx.strokeStyle = "rgba(34,211,238,0.9)";
  ctx.strokeRect(x - 3, gapTop - 13, w + 6, 12);

  // Нижняя труба
  const gradBot = ctx.createLinearGradient(x, 0, x + w, 0);
  gradBot.addColorStop(0, "rgba(34,211,238,0.15)");
  gradBot.addColorStop(0.5, "rgba(34,211,238,0.4)");
  gradBot.addColorStop(1, "rgba(34,211,238,0.15)");
  ctx.fillStyle = gradBot;
  ctx.fillRect(x, gapBottom, w, groundY - gapBottom);
  ctx.strokeStyle = "rgba(34,211,238,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, gapBottom, w - 2, groundY - gapBottom);
  // Колпак снизу
  ctx.fillStyle = "rgba(34,211,238,0.5)";
  ctx.fillRect(x - 4, gapBottom, w + 8, 14);
  ctx.strokeStyle = "rgba(34,211,238,0.9)";
  ctx.strokeRect(x - 3, gapBottom + 1, w + 6, 12);
}

function drawGround(ctx: CanvasRenderingContext2D, t: number) {
  // Земля: тёмный неон-пол с бегущей сеткой
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, LOGICAL_H);
  g.addColorStop(0, "#0a1420");
  g.addColorStop(1, "#050a12");
  ctx.fillStyle = g;
  ctx.fillRect(0, GROUND_Y, LOGICAL_W, LOGICAL_H - GROUND_Y);

  // Сетка (перспектива)
  ctx.strokeStyle = "rgba(34,211,238,0.25)";
  ctx.lineWidth = 1;
  const gridOff = (t * 80) % 40;
  for (let x = -40; x < LOGICAL_W + 40; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x - gridOff, GROUND_Y);
    ctx.lineTo(x - gridOff - 30, LOGICAL_H);
    ctx.stroke();
  }
  for (let y = GROUND_Y; y < LOGICAL_H; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(LOGICAL_W, y);
    ctx.stroke();
  }
  // Неоновая линия по верхней кромке земли
  ctx.strokeStyle = "rgba(34,211,238,0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(LOGICAL_W, GROUND_Y);
  ctx.stroke();
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot: number,
  t: number,
  phase: Phase
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  // Тело (неоновый овал)
  const bodyGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, BIRD_R + 4);
  bodyGrad.addColorStop(0, "#7dd3fc");
  bodyGrad.addColorStop(1, "#0284c7");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_R + 2, BIRD_R, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(125,211,252,0.9)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Крыло (анимация взмаха)
  const wingFlap = phase === "ready" || phase === "playing" ? Math.sin(t * 20) * 0.5 : 0;
  ctx.save();
  ctx.translate(-2, 2);
  ctx.rotate(-0.4 + wingFlap);
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.ellipse(-4, 0, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Глаз
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(6, -4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(7, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Блик
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(8, -5, 1, 0, Math.PI * 2);
  ctx.fill();

  // Клюв
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(20, 2);
  ctx.lineTo(12, 5);
  ctx.closePath();
  ctx.fill();

  // Неон-свечение
  ctx.shadowColor = "rgba(34,211,238,0.6)";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "rgba(34,211,238,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_R + 6, BIRD_R + 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}
