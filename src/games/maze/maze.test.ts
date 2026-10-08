import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { MazeGenerator, RNG } from "@/games/maze/maze/MazeGenerator";
import { MonsterAI } from "@/games/maze/monster/MonsterAI";
import { Player } from "@/games/maze/player/Player";

function bfsReachable(m: MazeGenerator, sx: number, sy: number): boolean[] {
  const seen = new Array(m.size * m.size).fill(false);
  const q: [number, number][] = [[sx, sy]];
  seen[m.idx(sx, sy)] = true;
  const dirs = [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]];
  while (q.length) {
    const [cx, cy] = q.pop()!;
    for (const [dx, dy, w] of dirs) {
      if (m.cells[m.idx(cx, cy)].walls & w) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= m.size || ny < 0 || ny >= m.size) continue;
      if (!seen[m.idx(nx, ny)]) {
        seen[m.idx(nx, ny)] = true;
        q.push([nx, ny]);
      }
    }
  }
  return seen;
}

function fakeInput(down: string[] = []) {
  return {
    keys: new Set(down),
    isDown: (c: string) => down.includes(c),
    consumeMouse: () => ({ x: 0, y: 0 }),
  } as unknown as import("@/games/maze/core/Input").Input;
}

const BOUNDS = {
  min: new THREE.Vector3(0.5, 0, 0.5),
  max: new THREE.Vector3(25 * 4 - 0.5, 0, 25 * 4 - 0.5),
};

describe("maze generation", () => {
  it("10 seeds: fully connected, exit reachable, rooms have openings", () => {
    for (let s = 1; s <= 10; s++) {
      const m = new MazeGenerator(25, s * 7919 + 13);
      m.generate();
      const seen = bfsReachable(m, 0, 0);
      expect(seen.every(Boolean)).toBe(true);
      expect(seen[m.idx(24, 24)]).toBe(true);
      for (const r of m.rooms) {
        let openings = 0;
        for (let x = r.x0; x <= r.x1; x++)
          for (let y = r.y0; y <= r.y1; y++) {
            const c = m.cells[m.idx(x, y)];
            if (x === r.x0 && !(c.walls & 8)) openings++;
            if (x === r.x1 && !(c.walls & 2)) openings++;
            if (y === r.y0 && !(c.walls & 1)) openings++;
            if (y === r.y1 && !(c.walls & 4)) openings++;
          }
        expect(openings).toBeGreaterThan(0);
      }
      expect(m.findPath(2, 2, 22, 22).length).toBeGreaterThan(0);
    }
  });

  it("different seeds give different mazes", () => {
    const a = new MazeGenerator(25, 111);
    a.generate();
    const b = new MazeGenerator(25, 222);
    b.generate();
    expect(a.cells.map((c) => c.walls).join(",")).not.toBe(
      b.cells.map((c) => c.walls).join(",")
    );
  });

  it("RNG seed 0 is guarded (no longer degenerate)", () => {
    const r = new RNG(0);
    const vals = [r.next(), r.next(), r.next()];
    expect(vals.every((v) => v === 0)).toBe(false);
    expect(vals.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe("monster vision", () => {
  function walledSetup() {
    const m = new MazeGenerator(25, 42);
    m.generate();
    // Force a wall between (5,5) and (6,5)
    m.cells[m.idx(5, 5)].walls |= 2;
    m.cells[m.idx(6, 5)].walls |= 8;
    const ai = new MonsterAI(
      { speed: 4.5, hearRange: 12, visionRange: 14, visionAngle: 90 },
      m,
      4
    );
    ai.position.set(5 * 4 + 2, 0, 5 * 4 + 2);
    ai.position.y = Math.atan2(1, 0); // face +x toward the player cell
    return { m, ai };
  }

  it("does NOT see the player through a wall", () => {
    const { ai } = walledSetup();
    const canSee = (ai as unknown as { canSeePlayer: (p: THREE.Vector3, v: boolean) => boolean }).canSeePlayer(
      new THREE.Vector3(6 * 4 + 2, 0, 5 * 4 + 2),
      true
    );
    expect(canSee).toBe(false);
  });

  it("sees the player in an open corridor", () => {
    const m = new MazeGenerator(25, 42);
    m.generate();
    // Force open passage between (5,5) and (6,5)
    m.cells[m.idx(5, 5)].walls &= ~2;
    m.cells[m.idx(6, 5)].walls &= ~8;
    const ai = new MonsterAI(
      { speed: 4.5, hearRange: 12, visionRange: 14, visionAngle: 90 },
      m,
      4
    );
    ai.position.set(5 * 4 + 2, 0, 5 * 4 + 2);
    ai.position.y = Math.atan2(1, 0);
    const canSee = (ai as unknown as { canSeePlayer: (p: THREE.Vector3, v: boolean) => boolean }).canSeePlayer(
      new THREE.Vector3(6 * 4 + 2, 0, 5 * 4 + 2),
      true
    );
    expect(canSee).toBe(true);
  });

  it("does not see a player behind it", () => {
    const { ai } = walledSetup();
    // Monster faces +x; player at -x in open space far from walls is
    // still behind -> angle check rejects. Use adjacent open cell (4,5).
    const m = (ai as unknown as { maze: MazeGenerator }).maze;
    m.cells[m.idx(5, 5)].walls &= ~8;
    m.cells[m.idx(4, 5)].walls &= ~2;
    const canSee = (ai as unknown as { canSeePlayer: (p: THREE.Vector3, v: boolean) => boolean }).canSeePlayer(
      new THREE.Vector3(4 * 4 + 2, 0, 5 * 4 + 2),
      true
    );
    expect(canSee).toBe(false);
  });
});

describe("monster chase", () => {
  it("repaths when the player moves (no stale path)", () => {
    const m = new MazeGenerator(25, 7);
    m.generate();
    const ai = new MonsterAI(
      { speed: 4.5, hearRange: 12, visionRange: 14, visionAngle: 90 },
      m,
      4
    );
    ai.position.set(2 * 4 + 2, 0, 2 * 4 + 2);
    ai.state = "CHASE";
    ai.path = m.findPath(2, 2, 5, 5);
    ai.pathIndex = 0;
    const stale = [...ai.path];
    // Simulate >0.5s passing so the repath timer fires
    for (let i = 0; i < 6; i++) {
      (ai as unknown as { updateChase: (dt: number, p: THREE.Vector3) => void }).updateChase(
        0.1,
        new THREE.Vector3(20 * 4 + 2, 0, 20 * 4 + 2)
      );
      if (JSON.stringify(ai.path) !== JSON.stringify(stale)) break;
    }
    expect(ai.path).not.toEqual(stale);
    // New path heads at the player's cell
    const last = ai.path[ai.path.length - 1];
    expect(last).toEqual([20, 20]);
  });

  it("PATROL -> noise -> INVESTIGATE -> SEARCH on arrival", () => {
    const m = new MazeGenerator(25, 9);
    m.generate();
    const ai = new MonsterAI(
      { speed: 10, hearRange: 30, visionRange: 0.01, visionAngle: 10 },
      m,
      4
    );
    ai.position.set(2 * 4 + 2, 0, 2 * 4 + 2);
    expect(ai.state).toBe("PATROL");
    const noisePos = new THREE.Vector3(3 * 4 + 2, 0, 2 * 4 + 2);
    ai.update(0.1, new THREE.Vector3(24 * 4, 0, 24 * 4), 0, [
      { position: noisePos, intensity: 1, timestamp: 999999 },
    ]);
    expect(ai.state).toBe("INVESTIGATE");
    // Teleport next to the noise -> arrival converts to SEARCH
    ai.position.copy(noisePos);
    for (let i = 0; i < 30 && ai.state === "INVESTIGATE"; i++) {
      ai.update(0.1, new THREE.Vector3(24 * 4, 0, 24 * 4), 0, []);
    }
    expect(ai.state).toBe("SEARCH");
  });
});

describe("player movement", () => {
  it("W walks toward the camera facing direction (not backwards)", () => {
    const m = new MazeGenerator(25, 5);
    m.generate();
    // Open cell (2,2) fully so collision can't interfere
    for (const w of [1, 2, 4, 8]) {
      m.cells[m.idx(2, 2)].walls &= ~w;
    }
    const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    const p = new Player(cam);
    p.rotationY = 0; // camera looks along -Z
    p.position.set(2 * 4 + 2, 0, 2 * 4 + 2);
    p.update(0.5, fakeInput(["KeyW"]), BOUNDS, m, 4);
    // Must have moved toward -Z
    expect(p.position.z).toBeLessThan(2 * 4 + 2);
  });

  it("walls block the player (no pass-through)", () => {
    const m = new MazeGenerator(9, 5);
    m.generate();
    // Seal cell (2,2) symmetrically (both sides of every edge, exactly as
    // MazeGenerator.generate() maintains them)
    m.cells[m.idx(2, 2)].walls |= 1 | 2 | 4 | 8;
    m.cells[m.idx(3, 2)].walls |= 8;
    m.cells[m.idx(1, 2)].walls |= 2;
    m.cells[m.idx(2, 1)].walls |= 4;
    m.cells[m.idx(2, 3)].walls |= 1;
    const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    const p = new Player(cam);
    // Start east of the sealed cell, face west (-X): rotationY = +PI/2
    // gives forward = (-sin(PI/2), -cos(PI/2)) = (-1, 0)
    p.rotationY = Math.PI / 2;
    p.position.set(3 * 4 + 2, 0, 2 * 4 + 2);
    for (let i = 0; i < 40; i++) {
      p.update(0.05, fakeInput(["KeyW"]), BOUNDS, m, 4);
    }
    // Wall between (3,2) and (2,2) is at x = 3*4 = 12; player radius 0.35
    expect(p.position.x).toBeGreaterThan(12 + 0.3);
  });

  it("diagonal movement is normalized (no speed cheat)", () => {
    const m = new MazeGenerator(25, 5);
    m.generate();
    const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    const straight = new Player(cam);
    straight.rotationY = 0;
    straight.position.set(10 * 4 + 2, 0, 10 * 4 + 2);
    const diag = new Player(cam);
    diag.rotationY = 0;
    diag.position.set(10 * 4 + 2, 0, 10 * 4 + 2);
    for (let i = 0; i < 20; i++) {
      straight.update(0.05, fakeInput(["KeyW"]), BOUNDS, null, 4);
      diag.update(0.05, fakeInput(["KeyW", "KeyD"]), BOUNDS, null, 4);
    }
    const dStraight = Math.hypot(
      straight.position.x - (10 * 4 + 2),
      straight.position.z - (10 * 4 + 2)
    );
    const dDiag = Math.hypot(
      diag.position.x - (10 * 4 + 2),
      diag.position.z - (10 * 4 + 2)
    );
    expect(Math.abs(dStraight - dDiag)).toBeLessThan(0.6);
  });

  it("stamina drains on sprint, regenerates, battery never NaN/negative", () => {
    const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    const p = new Player(cam);
    p.position.set(10 * 4 + 2, 0, 10 * 4 + 2);
    for (let i = 0; i < 60; i++) {
      p.update(0.05, fakeInput(["KeyW", "ShiftLeft"]), BOUNDS, null, 4);
    }
    expect(p.stamina).toBeLessThan(100);
    expect(p.stamina).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < 200; i++) {
      p.update(0.05, fakeInput([]), BOUNDS, null, 4);
    }
    // staminaMult defaults to 1, so max is 100
    expect(p.stamina).toBe(100);
    for (let i = 0; i < 2000; i++) {
      p.update(0.05, fakeInput([]), BOUNDS, null, 4);
    }
    expect(Number.isNaN(p.flashlightBattery)).toBe(false);
    expect(p.flashlightBattery).toBeGreaterThanOrEqual(0);
    expect(p.flashlightBattery).toBe(0);
    expect(p.flashlightOn).toBe(false);
  });
});
