"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProgression } from "@/lib/progression/use-progression";

// ============================================================
// ПОСЛЕДНЯЯ СМЕНА — автономный хоррор (raycasting, Web Audio)
// Конвертирован из одного HTML-файла в React-компонент.
// ============================================================

type MonsterState = "IDLE" | "STALKING" | "CHASE" | "SEARCHING" | "RETREAT";

interface Monster {
  x: number;
  y: number;
  active: boolean;
  stun: number;
  state: MonsterState;
  path: { x: number; y: number }[];
  repath: number;
  spawnTimer: number;
  seen: number;
  searchTimer: number;
}

interface Fuse {
  x: number;
  y: number;
  taken: boolean;
}

interface Exit {
  x: number;
  y: number;
}

const MAP = [
  "################",
  "#S....#........#",
  "#.##..#.####.#.#",
  "#....##....#.#.#",
  "####....##.#...#",
  "#..F.#.....###.#",
  "#.##.#.###.....#",
  "#....#...#..##.#",
  "##.###.#.#.....#",
  "#.....#.#.####.#",
  "#.###...#....F.#",
  "#...#.####.##..#",
  "###.#......#...#",
  "#F..####.#...E.#",
  "#..............#",
  "################",
];

function wall(grid: string[][], x: number, y: number, doorOpen: boolean): boolean {
  const c = grid[Math.floor(y)]?.[Math.floor(x)];
  return !c || c === "#" || (c === "D" && !doorOpen);
}

function dist(a: number, b: number, c: number, d: number): number {
  return Math.hypot(a - c, b - d);
}

function hasLineOfSight(
  grid: string[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  doorOpen: boolean
): boolean {
  const d = dist(x1, y1, x2, y2);
  const n = Math.ceil(d / 0.12);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (wall(grid, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, doorOpen)) return false;
  }
  return true;
}

function findPath(
  grid: string[][],
  doorOpen: boolean,
  sx: number,
  sy: number,
  tx: number,
  ty: number
): { x: number; y: number }[] {
  const start = { x: Math.floor(sx), y: Math.floor(sy) };
  const goal = { x: Math.floor(tx), y: Math.floor(ty) };
  const key = (x: number, y: number) => x + "," + y;
  const q = [start];
  const prev = new Map<string, string | null>();
  prev.set(key(start.x, start.y), null);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let i = 0; i < q.length; i++) {
    const p = q[i];
    if (p.x === goal.x && p.y === goal.y) break;
    for (const [dx, dy] of dirs) {
      const x = p.x + dx;
      const y = p.y + dy;
      const k = key(x, y);
      if (prev.has(k) || wall(grid, x + 0.5, y + 0.5, doorOpen)) continue;
      prev.set(k, key(p.x, p.y));
      q.push({ x, y });
    }
  }
  let k: string | null = key(goal.x, goal.y);
  if (!prev.has(k!)) return [];
  const out: { x: number; y: number }[] = [];
  while (k) {
    const [x, y] = k.split(",").map(Number);
    out.push({ x: x + 0.5, y: y + 0.5 });
    k = prev.get(k) ?? null;
  }
  return out.reverse().slice(1);
}

function zoneAt(x: number, y: number) {
  if (x >= 11 && y >= 10)
    return { name: "ЗОНА E · ВЫХОД", base: [25, 53, 38], accent: [50, 150, 88] };
  if (x >= 10 && y <= 5)
    return { name: "ЗОНА D · ГЕНЕРАТОРНАЯ", base: [64, 28, 29], accent: [165, 38, 35] };
  if (x >= 8 && y >= 7 && y <= 11)
    return { name: "ЗОНА C · МЕДБЛОК", base: [35, 54, 43], accent: [77, 128, 91] };
  if (x <= 5 && y >= 4 && y <= 11)
    return { name: "ЗОНА B · СКЛАД", base: [61, 48, 35], accent: [177, 132, 52] };
  return {
    name: "ЗОНА A · ТЕХНИЧЕСКИЙ КОРИДОР",
    base: [35, 48, 56],
    accent: [87, 145, 168],
  };
}

type AudioCtx = AudioContext | null;

function makeSoundFn(ctxRef: { current: AudioCtx }) {
  return function sound(
    freq = 100,
    dur = 0.12,
    type: OscillatorType = "sine",
    vol = 0.04
  ) {
    try {
      if (!ctxRef.current) return;
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch {
      /* ignore */
    }
  };
}

export default function LastShift() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioCtx>(null);
  const runningRef = useRef(false);
  const rafIdRef = useRef(0);
  const [phase, setPhase] = useState<"menu" | "playing" | "dead" | "won">("menu");
  const [muted, setMuted] = useState(false);
  const [fuseCount, setFuseCount] = useState(0);
  const [totalFuses, setTotalFuses] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [staminaDisplay, setStaminaDisplay] = useState(100);
  const { reportResult } = useProgression();



  const finishGameRef = useRef<(won: boolean, seconds: number) => void>(() => {});

  const soundRef = useRef(
    makeSoundFn({ current: null as AudioCtx })
  );
  // Re-bind sound to real ctx once available
  useEffect(() => {
    soundRef.current = makeSoundFn(audioCtxRef);
  }, []);

  const reportRef = useRef(reportResult);
  reportRef.current = reportResult;

  const finishGame = useCallback((won: boolean, seconds: number) => {
    // Local best time (guest + authed)
    if (won) {
      const key = "fd_last_shift_best_v1";
      const prev =
        typeof window !== "undefined" ? Number(localStorage.getItem(key) ?? "0") : 0;
      if (!prev || seconds < prev) {
        localStorage.setItem(key, String(Math.floor(seconds)));
        setBestTime(Math.floor(seconds));
      }
    }
    // Server-side progression (authed only; validated server-side)
    reportRef.current({
      gameId: "last-shift",
      won,
      metadata: {
        time: Math.floor(seconds),
        valid: 1,
      },
    }).catch(() => {});
  }, []);
  finishGameRef.current = finishGame;

  const start = () => {
    runningRef.current = true;
    setPhase("playing");
    setFuseCount(0);
    setElapsed(0);
    setStaminaDisplay(100);
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) audioCtxRef.current = new AC();
    } catch {
      /* ignore */
    }
    soundRef.current(90, 0.4, "sine", 0.04);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = Number(localStorage.getItem("fd_last_shift_best_v1") ?? "0");
    if (prev > 0) setBestTime(prev);
  }, []);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (audioCtxRef.current) {
        if (next) audioCtxRef.current.suspend().catch(() => {});
        else audioCtxRef.current.resume().catch(() => {});
      }
      return next;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let zbuf: number[] = [];
    let dead = false;
    let won = false;
    let flashlight = true;
    const keys: Record<string, boolean> = {};
    let last = 0;
    let elapsed = 0;
    let noise = 0;
    let steps = 0;
    let doorOpen = false;
    
    // Animation state
    let animTime = 0;
    let cameraShakeX = 0;
    let cameraShakeY = 0;
    let shakeIntensity = 0;
    let flashlightFlicker = 1;

    // Parse map
    const grid = MAP.map((r) => r.split(""));
    let px = 1.5;
    let py = 1.5;
    let ang = 0;
    let fuses = 0;
    const monster: Monster = {
      x: 13.5,
      y: 2.5,
      active: false,
      stun: 0,
      state: "IDLE",
      path: [],
      repath: 0,
      spawnTimer: 38,
      seen: 0,
      searchTimer: 0,
    };
    let stamina = 100;
    let tension = 0;
    let ambientTimer = 5;
    let heartTimer = 0;
    const fuseSpots: Fuse[] = [];
    let exit: Exit = { x: 14.5, y: 13.5 };

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === "S") {
          px = x + 0.5;
          py = y + 0.5;
          grid[y][x] = ".";
        }
        if (grid[y][x] === "F") fuseSpots.push({ x: x + 0.5, y: y + 0.5, taken: false });
        if (grid[y][x] === "E") {
          exit = { x: x + 0.5, y: y + 0.5 };
          grid[y][x] = "D";
        }
      }
    }
    setTotalFuses(fuseSpots.length);

    const w = (x: number, y: number) => wall(grid, x, y, doorOpen);

    const parent = canvas.parentElement;
    const resize = () => {
      const rect = parent?.getBoundingClientRect();
      W = canvas.width = Math.max(320, Math.floor(rect?.width ?? window.innerWidth));
      H = canvas.height = Math.max(240, Math.floor(rect?.height ?? window.innerHeight));
    };
    window.addEventListener("resize", resize);
    resize();

    const move = (dx: number, dy: number) => {
      if (!w(px + dx, py)) px += dx;
      if (!w(px, py + dy)) py += dy;
    };

    const interact = () => {
      let nearest: Fuse | null = null;
      let nd = 1.25;
      for (const f of fuseSpots) {
        if (!f.taken) {
          const d = dist(px, py, f.x, f.y);
          if (d < nd) {
            nearest = f;
            nd = d;
          }
        }
      }
      if (nearest) {
        nearest.taken = true;
        fuses++;
        setFuseCount(fuses);
        soundRef.current(720, 0.12, "square", 0.05);
        if (fuses === 3) {
          monster.active = true;
          noise = 0;
          soundRef.current(75, 0.8, "sawtooth", 0.08);
        }
        return;
      }
      if (dist(px, py, exit.x, exit.y) < 1.7) {
        if (fuses >= 3) {
          won = true;
          runningRef.current = false;
          setPhase("won");
          finishGameRef.current(true, elapsed);
        } else {
          soundRef.current(100, 0.25, "square", 0.04);
        }
        return;
      }
      soundRef.current(180, 0.06, "square", 0.02);
    };

    const normalizeCode = (code: string): string => {
      const codes: Record<string, string> = {
        KeyW: "w",
        KeyA: "a",
        KeyS: "s",
        KeyD: "d",
        KeyE: "e",
        KeyF: "f",
        ArrowUp: "arrowup",
        ArrowDown: "arrowdown",
        ArrowLeft: "arrowleft",
        ArrowRight: "arrowright",
        ShiftLeft: "shift",
        ShiftRight: "shift",
        Space: " ",
      };
      return codes[code] || "";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = normalizeCode(e.code);
      if (!k) return;
      e.preventDefault();
      if (!keys[k] && k === "e" && runningRef.current) interact();
      if (!keys[k] && k === "f" && runningRef.current) {
        flashlight = !flashlight;
        soundRef.current(flashlight ? 500 : 150, 0.08, "square", 0.025);
      }
      keys[k] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = normalizeCode(e.code);
      if (k) {
        keys[k] = false;
        e.preventDefault();
      }
    };
    const onBlur = () => {
      for (const k in keys) keys[k] = false;
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);

    const onCanvasClick = () => {
      if (!runningRef.current) return;
      canvas.focus({ preventScroll: true });
      if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
        try {
          const result = canvas.requestPointerLock() as unknown as Promise<void>;
          if (result && typeof result.catch === "function") result.catch(() => {});
        } catch {
          /* ignore */
        }
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!runningRef.current) return;
      if (document.pointerLockElement === canvas) {
        ang += (e.movementX || 0) * 0.0026;
      }
    };
    canvas.addEventListener("click", onCanvasClick);
    document.addEventListener("mousemove", onMouseMove);

    const castRay = (angle: number) => {
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      let distv = 0;
      let hit = "";
      let tx = 0;
      let ty = 0;
      const step = 0.025;
      while (distv < 18) {
        distv += step;
        const x = px + cos * distv;
        const y = py + sin * distv;
        if (w(x, y)) {
          tx = Math.floor(x);
          ty = Math.floor(y);
          hit = grid[ty]?.[tx] || "#";
          break;
        }
      }
      return { d: distv * Math.cos(angle - ang), hit, tx, ty };
    };

    const sprite = (x: number, y: number, color: string, size: number, animated: boolean = false) => {
      const dx = x - px;
      const dy = y - py;
      const d = Math.hypot(dx, dy);
      let a = Math.atan2(dy, dx) - ang;
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      const fov = Math.PI / 2.9;
      if (Math.abs(a) > fov / 2 || d < 0.15) return;
      const sx = ((a + fov / 2) / fov) * W;
      const idx = Math.max(0, Math.min(zbuf.length - 1, Math.floor((sx / W) * zbuf.length)));
      if (d > zbuf[idx] + 0.15) return;
      
      // Animated bobbing for fuses
      let bobY = 0;
      let pulse = 1;
      if (animated) {
        bobY = Math.sin(animTime * 3) * 0.02 * d;
        pulse = 1 + Math.sin(animTime * 4) * 0.15;
      }
      
      const sh = Math.min(H * 0.7, H / (d * 0.9)) * size * pulse;
      const sw = sh * 0.58;
      const sy = H / 2 - sh / 2 + bobY;
      ctx.save();
      
      // Glow effect
      const glowIntensity = animated ? 0.6 + Math.sin(animTime * 4) * 0.4 : 0.4;
      ctx.shadowBlur = 25 * glowIntensity;
      ctx.shadowColor = color;
      
      // Main body
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(sx - sw / 2, sy, sw, sh);
      
      // Inner detail
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#171b1b";
      ctx.fillRect(sx - sw * 0.25, sy + sh * 0.15, sw * 0.5, sh * 0.22);
      
      // Highlight
      if (animated) {
        ctx.globalAlpha = 0.4 + Math.sin(animTime * 6) * 0.2;
        ctx.fillStyle = "#fff";
        ctx.fillRect(sx - sw * 0.3, sy + sh * 0.1, sw * 0.2, sh * 0.15);
      }
      
      ctx.restore();
    };

    const render = () => {
      // Apply camera shake
      ctx.save();
      ctx.translate(cameraShakeX, cameraShakeY);
      
      // Sky/ceiling
      ctx.fillStyle = "#0a0f12";
      ctx.fillRect(0, 0, W, H / 2);
      
      // Floor with gradient
      ctx.fillStyle = "#050708";
      ctx.fillRect(0, H / 2, W, H / 2);
      for (let y = H / 2; y < H; y += 4) {
        const shade = Math.max(2, 12 - ((y - H / 2) / (H / 2)) * 10);
        ctx.fillStyle = `rgb(${shade},${shade + 1},${shade + 2})`;
        ctx.fillRect(0, y, W, 4);
      }
      
      const fov = Math.PI / 2.9;
      const cols = Math.ceil(W / 2);
      zbuf.length = cols;
      for (let i = 0; i < cols; i++) {
        const rayAng = ang - fov / 2 + (i / cols) * fov;
        const r = castRay(rayAng);
        const d = Math.max(0.08, r.d);
        zbuf[i] = d;
        const wh = Math.min(H * 2, H / (d * 0.82));
        const top = H / 2 - wh / 2;
        const side = Math.abs(Math.sin(rayAng)) > 0.7 ? 0.72 : 1;
        
        // Flashlight with flicker
        const light = flashlight ? Math.max(0.08, 1 - d / 8) * flashlightFlicker : Math.max(0.035, 0.2 - d / 30);
        const cone = flashlight ? Math.max(0.2, 1 - Math.abs(i / cols - 0.5) * 1.6) : 0.4;
        const v = Math.floor(Math.max(3, 100 * light * cone * side));
        const zone = zoneAt(r.tx, r.ty);
        const boost = Math.max(0.08, light * cone * side);
        
        // Base wall color
        const rgb = zone.base.map((c) => Math.max(2, Math.floor(c * boost)));
        
        // Door special coloring
        if (r.hit === "D") {
          const doorGlow = doorOpen ? 0.4 + Math.sin(animTime * 4) * 0.2 : 0.1;
          ctx.fillStyle = `rgb(${Math.max(3, (v * 0.25) | 0)},${Math.max(8, (v * 0.8) | 0)},${Math.max(3, (v * 0.35) | 0)})`;
          if (doorOpen) {
            ctx.fillStyle = `rgba(85, 255, 155, ${doorGlow * 0.3})`;
            ctx.fillRect(i * 2, top + wh * 0.3, 3, wh * 0.4);
          }
        } else {
          ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        }
        ctx.fillRect(i * 2, top, 3, wh);
        
        // Wall details - pipes, grime, cracks
        if (wh > 30) {
          const detailAlpha = Math.max(0.02, 0.15 / (d * 0.3));
          
          // Horizontal pipe at 1/4 height
          if ((i * 7) % 23 < 3) {
            ctx.fillStyle = `rgba(${zone.accent[0] * 0.6},${zone.accent[1] * 0.6},${zone.accent[2] * 0.6},${detailAlpha})`;
            ctx.fillRect(i * 2, top + wh * 0.22, 3, Math.max(2, wh * 0.015));
          }
          
          // Lower pipe at 3/4 height
          if ((i * 11) % 31 < 4) {
            ctx.fillStyle = `rgba(40,45,50,${detailAlpha * 0.8})`;
            ctx.fillRect(i * 2, top + wh * 0.72, 3, Math.max(2, wh * 0.012));
          }
          
          // Grime spots
          if ((i * 13) % 47 < 2 && d < 6) {
            ctx.fillStyle = `rgba(15,18,20,${detailAlpha * 0.6})`;
            const grimeSize = Math.max(1, wh * 0.02);
            ctx.fillRect(i * 2, top + wh * 0.5, grimeSize, grimeSize);
          }
          
          // Warning stripes on some walls
          if ((i * 17) % 53 < 3 && zone.accent[0] > 100) {
            const stripeY = top + wh * 0.85;
            for (let s = 0; s < 3; s++) {
              ctx.fillStyle = s % 2 === 0 ? `rgba(180,150,20,${detailAlpha * 0.5})` : `rgba(20,20,20,${detailAlpha * 0.5})`;
              ctx.fillRect(i * 2 + s, stripeY, 1, Math.max(1, wh * 0.008));
            }
          }
        }
        
        // Distance fog
        if (d < 7) {
          ctx.fillStyle = `rgba(0,0,0,${Math.min(0.58, d / 12)})`;
          ctx.fillRect(i * 2, top, 3, wh);
        }
      }
      fuseSpots.forEach((f, idx) => {
        if (!f.taken) sprite(f.x, f.y, "#e0c46d", 0.2, true);
      });
      if (dist(px, py, exit.x, exit.y) < 8)
        sprite(exit.x, exit.y, fuses === 3 ? "#55ff9b" : "#ff4c42", 0.56, fuses === 3);

      if (monster.active) {
        const dx = monster.x - px;
        const dy = monster.y - py;
        const d = Math.hypot(dx, dy);
        let a = Math.atan2(dy, dx) - ang;
        while (a > Math.PI) a -= 2 * Math.PI;
        while (a < -Math.PI) a += 2 * Math.PI;
        const fov = Math.PI / 2.9;
        if (Math.abs(a) < fov * 0.62 && d < 10) {
          const sx = ((a + fov / 2) / fov) * W;
          const idx = Math.max(0, Math.min(zbuf.length - 1, Math.floor((sx / W) * zbuf.length)));
          const sh = Math.min(H * 1.2, H / (Math.max(0.3, d) * 0.7));
          if (d < zbuf[idx] + 0.35) {
            ctx.save();
            
            // Monster animation - bobbing and lunging
            const bob = Math.sin(animTime * (monster.state === "CHASE" ? 8 : 4)) * sh * 0.03;
            const lunge = monster.state === "CHASE" ? Math.sin(animTime * 12) * sh * 0.02 : 0;
            
            const sw = sh * (0.42 + lunge * 0.1);
            const sy = H / 2 - sh * 0.42 + bob;
            
            // Shadow
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.beginPath();
            ctx.ellipse(sx, H / 2 + sh * 0.45, sw * 0.3, sh * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Body with pulsing glow
            const glowPulse = monster.state === "CHASE" ? 0.5 + Math.sin(animTime * 10) * 0.3 : 0.3;
            ctx.shadowBlur = 40 * glowPulse;
            ctx.shadowColor = "#8b0000";
            ctx.fillStyle = "#0a0a0a";
            
            // Torso
            ctx.beginPath();
            ctx.ellipse(sx, sy + sh * 0.35, sw * 0.22, sh * 0.28, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Head
            ctx.beginPath();
            ctx.ellipse(sx, sy + sh * 0.18, sw * 0.18, sh * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Arms (animated)
            const armSwing = Math.sin(animTime * (monster.state === "CHASE" ? 10 : 5)) * sh * 0.05;
            ctx.fillRect(sx - sw * 0.22 - armSwing, sy + sh * 0.25, sw * 0.08, sh * 0.35);
            ctx.fillRect(sx + sw * 0.14 + armSwing, sy + sh * 0.25, sw * 0.08, sh * 0.35);
            
            // Legs (animated)
            const legSwing = Math.sin(animTime * (monster.state === "CHASE" ? 10 : 4)) * sh * 0.04;
            ctx.fillRect(sx - sw * 0.12 - legSwing, sy + sh * 0.6, sw * 0.06, sh * 0.4);
            ctx.fillRect(sx + sw * 0.06 + legSwing, sy + sh * 0.6, sw * 0.06, sh * 0.4);
            
            // Eyes (glowing, pulse when chasing)
            const eyeGlow = monster.state === "CHASE" ? 0.8 + Math.sin(animTime * 15) * 0.2 : 0.5;
            ctx.fillStyle = `rgba(255, 26, 26, ${eyeGlow})`;
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#ff0000";
            const eyeSize = Math.max(3, sh * 0.02);
            ctx.fillRect(sx - sw * 0.12, sy + sh * 0.15, eyeSize, eyeSize * 0.6);
            ctx.fillRect(sx + sw * 0.04, sy + sh * 0.15, eyeSize, eyeSize * 0.6);
            
            // Mouth (opens when chasing)
            if (monster.state === "CHASE") {
              const mouthOpen = Math.sin(animTime * 8) * 0.5 + 0.5;
              ctx.fillStyle = "#2a0000";
              ctx.fillRect(sx - sw * 0.08, sy + sh * 0.22, sw * 0.16, sh * 0.05 * mouthOpen);
            }
            
            ctx.restore();
          }
        }
      }
      
      // Vignette effect
      ctx.fillStyle = "rgba(0,0,0,.08)";
      for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
      
      // Restore camera shake transform
      ctx.restore();
    };

    const loop = (t: number) => {
      // Always keep the RAF loop running, but only update/render when playing
      if (!runningRef.current) {
        rafIdRef.current = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
      last = t;
      elapsed += dt;
      animTime += dt;
      
      // Flashlight flicker
      flashlightFlicker = flashlight ? 0.9 + Math.sin(animTime * 8) * 0.08 + Math.random() * 0.02 : 0;
      
      // Throttle: only update React state once per second to avoid re-render storms
      if (Math.floor(elapsed) !== Math.floor(elapsed - dt)) {
        setElapsed(Math.floor(elapsed));
      }
      // Update stamina display (throttled)
      const staminaPct = Math.round(stamina);
      if (Math.abs(staminaPct - staminaDisplay) >= 5) {
        setStaminaDisplay(staminaPct);
      }

      const turn = (keys["arrowright"] ? 1 : 0) - (keys["arrowleft"] ? 1 : 0);
      ang += turn * dt * 1.75;
      const wantsMove =
        keys["w"] || keys["arrowup"] || keys["s"] || keys["arrowdown"] || keys["a"] || keys["d"];
      const sprint = !!keys["shift"] && wantsMove && stamina > 1;
      const speed = (sprint ? 2.65 : 1.8) * dt;
      
      // Camera shake on sprint
      if (sprint && wantsMove) {
        shakeIntensity = Math.min(1, shakeIntensity + dt * 3);
      } else {
        shakeIntensity = Math.max(0, shakeIntensity - dt * 2);
      }
      
      const forward = (keys["w"] || keys["arrowup"] ? 1 : 0) - (keys["s"] || keys["arrowdown"] ? 1 : 0);
      const strafe = (keys["d"] ? 1 : 0) - (keys["a"] ? 1 : 0);
      if (forward || strafe) {
        const norm = Math.hypot(forward, strafe) || 1;
        const dx = ((Math.cos(ang) * forward - Math.sin(ang) * strafe) / norm) * speed;
        const dy = ((Math.sin(ang) * forward + Math.cos(ang) * strafe) / norm) * speed;
        move(dx, dy);
        steps += dt;
        if (sprint) stamina = Math.max(0, stamina - 26 * dt);
        else stamina = Math.min(100, stamina + 12 * dt);
        if (steps > (sprint ? 0.25 : 0.42)) {
          steps = 0;
          if (Math.random() < 0.65)
            soundRef.current(sprint ? 75 : 60 + Math.random() * 25, 0.04, "triangle", sprint ? 0.018 : 0.008);
        }
      } else stamina = Math.min(100, stamina + 18 * dt);

      if (!monster.active) {
        monster.spawnTimer -= dt;
        if (monster.spawnTimer <= 0) {
          const options: { x: number; y: number }[] = [];
          for (let y = 1; y < grid.length - 1; y++) {
            for (let x = 1; x < grid[y].length - 1; x++) {
              if (!w(x + 0.5, y + 0.5) && dist(px, py, x + 0.5, y + 0.5) > 5 && !hasLineOfSight(grid, px, py, x + 0.5, y + 0.5, doorOpen))
                options.push({ x: x + 0.5, y: y + 0.5 });
            }
          }
          if (!options.length)
            for (let y = 1; y < grid.length - 1; y++)
              for (let x = 1; x < grid[y].length - 1; x++)
                if (!w(x + 0.5, y + 0.5) && dist(px, py, x + 0.5, y + 0.5) > 5)
                  options.push({ x: x + 0.5, y: y + 0.5 });
          if (options.length) {
            const p = options[Math.floor(Math.random() * options.length)];
            monster.x = p.x;
            monster.y = p.y;
          }
          monster.active = true;
          monster.state = "STALKING";
          soundRef.current(58, 0.8, "sawtooth", 0.06);
        }
      }

      if (monster.active && !dead) {
        let d = dist(px, py, monster.x, monster.y);
        const los = hasLineOfSight(grid, monster.x, monster.y, px, py, doorOpen);
        if (d < 7 && los) {
          monster.state = d < 4 ? "CHASE" : "STALKING";
          monster.seen += dt;
        } else if (monster.state === "CHASE") {
          monster.state = "SEARCHING";
          monster.searchTimer = 5;
        }
        if (monster.state === "SEARCHING") {
          monster.searchTimer -= dt;
          if (monster.searchTimer <= 0) {
            monster.state = "RETREAT";
            monster.searchTimer = 4;
          }
        }
        if (monster.state === "RETREAT") {
          monster.searchTimer -= dt;
          if (monster.searchTimer <= 0) {
            monster.state = "STALKING";
            monster.repath = 0;
          }
        }
        if (sprint && d < 9) monster.state = "CHASE";
        monster.repath -= dt;
        if (
          monster.repath <= 0 &&
          (monster.state === "CHASE" || monster.state === "STALKING" || monster.state === "SEARCHING")
        ) {
          monster.path = findPath(grid, doorOpen, monster.x, monster.y, px, py);
          monster.repath = monster.state === "CHASE" ? 0.35 : 0.8;
        }
        if (monster.state === "CHASE" || monster.state === "STALKING" || monster.state === "SEARCHING") {
          const target = monster.path[0];
          if (target) {
            const dx = target.x - monster.x;
            const dy = target.y - monster.y;
            const len = Math.hypot(dx, dy);
            if (len < 0.18) monster.path.shift();
            else {
              const base = monster.state === "CHASE" ? 1.45 : monster.state === "SEARCHING" ? 0.75 : 0.48;
              const sp = base * dt;
              const nx = monster.x + (dx / len) * sp;
              const ny = monster.y + (dy / len) * sp;
              if (!w(nx, monster.y)) monster.x = nx;
              if (!w(monster.x, ny)) monster.y = ny;
            }
          }
        } else if (monster.state === "RETREAT") {
          const dx = monster.x - px;
          const dy = monster.y - py;
          const len = Math.hypot(dx, dy) || 1;
          const nx = monster.x + (dx / len) * 0.55 * dt;
          const ny = monster.y + (dy / len) * 0.55 * dt;
          if (!w(nx, monster.y)) monster.x = nx;
          if (!w(monster.x, ny)) monster.y = ny;
        }
        d = dist(px, py, monster.x, monster.y);
        const chase = monster.state === "CHASE";
        const targetTension = Math.max(chase ? 0.95 : 0, d < 3 ? 0.8 : d < 6 ? 0.45 : 0, fuses === 3 ? 0.35 : 0);
        tension += (targetTension - tension) * Math.min(1, dt * (targetTension > tension ? 1.6 : 0.28));

        if (d < 0.58) {
          dead = true;
          runningRef.current = false;
          soundRef.current(42, 0.8, "sawtooth", 0.15);
          finishGameRef.current(false, elapsed);
          setTimeout(() => setPhase("dead"), 1700);
        }
      } else {
        tension = Math.max(0, tension - dt * 0.15);
      }

      ambientTimer -= dt;
      if (ambientTimer <= 0) {
        ambientTimer = 3 + Math.random() * 7;
        soundRef.current(38 + Math.random() * 95, 0.18 + Math.random() * 0.35, "sine", 0.004 + tension * 0.012);
      }
      heartTimer -= dt;
      if (tension > 0.55 && heartTimer <= 0) {
        heartTimer = 0.9 - tension * 0.45;
        soundRef.current(48 + tension * 18, 0.16, "sine", 0.018 + tension * 0.025);
      }

      // Update camera shake
      if (shakeIntensity > 0.01) {
        cameraShakeX = (Math.random() - 0.5) * shakeIntensity * 8;
        cameraShakeY = (Math.random() - 0.5) * shakeIntensity * 8;
      } else {
        cameraShakeX = cameraShakeY = 0;
      }

      render();
      rafIdRef.current = requestAnimationFrame(loop);
    };

    // Start the RAF loop
    rafIdRef.current = requestAnimationFrame((t) => {
      last = t;
      rafIdRef.current = requestAnimationFrame(loop);
    });

    return () => {
      runningRef.current = false;
      cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("click", onCanvasClick);
      document.removeEventListener("mousemove", onMouseMove);
      // NOTE: do NOT close the AudioContext here — React 18 StrictMode
      // (dev) double-invokes effects, and a re-mount would lose audio.
      // The context is replaced on each start() call; old ones are GC'd.
    };
  }, []);

  const zone = phase === "playing" ? "ЗОНА A · ТЕХНИЧЕСКИЙ КОРИДОР" : "";

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#030506]">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair"
        style={{ imageRendering: "pixelated" }}
        aria-label="Игровой экран"
      />
      {/* HUD */}
      {phase === "playing" && (
        <div className="absolute inset-0 pointer-events-none select-none" style={{ textShadow: "0 2px 4px #000" }}>
          <div className="absolute top-4 left-5 font-mono text-sm leading-7 tracking-wider text-gray-200">
            ПОСЛЕДНЯЯ СМЕНА
            <br />
            <span>ПИТАНИЕ: {fuseCount >= totalFuses ? "ВОССТАНОВЛЕНО" : "ОТКЛЮЧЕНО"}</span>
            <br />
            <span className="text-[#a7c5d2]">{zone}</span>
            <br />
            <span className="text-[#a9b2a4]">УГРОЗА: НИЗКАЯ</span>
          </div>
          <div className="absolute top-4 right-5 font-mono text-right text-xs leading-6 text-[#d0d0c7]">
            ПРЕДОХРАНИТЕЛИ:{" "}
            <span>
              {fuseCount} / {totalFuses}
            </span>
            <br />
            <span className="text-[#8ad7a2]">ВЫХОД: {fuseCount >= totalFuses ? "ЗЕЛЁНЫЙ МАЯК" : "ЗАБЛОКИРОВАН"}</span>
            <br />
            {bestTime != null && (
              <>
                <br />
                <span className="text-[#e0c46d]">РЕКОРД: {bestTime} сек</span>
              </>
            )}
            <span className="block mt-1 text-[11px] text-[#b6c5c6]">ВЫНОСЛИВОСТЬ</span>
            <div className="w-[150px] h-[6px] bg-[#252a2a] border border-[#58605e] ml-auto">
              <div
                className="h-full transition-[width] duration-75"
                style={{ width: `${staminaDisplay}%`, background: staminaDisplay < 30 ? "#c88686" : "#86c8a0" }}
              />
            </div>
            <button
              onClick={toggleMute}
              className="pointer-events-auto mt-2 px-2 py-1 font-mono text-[10px] border border-[#68777a] bg-[#182124] text-[#f0f4f4] hover:bg-[#29383c] hover:border-[#b9c4c5]"
            >
              ЗВУК: {muted ? "ВЫКЛ" : "ВКЛ"}
            </button>
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-gray-300 opacity-65">
            +
          </div>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-xs whitespace-nowrap text-[#bfc2c2]">
            WASD — движение · мышь — смотреть · ЛКМ — захват курсора · Esc — отпустить · E — взаимодействие · F — фонарь · Shift — бег
          </div>
        </div>
      )}
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,.68) 100%)",
          zIndex: 2,
        }}
      />
      {/* Death flash */}
      {phase === "dead" && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{ background: "#090000" }}
        >
          <strong
            className="text-5xl md:text-8xl tracking-[8px] text-[#f4eeee]"
            style={{ textShadow: "0 0 35px red", animation: "shake .09s infinite" }}
          >
            ОН НАШЁЛ ТЕБЯ
          </strong>
        </div>
      )}
      {/* Menu / End overlays */}
      {(phase === "menu" || phase === "dead" || phase === "won") && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{
            background:
              "radial-gradient(ellipse at center, #151b1e 0%, #030405 72%)",
          }}
        >
          <div className="max-w-[650px] mx-6 p-8 border border-[#384348] bg-[rgba(4,7,8,.92)] shadow-[0_0_70px_#000] text-center">
            {phase === "menu" && (
              <>
                <h1 className="text-3xl md:text-5xl tracking-[5px] mb-2 text-[#e2e5e4]" style={{ textShadow: "0 0 20px #9b1f1f" }}>
                  ПОСЛЕДНЯЯ СМЕНА
                </h1>
                <div className="text-[#9fa8a9] tracking-[3px] text-xs mb-6">ОБЪЕКТ № 09 · 02:17</div>
                <p className="leading-6.5 text-[#c2c7c7] text-sm">
                  Ты остался один после аварии. Электричество отключено, двери заблокированы. Найди{" "}
                  <b>три предохранителя</b>, восстанови питание и доберись до выхода.
                </p>
                <p className="leading-6.5 text-[#c2c7c7] text-sm mt-3">
                  Что-то бродит в темноте. Оно слышит тебя.
                </p>
                <p className="text-xs text-[#828d8f] mt-4">
                  Лучше играть в наушниках. Игра работает локально, без интернета и внешних файлов.
                </p>
                <button
                  onClick={start}
                  className="mt-4 px-6 py-3 border border-[#68777a] bg-[#182124] text-[#f0f4f4] tracking-[2px] hover:bg-[#29383c] hover:border-[#b9c4c5] font-mono"
                >
                  НАЧАТЬ СМЕНУ
                </button>
                <p className="text-xs text-[#828d8f] mt-4">
                  WASD — ходьба · стрелки — поворот · E — взять предмет / открыть дверь · F — фонарь
                </p>
              </>
            )}
            {phase === "dead" && (
              <>
                <h1 className="text-3xl md:text-5xl tracking-[5px] mb-2 text-[#e2e5e4]" style={{ textShadow: "0 0 20px #9b1f1f" }}>
                  СМЕНА ОКОНЧЕНА
                </h1>
                <div className="text-[#9fa8a9] tracking-[3px] text-xs mb-6">СИГНАЛ ПОТЕРЯН</div>
                <p className="leading-6.5 text-[#c2c7c7] text-sm">Ты не успел выбраться.</p>
                <button
                  onClick={start}
                  className="mt-4 px-6 py-3 border border-[#68777a] bg-[#182124] text-[#f0f4f4] tracking-[2px] hover:bg-[#29383c] hover:border-[#b9c4c5] font-mono"
                >
                  ПОПРОБОВАТЬ СНОВА
                </button>
              </>
            )}
            {phase === "won" && (
              <>
                <h1 className="text-3xl md:text-5xl tracking-[5px] mb-2 text-[#e2e5e4]" style={{ textShadow: "0 0 20px #2d6a4f" }}>
                  ТЫ ВЫБРАЛСЯ
                </h1>
                <div className="text-[#9fa8a9] tracking-[3px] text-xs mb-6">СМЕНА ОКОНЧЕНА</div>
                <p className="leading-6.5 text-[#c2c7c7] text-sm">
                  Дверь открылась. Но когда ты выходил, из темноты донёсся знакомый звук шагов…
                </p>
                <p className="leading-6.5 text-[#c2c7c7] text-sm mt-3">
                  Время прохождения: {elapsed} сек.
                  {bestTime != null && (
                    <span className="text-[#e0c46d]"> · Рекорд: {bestTime} сек</span>
                  )}
                </p>
                <button
                  onClick={start}
                  className="mt-4 px-6 py-3 border border-[#68777a] bg-[#182124] text-[#f0f4f4] tracking-[2px] hover:bg-[#29383c] hover:border-[#b9c4c5] font-mono"
                >
                  ИГРАТЬ СНОВА
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes shake{0%{transform:translate(3px,-2px) scale(1.03)}50%{transform:translate(-4px,3px) scale(.98)}100%{transform:translate(1px,1px) scale(1.02)}}`}</style>
    </div>
  );
}
