// Deterministic maze generation using Recursive Backtracking with seeded RNG.

export class RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
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
}

export class MazeGenerator {
  size: number;
  cells: MazeCell[];
  rng: RNG;
  seed: number;

  constructor(size: number, seed: number) {
    this.size = size;
    this.seed = seed;
    this.rng = new RNG(seed);
    this.cells = Array.from({ length: size * size }, () => ({
      walls: 15,
      visited: false,
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
      const rw = this.rng.nextInt(3, 5);
      const rh = this.rng.nextInt(3, 5);
      const rx = this.rng.nextInt(1, this.size - rw - 1);
      const ry = this.rng.nextInt(1, this.size - rh - 1);

      for (let x = rx; x < rx + rw; x++) {
        for (let y = ry; y < ry + rh; y++) {
          if (x < 0 || x >= this.size || y < 0 || y >= this.size) continue;
          const cell = this.cells[this.idx(x, y)];
          // Remove internal walls
          if (x < rx + rw - 1) cell.walls &= ~WALL_E;
          if (x > rx) cell.walls &= ~WALL_W;
          if (y < ry + rh - 1) cell.walls &= ~WALL_S;
          if (y > ry) cell.walls &= ~WALL_N;
          // Ensure connection to rest
          if (x === rx && this.rng.next() < 0.5) cell.walls &= ~WALL_W;
          if (x === rx + rw - 1 && this.rng.next() < 0.5)
            cell.walls &= ~WALL_E;
          if (y === ry && this.rng.next() < 0.5) cell.walls &= ~WALL_N;
          if (y === ry + rh - 1 && this.rng.next() < 0.5)
            cell.walls &= ~WALL_S;
        }
      }
    }
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
