// Deterministic maze generation using Recursive Backtracking with seeded RNG.

export class RNG {
  private state: number;

  constructor(seed: number) {
    // xorshift(0) sticks at 0 forever, producing a degenerate maze —
    // fall back to 1 for non-finite/zero seeds.
    this.state = Number.isFinite(seed) && seed !== 0 ? seed : 1;
  }

  next(): number {
    // xorshift32
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// Cell walls: 0=none, 1=N, 2=E, 4=S, 8=W
export const WALL_N = 1;
export const WALL_E = 2;
export const WALL_S = 4;
export const WALL_W = 8;

export interface MazeCell {
  walls: number;
  visited: boolean;
  room: number; // -1 = corridor, 0..N-1 = room id
}

export interface Room {
  id: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number; // inclusive bounds in cells
}

export class MazeGenerator {
  size: number;
  cells: MazeCell[];
  rng: RNG;
  seed: number;
  rooms: Room[] = [];

  constructor(size: number, seed: number) {
    this.size = size;
    this.seed = seed;
    this.rng = new RNG(seed);
    this.cells = Array.from({ length: size * size }, () => ({
      walls: 15,
      visited: false,
      room: -1,
    }));
  }

  idx(x: number, y: number) {
    return y * this.size + x;
  }

  generate() {
    // Recursive backtracking
    const stack: [number, number][] = [[0, 0]];
    this.cells[0].visited = true;

    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const neighbors: [number, number, number, number][] = [];

      const dirs: [number, number, number, number][] = [
        [0, -1, WALL_N, WALL_S],
        [1, 0, WALL_E, WALL_W],
        [0, 1, WALL_S, WALL_N],
        [-1, 0, WALL_W, WALL_E],
      ];

      for (const [dx, dy, wall, opp] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
          if (!this.cells[this.idx(nx, ny)].visited) {
            neighbors.push([nx, ny, wall, opp]);
          }
        }
      }

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const [nx, ny, wall, opp] = neighbors[
          Math.floor(this.rng.next() * neighbors.length)
        ];
        this.cells[this.idx(cx, cy)].walls &= ~wall;
        this.cells[this.idx(nx, ny)].walls &= ~opp;
        this.cells[this.idx(nx, ny)].visited = true;
        stack.push([nx, ny]);
      }
    }

    // Add some loops for alternative routes (remove ~15% of remaining walls)
    const numLoops = Math.floor(this.size * this.size * 0.15);
    for (let i = 0; i < numLoops; i++) {
      const x = this.rng.nextInt(0, this.size - 1);
      const y = this.rng.nextInt(0, this.size - 1);
      const cell = this.cells[this.idx(x, y)];
      if (cell.walls & WALL_E && x < this.size - 1) {
        cell.walls &= ~WALL_E;
        this.cells[this.idx(x + 1, y)].walls &= ~WALL_W;
      } else if (cell.walls & WALL_S && y < this.size - 1) {
        cell.walls &= ~WALL_S;
        this.cells[this.idx(x, y + 1)].walls &= ~WALL_N;
      }
    }

    // Create rooms (open areas)
    this.createRooms(3);
  }

  private createRooms(count: number) {
    for (let r = 0; r < count; r++) {
      const rw = this.rng.nextInt(4, 7);
      const rh = this.rng.nextInt(4, 7);
      const rx = this.rng.nextInt(1, this.size - rw - 1);
      const ry = this.rng.nextInt(1, this.size - rh - 1);

      const room: Room = { id: r, x0: rx, y0: ry, x1: rx + rw - 1, y1: ry + rh - 1 };

      for (let x = rx; x < rx + rw; x++) {
        for (let y = ry; y < ry + rh; y++) {
          if (x < 0 || x >= this.size || y < 0 || y >= this.size) continue;
          const cell = this.cells[this.idx(x, y)];
          cell.room = r;
          // Remove internal walls
          if (x < rx + rw - 1) cell.walls &= ~WALL_E;
          if (x > rx) cell.walls &= ~WALL_W;
          if (y < ry + rh - 1) cell.walls &= ~WALL_S;
          if (y > ry) cell.walls &= ~WALL_N;
        }
      }

      // Exactly one exit per room: a random border cell of the room
      // (a hole in the outer wall, always on a cell border so the renderer draws it)
      const side = this.rng.nextInt(0, 3);
      let ex = 0;
      let ey = 0;
      if (side === 0) {
        ex = this.rng.nextInt(rx, rx + rw - 1);
        ey = ry;
        this.cells[this.idx(ex, ey)].walls &= ~WALL_N;
      } else if (side === 1) {
        ex = this.rng.nextInt(rx, rx + rw - 1);
        ey = ry + rh - 1;
        this.cells[this.idx(ex, ey)].walls &= ~WALL_S;
      } else if (side === 2) {
        ex = rx;
        ey = this.rng.nextInt(ry, ry + rh - 1);
        this.cells[this.idx(ex, ey)].walls &= ~WALL_W;
      } else {
        ex = rx + rw - 1;
        ey = this.rng.nextInt(ry, ry + rh - 1);
        this.cells[this.idx(ex, ey)].walls &= ~WALL_E;
      }
      // If the exit is on the maze edge, push it one cell inside so the room can't be sealed
      if (ex === 0) { ex = 1; this.cells[this.idx(1, ey)].walls &= ~WALL_W; }
      else if (ex === this.size - 1) { ex = this.size - 2; this.cells[this.idx(this.size - 2, ey)].walls &= ~WALL_E; }
      else if (ey === 0) { ey = 1; this.cells[this.idx(ex, 1)].walls &= ~WALL_N; }
      else if (ey === this.size - 1) { ey = this.size - 2; this.cells[this.idx(ex, this.size - 2)].walls &= ~WALL_S; }

      room.x0 = rx;
      this.rooms.push(room);
    }
  }

  roomAt(x: number, y: number): number {
    const cell = this.cells[this.idx(x, y)];
    return cell ? cell.room : -1;
  }

  // Cell centers (world units) of the three largest rooms — good spots for the fuses
  roomCenters(): { x: number; z: number }[] {
    const cellCenter = (cx: number, cy: number) => ({
      x: cx * 4 + 2,
      z: cy * 4 + 2,
    });
    return this.rooms
      .map((r) => {
        const cx = (r.x0 + r.x1) / 2;
        const cy = (r.y0 + r.y1) / 2;
        const size = (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
        return { ...cellCenter(Math.floor(cx), Math.floor(cy)), size };
      })
      .sort((a, b) => b.size - a.size)
      .slice(0, 3)
      .map(({ x, z }) => ({ x, z }));
  }

  // A* pathfinding on the maze grid
  findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): [number, number][] {
    const size = this.size;
    const start = this.idx(startX, startY);
    const end = this.idx(endX, endY);

    if (start === end) return [[startX, startY]];

    const open: number[] = [start];
    const cameFrom: Map<number, number> = new Map();
    const gScore: Map<number, number> = new Map([[start, 0]]);
    const fScore: Map<number, number> = new Map([[start, this.heuristic(startX, startY, endX, endY)]]);
    const closed: Set<number> = new Set();

    const dirs = [
      [0, -1, WALL_N],
      [1, 0, WALL_E],
      [0, 1, WALL_S],
      [-1, 0, WALL_W],
    ];

    while (open.length > 0) {
      // Find lowest fScore
      let lowestIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if ((fScore.get(open[i]) ?? Infinity) < (fScore.get(open[lowestIdx]) ?? Infinity)) {
          lowestIdx = i;
        }
      }
      const current = open[lowestIdx];
      open.splice(lowestIdx, 1);

      if (current === end) {
        // Reconstruct path
        const path: [number, number][] = [];
        let node = end;
        while (node !== start) {
          path.unshift([node % size, Math.floor(node / size)]);
          node = cameFrom.get(node)!;
        }
        path.unshift([startX, startY]);
        return path;
      }

      closed.add(current);
      const cx = current % size;
      const cy = Math.floor(current / size);

      for (const [dx, dy, wall] of dirs) {
        if (this.cells[current].walls & wall) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
        const neighbor = this.idx(nx, ny);
        if (closed.has(neighbor)) continue;

        const tentativeG = (gScore.get(current) ?? Infinity) + 1;
        if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeG);
          fScore.set(
            neighbor,
            tentativeG + this.heuristic(nx, ny, endX, endY)
          );
          if (!open.includes(neighbor)) open.push(neighbor);
        }
      }
    }

    return []; // No path found
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }
}
