import * as THREE from "three";
import { MazeGenerator, WALL_N, WALL_E, WALL_S, WALL_W } from "./MazeGenerator";

const CELL_SIZE = 4;
const WALL_HEIGHT = 3.5;
const WALL_THICKNESS = 0.3;

export class MazeRenderer {
  group = new THREE.Group();
  maze: MazeGenerator;
  private wallGeo: THREE.BoxGeometry;
  private wallMat: THREE.MeshStandardMaterial;
  private roomMat: THREE.MeshStandardMaterial;
  private floorMat: THREE.MeshStandardMaterial;

  constructor(maze: MazeGenerator) {
    this.maze = maze;

    // Wall geometry (reused)
    this.wallGeo = new THREE.BoxGeometry(1, 1, 1);

    // Concrete-like wall material
    this.wallMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.9,
      metalness: 0.1,
    });

    // Room walls — slightly brighter concrete than corridors
    this.roomMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a50,
      roughness: 0.85,
      metalness: 0.1,
    });

    // Dark floor
    this.floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.95,
      metalness: 0.05,
    });

    this.build();
  }

  private build() {
    const size = this.maze.size;
    const total = size * CELL_SIZE;

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(total, total),
      this.floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(total / 2, 0, total / 2);
    this.group.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(total, total),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(total / 2, WALL_HEIGHT, total / 2);
    this.group.add(ceiling);

    // Walls — use merged geometry for performance.
    // Room walls use a separate (brighter) material so rooms read as lit spaces.
    const wallPositions: { x: number; y: number; z: number; sx: number; sy: number; sz: number }[] = [];
    const roomWallPositions: { x: number; y: number; z: number; sx: number; sy: number; sz: number }[] = [];

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const cell = this.maze.cells[this.maze.idx(x, y)];
        const cx = x * CELL_SIZE + CELL_SIZE / 2;
        const cz = y * CELL_SIZE + CELL_SIZE / 2;
        const inRoom = cell.room >= 0;

        // North wall
        if (cell.walls & WALL_N) {
          (inRoom ? roomWallPositions : wallPositions).push({
            x: cx,
            y: WALL_HEIGHT / 2,
            z: y * CELL_SIZE,
            sx: CELL_SIZE,
            sy: WALL_HEIGHT,
            sz: WALL_THICKNESS,
          });
        }
        // West wall
        if (cell.walls & WALL_W) {
          (inRoom ? roomWallPositions : wallPositions).push({
            x: x * CELL_SIZE,
            y: WALL_HEIGHT / 2,
            z: cz,
            sx: WALL_THICKNESS,
            sy: WALL_HEIGHT,
            sz: CELL_SIZE,
          });
        }
        // South wall (only for last row to avoid duplicates)
        if (y === size - 1 && cell.walls & WALL_S) {
          (inRoom ? roomWallPositions : wallPositions).push({
            x: cx,
            y: WALL_HEIGHT / 2,
            z: (y + 1) * CELL_SIZE,
            sx: CELL_SIZE,
            sy: WALL_HEIGHT,
            sz: WALL_THICKNESS,
          });
        }
        // East wall (only for last column)
        if (x === size - 1 && cell.walls & WALL_E) {
          (inRoom ? roomWallPositions : wallPositions).push({
            x: (x + 1) * CELL_SIZE,
            y: WALL_HEIGHT / 2,
            z: cz,
            sx: WALL_THICKNESS,
            sy: WALL_HEIGHT,
            sz: CELL_SIZE,
          });
        }
      }
    }

    // Use InstancedMesh for all walls
    const instancedWalls = new THREE.InstancedMesh(
      this.wallGeo,
      this.wallMat,
      wallPositions.length
    );

    const dummy = new THREE.Object3D();
    wallPositions.forEach((wp, i) => {
      dummy.position.set(wp.x, wp.y, wp.z);
      dummy.scale.set(wp.sx, wp.sy, wp.sz);
      dummy.updateMatrix();
      instancedWalls.setMatrixAt(i, dummy.matrix);
    });
    instancedWalls.instanceMatrix.needsUpdate = true;
    this.group.add(instancedWalls);

    if (roomWallPositions.length > 0) {
      const roomWalls = new THREE.InstancedMesh(
        this.wallGeo,
        this.roomMat,
        roomWallPositions.length
      );
      roomWallPositions.forEach((wp, i) => {
        dummy.position.set(wp.x, wp.y, wp.z);
        dummy.scale.set(wp.sx, wp.sy, wp.sz);
        dummy.updateMatrix();
        roomWalls.setMatrixAt(i, dummy.matrix);
      });
      roomWalls.instanceMatrix.needsUpdate = true;
      this.group.add(roomWalls);
    }

    // Add some flickering lights in rooms
    this.addLights();
  }

  private addLights() {
    const size = this.maze.size;
    const rng = new RNG(this.maze.seed + 12345);

    // One warm fixture per room (Backrooms: fixtures are everywhere,
    // intensity ~8-12 so adjacent corridors read as "lit from ahead")
    for (const room of this.maze.rooms) {
      const x = Math.floor((room.x0 + room.x1) / 2);
      const y = Math.floor((room.y0 + room.y1) / 2);
      const light = new THREE.PointLight(0xffd08a, 10, 22, 1.8);
      light.position.set(
        x * CELL_SIZE + CELL_SIZE / 2,
        WALL_HEIGHT - 0.3,
        y * CELL_SIZE + CELL_SIZE / 2
      );
      light.userData.flicker = true;
      light.userData.phase = rng.next() * Math.PI * 2;
      light.userData.baseIntensity = 10;
      this.group.add(light);

      // Small emissive sphere for the "bulb"
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa44 })
      );
      bulb.position.copy(light.position);
      this.group.add(bulb);
    }

    // Denser corridor fixtures so every stretch of hallway has a lit spot
    for (let i = 0; i < 8; i++) {
      const x = rng.nextInt(2, size - 2);
      const y = rng.nextInt(2, size - 2);
      const light = new THREE.PointLight(0xffd08a, 6, 14, 1.8);
      light.position.set(
        x * CELL_SIZE + CELL_SIZE / 2,
        WALL_HEIGHT - 0.3,
        y * CELL_SIZE + CELL_SIZE / 2
      );
      light.userData.flicker = true;
      light.userData.phase = rng.next() * Math.PI * 2;
      light.userData.baseIntensity = 6;
      this.group.add(light);

      // Small emissive sphere for the "bulb"
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa44 })
      );
      bulb.position.copy(light.position);
      this.group.add(bulb);
    }
  }

  update(time: number) {
    // Flicker lights
    this.group.children.forEach((child) => {
      if (child instanceof THREE.PointLight && child.userData.flicker) {
        const base = (child.userData.baseIntensity as number) ?? 2;
        const phase = child.userData.phase;
        const flicker =
          0.7 + 0.3 * Math.sin(time * 3 + phase) * Math.sin(time * 7 + phase * 2);
        child.intensity = base * flicker;
      }
    });
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}

// Simple RNG for light placement (reuses from MazeGenerator)
import { RNG } from "./MazeGenerator";
