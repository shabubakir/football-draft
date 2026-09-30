import { describe, it, expect } from "vitest";
import {
  createGame,
  flap,
  step,
  speedForScore,
  mulberry32,
  isValidScore,
  BIRD_X,
  BIRD_R,
  BIRD_START_Y,
  GROUND_Y,
  PIPE_W,
  PIPE_SPACING,
  BASE_SPEED,
  MAX_SPEED,
  GRAVITY,
  FLAP_VY,
} from "./engine";

const DT = 1 / 60;

function run(s: ReturnType<typeof createGame>, frames: number) {
  let st = s;
  for (let i = 0; i < frames; i++) st = step(st, DT);
  return st;
}

describe("flappy engine", () => {
  it("createGame — ready phase, bird at start", () => {
    const s = createGame(42);
    expect(s.phase).toBe("ready");
    expect(s.bird.y).toBeCloseTo(BIRD_START_Y, 5);
    expect(s.score).toBe(0);
    expect(s.speed).toBe(BASE_SPEED);
    expect(s.pipes.length).toBeGreaterThanOrEqual(1);
    for (const p of s.pipes) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.gap).toBeGreaterThanOrEqual(150);
    }
  });

  it("flap in ready → playing with upward velocity", () => {
    const s = createGame(1);
    const s2 = flap(s);
    expect(s2.phase).toBe("playing");
    expect(s2.bird.vy).toBe(FLAP_VY);
  });

  it("flap in dead — no-op (restart is separate)", () => {
    let s = flap(createGame(1));
    s = { ...s, phase: "dead" };
    const s2 = flap(s);
    expect(s2.phase).toBe("dead");
    expect(s2).toBe(s);
  });

  it("pipes move left in playing, stationary in ready", () => {
    const ready = createGame(7);
    const readyAfter = run(ready, 30);
    expect(readyAfter.pipes[0].x).toBe(ready.pipes[0].x);

    const playing = flap(createGame(7));
    const before = playing.pipes[0].x;
    const after = run(playing, 30);
    expect(after.pipes[0].x).toBeLessThan(before);
  });

  it("gravity pulls bird down without flapping → death by ground", () => {
    let s = flap(createGame(3));
    // No more flaps — bird should hit the ground within ~2s
    for (let i = 0; i < 240 && s.phase === "playing"; i++) {
      s = step(s, DT);
    }
    expect(s.phase).toBe("dead");
  });

  /**
   * Бот: держит птицу вблизи центра ближайшего зазора.
   * Машет, когда птица опустилась ниже (target + 15) —
   * естественный гравитационный маятник с коррекцией.
   */
  function botTick(st: ReturnType<typeof createGame>): ReturnType<typeof createGame> {
    const ahead = st.pipes.find((p) => p.x + PIPE_W > BIRD_X - BIRD_R);
    const target = ahead ? ahead.gapCenter : 300;
    if (st.bird.y > target + 15) return flap(st);
    return st;
  }

  it("smart flapping keeps bird alive for a long time", () => {
    let s = flap(createGame(5));
    for (let i = 0; i < 60 * 20 && s.phase === "playing"; i++) {
      s = botTick(s);
      s = step(s, DT);
    }
    // Бот должен прожить существенно дольше 5 секунд
    if (s.phase === "dead") expect(s.elapsed).toBeGreaterThan(5);
    else expect(s.phase).toBe("playing");
  });

  it("scores points when pipes pass the bird", () => {
    let s = flap(createGame(11));
    let maxScore = 0;
    for (let i = 0; i < 60 * 40 && s.phase === "playing"; i++) {
      s = botTick(s);
      s = step(s, DT);
      maxScore = Math.max(maxScore, s.score);
    }
    expect(maxScore).toBeGreaterThanOrEqual(1);
  });

  it("deterministic with the same seed", () => {
    const a = createGame(123);
    const b = createGame(123);
    let sa = flap(a);
    let sb = flap(b);
    for (let i = 0; i < 300; i++) {
      if (i % 9 === 0) { sa = flap(sa); sb = flap(sb); }
      sa = step(sa, DT);
      sb = step(sb, DT);
      if (sa.phase === "dead") break;
    }
    expect(sa.score).toBe(sb.score);
    expect(sa.bird.y).toBeCloseTo(sb.bird.y, 4);
    expect(sa.pipes).toEqual(sb.pipes);
  });

  it("speed grows with score and is capped", () => {
    expect(speedForScore(0)).toBe(BASE_SPEED);
    expect(speedForScore(5)).toBe(BASE_SPEED + 16);
    expect(speedForScore(10)).toBe(BASE_SPEED + 32);
    expect(speedForScore(10000)).toBe(MAX_SPEED);
    expect(speedForScore(10000)).toBeLessThanOrEqual(MAX_SPEED);
  });

  it("collision with a pipe kills the bird", () => {
    // Craft a state: pipe gap placed so the bird (at fixed X) intersects it
    const s = {
      ...createGame(9),
      phase: "playing" as const,
      bird: { y: 100, vy: 0, rot: 0 },
      // Pipe right at the bird's X, gap centered at 400 (bird at 100 is far above)
      pipes: [{ x: BIRD_X - BIRD_R - 5, gapCenter: 400, gap: 160, scored: false }],
    };
    const s2 = step(s, DT);
    expect(s2.phase).toBe("dead");
  });

  it("bird inside the gap survives the pipe", () => {
    const s = {
      ...createGame(9),
      phase: "playing" as const,
      bird: { y: 400, vy: 0, rot: 0 },
      pipes: [{ x: BIRD_X - BIRD_R - 5, gapCenter: 400, gap: 160, scored: false }],
    };
    const s2 = step(s, DT);
    expect(s2.phase).toBe("playing");
  });

  it("ground collision at GROUND_Y", () => {
    const s = {
      ...createGame(9),
      phase: "playing" as const,
      bird: { y: GROUND_Y - BIRD_R, vy: 10, rot: 0 },
      pipes: [{ x: 1000, gapCenter: 300, gap: 160, scored: true }],
    };
    const s2 = step(s, DT);
    expect(s2.phase).toBe("dead");
  });

  it("pipes recycle: old ones removed, new ones spawned to keep stream", () => {
    let s = flap(createGame(21));
    for (let i = 0; i < 60 * 20 && s.phase === "playing"; i++) {
      const ahead = s.pipes.find((p) => p.x + PIPE_W > BIRD_X - BIRD_R);
      const target = ahead ? ahead.gapCenter : 300;
      if (s.bird.y > target + 15) s = flap(s);
      s = step(s, DT);
    }
    // Stream of pipes must always cover the right side of the screen
    const maxX = Math.max(...s.pipes.map((p) => p.x));
    expect(maxX).toBeGreaterThan(300);
    expect(Math.min(...s.pipes.map((p) => p.x))).toBeLessThanOrEqual(380);
  });

  it("isValidScore rejects impossible scores", () => {
    expect(isValidScore(0, 1)).toBe(true);
    expect(isValidScore(5, 10)).toBe(true);
    // 500 points in 5 seconds is impossible
    expect(isValidScore(500, 5)).toBe(false);
    // Max plausible ≈ elapsed * (BASE_SPEED / PIPE_SPACING) + 3
    const max = Math.floor(10 * (BASE_SPEED / PIPE_SPACING)) + 3;
    expect(isValidScore(max, 10)).toBe(true);
    expect(isValidScore(max + 50, 10)).toBe(false);
  });

  it("mulberry32 is deterministic and in [0,1)", () => {
    const a = mulberry32(5);
    const b = mulberry32(5);
    for (let i = 0; i < 10; i++) {
      const x = a();
      const y = b();
      expect(x).toBe(y);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("step with large dt (background tab) doesn't explode", () => {
    let s = flap(createGame(33));
    // Simulate a 2-second jump (tab was hidden)
    s = step(s, 2);
    expect(Number.isFinite(s.bird.y)).toBe(true);
    expect(Number.isFinite(s.bird.vy)).toBe(true);
  });
});
