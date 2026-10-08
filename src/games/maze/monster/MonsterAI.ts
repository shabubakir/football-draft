import * as THREE from "three";
import { MazeGenerator } from "../maze/MazeGenerator";

export type MonsterState =
  | "PATROL"
  | "INVESTIGATE"
  | "SEARCH"
  | "CHASE"
  | "ATTACK"
  | "LOST_PLAYER";

export interface NoiseEvent {
  position: THREE.Vector3;
  intensity: number; // 0-1
  timestamp: number;
}

interface MonsterConfig {
  speed: number;
  hearRange: number;
  visionRange: number;
  visionAngle: number; // degrees
}

export class MonsterAI {
  state: MonsterState = "PATROL";
  position = new THREE.Vector3();
  targetPosition = new THREE.Vector3();
  lastSeenPlayer = new THREE.Vector3();
  lastSeenTime = 0;
  path: [number, number][] = [];
  pathIndex = 0;
  patrolTarget: [number, number] | null = null;
  searchTimer = 0;
  investigateNoise: NoiseEvent | null = null;

  private config: MonsterConfig;
  private maze: MazeGenerator;
  private cellSize: number;
  private time = 0;

  constructor(config: MonsterConfig, maze: MazeGenerator, cellSize: number) {
    this.config = config;
    this.maze = maze;
    this.cellSize = cellSize;
  }

  update(dt: number, playerPos: THREE.Vector3, playerVisibility: number, noises: NoiseEvent[]) {
    this.time += dt;

    // 1. Check for new noises
    this.checkNoises(noises, playerPos);

    // 2. Check vision
    const canSee = this.canSeePlayer(playerPos, playerVisibility > 0.3);
    if (canSee) {
      this.lastSeenPlayer.copy(playerPos);
      this.lastSeenTime = this.time;
      if (this.state !== "CHASE" && this.state !== "ATTACK") {
        this.state = "CHASE";
        this.pathIndex = 0;
      }
    }

    // 3. State machine
    switch (this.state) {
      case "PATROL":
        this.updatePatrol(dt);
        break;
      case "INVESTIGATE":
        this.updateInvestigate(dt);
        break;
      case "SEARCH":
        this.updateSearch(dt, playerPos);
        break;
      case "CHASE":
        this.updateChase(dt, playerPos);
        break;
      case "ATTACK":
        this.updateAttack(dt, playerPos);
        break;
      case "LOST_PLAYER":
        this.updateLostPlayer(dt, playerPos);
        break;
    }

    // 4. Move along path
    this.moveAlongPath(dt);
  }

  private checkNoises(noises: NoiseEvent[], playerPos: THREE.Vector3) {
    for (const noise of noises) {
      const dist = this.position.distanceTo(noise.position);
      if (dist <= this.config.hearRange * noise.intensity) {
        if (this.state === "PATROL" || this.state === "SEARCH") {
          this.state = "INVESTIGATE";
          this.investigateNoise = noise;
          this.searchTimer = 0;
        }
      }
    }
  }

  private canSeePlayer(playerPos: THREE.Vector3, playerVisible: boolean): boolean {
    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
    const dist = toPlayer.length();

    // Distance check (visibility reduces effective range)
    const effectiveRange = this.config.visionRange * (playerVisible ? 1 : 0.5);
    if (dist > effectiveRange) return false;

    // Angle check
    const forward = new THREE.Vector3(
      Math.sin(this.position.y), // using y as rotation proxy
      0,
      Math.cos(this.position.y)
    );
    const angle = Math.acos(
      Math.max(-1, Math.min(1, toPlayer.normalize().dot(forward)))
    );
    if (angle > (this.config.visionAngle * Math.PI) / 360) return false;

    // Line of sight (simplified: check if wall between)
    return this.hasLineOfSight(this.position, playerPos);
  }

  private hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    // Raycast through maze grid
    const steps = 20;
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    dir.normalize();

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * len;
      const point = new THREE.Vector3().copy(from).addScaledVector(dir, t);
      const cellX = Math.floor(point.x / this.cellSize);
      const cellZ = Math.floor(point.z / this.cellSize);
      if (
        cellX < 0 ||
        cellX >= this.maze.size ||
        cellZ < 0 ||
        cellZ >= this.maze.size
      )
        return false;
    }
    return true;
  }

  private updatePatrol(dt: number) {
    // Pick random patrol target every few seconds
    if (!this.patrolTarget || this.time % 5 < dt) {
      const x = Math.floor(Math.random() * this.maze.size);
      const z = Math.floor(Math.random() * this.maze.size);
      this.patrolTarget = [x, z];
      this.path = this.maze.findPath(
        Math.floor(this.position.x / this.cellSize),
        Math.floor(this.position.z / this.cellSize),
        x,
        z
      );
      this.pathIndex = 0;
    }
  }

  private updateInvestigate(dt: number) {
    if (!this.investigateNoise) return;

    const noiseCellX = Math.floor(this.investigateNoise.position.x / this.cellSize);
    const noiseCellZ = Math.floor(this.investigateNoise.position.z / this.cellSize);
    const myCellX = Math.floor(this.position.x / this.cellSize);
    const myCellZ = Math.floor(this.position.z / this.cellSize);

    if (this.pathIndex >= this.path.length || this.path.length === 0) {
      this.path = this.maze.findPath(myCellX, myCellZ, noiseCellX, noiseCellZ);
      this.pathIndex = 0;
    }

    // Reached noise location?
    const distToNoise = this.position.distanceTo(this.investigateNoise.position);
    if (distToNoise < 2) {
      this.state = "SEARCH";
      this.searchTimer = 0;
      this.investigateNoise = null;
    }
  }

  private updateSearch(dt: number, playerPos: THREE.Vector3) {
    this.searchTimer += dt;

    // Wander around the area
    if (this.pathIndex >= this.path.length || this.path.length === 0) {
      const myCellX = Math.floor(this.position.x / this.cellSize);
      const myCellZ = Math.floor(this.position.z / this.cellSize);
      const dx = Math.floor(Math.random() * 5 - 2);
      const dz = Math.floor(Math.random() * 5 - 2);
      const tx = Math.max(0, Math.min(this.maze.size - 1, myCellX + dx));
      const tz = Math.max(0, Math.min(this.maze.size - 1, myCellZ + dz));
      this.path = this.maze.findPath(myCellX, myCellZ, tx, tz);
      this.pathIndex = 0;
    }

    // Give up after 15 seconds
    if (this.searchTimer > 15) {
      this.state = "PATROL";
      this.patrolTarget = null;
    }
  }

  private updateChase(dt: number, playerPos: THREE.Vector3) {
    const myCellX = Math.floor(this.position.x / this.cellSize);
    const myCellZ = Math.floor(this.position.z / this.cellSize);
    const playerCellX = Math.floor(playerPos.x / this.cellSize);
    const playerCellZ = Math.floor(playerPos.z / this.cellSize);

    if (this.pathIndex >= this.path.length || this.path.length === 0) {
      this.path = this.maze.findPath(myCellX, myCellZ, playerCellX, playerCellZ);
      this.pathIndex = 0;
    }

    // Very close → ATTACK
    const dist = this.position.distanceTo(playerPos);
    if (dist < 1.5) {
      this.state = "ATTACK";
    }

    // Lost sight for 5 seconds → LOST_PLAYER
    if (this.time - this.lastSeenTime > 5) {
      this.state = "LOST_PLAYER";
    }
  }

  private updateAttack(dt: number, playerPos: THREE.Vector3) {
    const dist = this.position.distanceTo(playerPos);
    if (dist < 1.0) {
      // Killed
    } else if (dist > 3) {
      // Player escaped
      this.state = "LOST_PLAYER";
    } else {
      // Keep chasing
      const myCellX = Math.floor(this.position.x / this.cellSize);
      const myCellZ = Math.floor(this.position.z / this.cellSize);
      const playerCellX = Math.floor(playerPos.x / this.cellSize);
      const playerCellZ = Math.floor(playerPos.z / this.cellSize);
      if (this.pathIndex >= this.path.length || this.path.length === 0) {
        this.path = this.maze.findPath(myCellX, myCellZ, playerCellX, playerCellZ);
        this.pathIndex = 0;
      }
    }
  }

  private updateLostPlayer(dt: number, playerPos: THREE.Vector3) {
    // Go to last seen position
    const lastCellX = Math.floor(this.lastSeenPlayer.x / this.cellSize);
    const lastCellZ = Math.floor(this.lastSeenPlayer.z / this.cellSize);
    const myCellX = Math.floor(this.position.x / this.cellSize);
    const myCellZ = Math.floor(this.position.z / this.cellSize);

    if (this.pathIndex >= this.path.length || this.path.length === 0) {
      this.path = this.maze.findPath(myCellX, myCellZ, lastCellX, lastCellZ);
      this.pathIndex = 0;
    }

    // If we've been lost for 10 seconds, return to patrol
    if (this.time - this.lastSeenTime > 10) {
      this.state = "PATROL";
      this.patrolTarget = null;
    }
  }

  private moveAlongPath(dt: number) {
    if (this.pathIndex >= this.path.length) return;

    const [tx, tz] = this.path[this.pathIndex];
    const targetX = tx * this.cellSize + this.cellSize / 2;
    const targetZ = tz * this.cellSize + this.cellSize / 2;

    const dir = new THREE.Vector3(targetX - this.position.x, 0, targetZ - this.position.z);
    const dist = dir.length();

    if (dist < 0.3) {
      this.pathIndex++;
      return;
    }

    dir.normalize();
    const speed = this.config.speed * (this.state === "CHASE" || this.state === "ATTACK" ? 1.3 : 1);
    this.position.addScaledVector(dir, speed * dt);

    // Face movement direction
    this.position.y = Math.atan2(dir.x, dir.z);
  }

  // Proximity to player (0-1) for audio/intensity
  getProximity(playerPos: THREE.Vector3): number {
    const dist = this.position.distanceTo(playerPos);
    return Math.max(0, 1 - dist / 20);
  }
}
