import * as THREE from "three";
import { Input } from "../core/Input";
import { MazeGenerator, WALL_N, WALL_E, WALL_S, WALL_W } from "../maze/MazeGenerator";

const WALK_SPEED = 4;
const RUN_SPEED = 7;
const CROUCH_SPEED = 1.5;
/** Carrying capacity without the backpack upgrade (kg). */
export const BASE_CAPACITY = 40;
const STAMINA_MAX = 100;
const STAMINA_DRAIN = 20; // per second while running
const STAMINA_REGEN = 15; // per second when not running
const STAMINA_EXHAUST_THRESHOLD = 15;
const PLAYER_RADIUS = 0.35;
const WALL_THICKNESS = 0.3;

export class Player {
  mesh: THREE.Group;
  position = new THREE.Vector3();
  rotationY = 0;
  rotationX = 0;

  stamina = STAMINA_MAX;
  staminaExhausted = false;
  isRunning = false;
  isCrouching = false;
  flashlightOn = true;
  flashlightBattery = 100;
  /** Upgrade: flashlight boost multiplier (1.4 with the upgrade) */
  flashlightBoost = 1;
  /** Upgrade: max battery capacity (100 base, +50 per level) */
  batteryCapacity = 100;
  /** Upgrade: movement speed multiplier (1 + 0.1 per level) */
  speedMult = 1;
  /** Upgrade: max stamina multiplier (1 + 0.25 per level) */
  staminaMult = 1;
  // Backrooms-style auto-dim: 0..1 scale for surfaces close to the beam
  private torchDim = 1;

  // Noise level (0-1) based on current action
  currentNoise = 0;
  /** True on the frame the player actually moved (for footsteps, independent of noise) */
  moving = false;

  camera: THREE.PerspectiveCamera;
  flashlight: THREE.SpotLight;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;

    // Player "body" is invisible (first-person), but we track position
    this.mesh = new THREE.Group();

    // Flashlight
    this.flashlight = new THREE.SpotLight(0xfff4e0, 12, 22, Math.PI / 6, 0.5, 1.5);
    this.flashlight.position.set(0.2, -0.2, 0);
    this.flashlight.target.position.set(0, -0.2, -5);
    this.mesh.add(this.flashlight);
    this.mesh.add(this.flashlight.target);

    // Subtle camera bob
    this.mesh.position.copy(this.position);
  }

  update(
    dt: number,
    input: Input,
    mazeBounds: { min: THREE.Vector3; max: THREE.Vector3 },
    maze: MazeGenerator | null = null,
    cellSize = 4,
    loadFactor = 0
  ) {
    // Mouse look
    const { x, y } = input.consumeMouse();
    this.rotationY -= x * 0.002;
    this.rotationX -= y * 0.002;
    this.rotationX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.rotationX));

    // Movement basis: camera looks along -Z, so forward is (-sinY, 0, -cosY)
    const forward = new THREE.Vector3(
      -Math.sin(this.rotationY),
      0,
      -Math.cos(this.rotationY)
    );
    const right = new THREE.Vector3(
      Math.cos(this.rotationY),
      0,
      -Math.sin(this.rotationY)
    );

    const move = new THREE.Vector3();
    if (input.isDown("KeyW")) move.add(forward);
    if (input.isDown("KeyS")) move.sub(forward);
    if (input.isDown("KeyA")) move.sub(right);
    if (input.isDown("KeyD")) move.add(right);

    const moving = move.lengthSq() > 0;
    this.moving = moving;
    if (moving) move.normalize();

    // Crouch
    this.isCrouching =
      input.isDown("ControlLeft") || input.isDown("ControlRight") || input.isDown("KeyC");

    // Run
    const wantsRun =
      (input.isDown("ShiftLeft") || input.isDown("ShiftRight")) &&
      moving &&
      !this.staminaExhausted;
    this.isRunning = wantsRun;

    // Stamina (upgraded max: STAMINA_MAX * staminaMult)
    const staminaMax = STAMINA_MAX * this.staminaMult;
    if (this.isRunning) {
      this.stamina -= STAMINA_DRAIN * dt;
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.staminaExhausted = true;
      }
    } else {
      this.stamina += STAMINA_REGEN * dt;
      if (this.staminaExhausted && this.stamina >= STAMINA_EXHAUST_THRESHOLD) {
        this.staminaExhausted = false;
      }
      this.stamina = Math.min(staminaMax, this.stamina);
    }

    // Speed (load slows you down — the core R.E.P.O. trade-off)
    let speed = WALK_SPEED;
    if (this.isCrouching) speed = CROUCH_SPEED;
    else if (this.isRunning) speed = RUN_SPEED;
    speed *= this.speedMult;
    const overload = Math.max(0, loadFactor - 0.6) / 0.4; // 0 → 1 at full pack
    speed *= 1 - 0.35 * overload - (loadFactor > 0 ? 0.05 : 0);

    // Apply movement
    const delta = move.multiplyScalar(speed * dt);
    this.position.add(delta);

    // Clamp to maze bounds
    this.position.x = Math.max(mazeBounds.min.x, Math.min(mazeBounds.max.x, this.position.x));
    this.position.z = Math.max(mazeBounds.min.z, Math.min(mazeBounds.max.z, this.position.z));

    // Collision with maze walls (axis-separated push-out so the player
    // slides along walls instead of sticking to them)
    this.resolveCollisions(maze, cellSize);

    // Flashlight (toggled via Input.onPress -> Game.toggleFlashlight,
    // so holding F can't strobe it 60x/sec)
    this.flashlight.visible = this.flashlightOn && this.flashlightBattery > 0;

    // Battery drain
    if (this.flashlightOn) {
      this.flashlightBattery -= dt * 2; // 50 seconds of light
      if (this.flashlightBattery <= 0) {
        this.flashlightBattery = 0;
        this.flashlightOn = false;
      }
    }
    this.flashlightBattery = Math.min(this.flashlightBattery, this.batteryCapacity);

    // Backrooms-style auto-dim: a wall half a meter out catches
    // inverse-square intensity and clips to a pure white disc. March the
    // aim ray to the first wall (and floor/ceiling) and scale the torch so
    // close surfaces stay textured instead of blowing out.
    const DIM_RANGE = 6.2;
    let aimDist = DIM_RANGE;
    if (maze) {
      const cosP = Math.cos(this.rotationX);
      const dx = -Math.sin(this.rotationY) * cosP;
      const dz = -Math.cos(this.rotationY) * cosP;
      for (let d = 0.25; d < DIM_RANGE; d += 0.22) {
        if (maze.solidAtWorld(this.position.x + dx * d, this.position.z + dz * d, cellSize)) {
          aimDist = d;
          break;
        }
      }
      const eyeY = this.isCrouching ? 1.2 : 1.7;
      const dirY = Math.sin(this.rotationX);
      if (dirY < -0.05) aimDist = Math.min(aimDist, eyeY / -dirY);
      else if (dirY > 0.05) aimDist = Math.min(aimDist, (3.5 - eyeY) / dirY);
    }
    const dimTarget = Math.max(0.05, Math.min(1, Math.pow(aimDist / 6, 1.5)));
    this.torchDim += (dimTarget - this.torchDim) * Math.min(1, dt * 9);

    // Flicker + subtle breathing + auto-dim (Backrooms player.ts recipe)
    // flashlightBoost from the upgrade multiplies base intensity
    if (this.flashlight.visible) {
      const flicker = 0.9 + 0.1 * Math.sin(Date.now() * 0.01) * Math.random();
      const subtle = 0.96 + Math.sin(performance.now() / 1000 * 47) * 0.012;
      this.flashlight.intensity = 12 * this.flashlightBoost * flicker * subtle * this.torchDim;
    }

    // Update camera
    this.camera.position.set(
      this.position.x,
      this.isCrouching ? 1.2 : 1.7,
      this.position.z
    );
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.rotationY;
    this.camera.rotation.x = this.rotationX;

    // Update noise level
    this.updateNoise(moving);

    // Update mesh position (for flashlight)
    this.mesh.position.copy(this.camera.position);
    this.mesh.rotation.y = this.rotationY;
    this.mesh.rotation.x = this.rotationX;
  }

  private resolveCollisions(maze: MazeGenerator | null, cellSize: number) {
    if (!maze) return;
    const R = PLAYER_RADIUS;
    const T = WALL_THICKNESS;
    const p = this.position;

    for (let iter = 0; iter < 2; iter++) {
      const cx = Math.floor(p.x / cellSize);
      const cz = Math.floor(p.z / cellSize);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gz = cz - 1; gz <= cz + 1; gz++) {
          if (gx < 0 || gz < 0 || gx >= maze.size || gz >= maze.size) continue;
          const cell = maze.cells[maze.idx(gx, gz)];
          // North wall of the cell
          if (cell.walls & WALL_N) {
            this.pushOutOfBox(
              gx * cellSize, gx * cellSize + cellSize,
              gz * cellSize - T / 2, gz * cellSize + T / 2, R
            );
          }
          // West wall of the cell
          if (cell.walls & WALL_W) {
            this.pushOutOfBox(
              gx * cellSize - T / 2, gx * cellSize + T / 2,
              gz * cellSize, gz * cellSize + cellSize, R
            );
          }
          // Border walls (covered by neighbours elsewhere, but the outer
          // rim has no neighbour on the outside)
          if (gz === maze.size - 1 && cell.walls & WALL_S) {
            this.pushOutOfBox(
              gx * cellSize, gx * cellSize + cellSize,
              (gz + 1) * cellSize - T / 2, (gz + 1) * cellSize + T / 2, R
            );
          }
          if (gx === maze.size - 1 && cell.walls & WALL_E) {
            this.pushOutOfBox(
              (gx + 1) * cellSize - T / 2, (gx + 1) * cellSize + T / 2,
              gz * cellSize, gz * cellSize + cellSize, R
            );
          }
        }
      }
    }
  }

  private pushOutOfBox(minX: number, maxX: number, minZ: number, maxZ: number, r: number) {
    const p = this.position;
    const nx = Math.max(minX, Math.min(maxX, p.x));
    const nz = Math.max(minZ, Math.min(maxZ, p.z));
    const dx = p.x - nx;
    const dz = p.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2);
      p.x = nx + (dx / d) * r;
      p.z = nz + (dz / d) * r;
    } else {
      // Center inside the wall box: push out along min penetration axis
      const pl = p.x - minX;
      const pr = maxX - p.x;
      const pt = p.z - minZ;
      const pb = maxZ - p.z;
      const m = Math.min(pl, pr, pt, pb);
      if (m === pl) p.x = minX - r;
      else if (m === pr) p.x = maxX + r;
      else if (m === pt) p.z = minZ - r;
      else p.z = maxZ + r;
    }
  }

  private updateNoise(moving: boolean) {
    if (!moving) {
      this.currentNoise = 0;
    } else if (this.isCrouching) {
      this.currentNoise = 0.1;
    } else if (this.isRunning) {
      this.currentNoise = 0.7;
    } else {
      this.currentNoise = 0.25;
    }
  }

  toggleFlashlight() {
    if (this.flashlightBattery > 0) {
      this.flashlightOn = !this.flashlightOn;
    }
  }

  addBattery(amount: number) {
    this.flashlightBattery = Math.min(100, this.flashlightBattery + amount);
  }

  // Visibility score (0-1) — how visible the player is to the monster
  getVisibility(): number {
    let vis = 0.2; // base (darkness)
    if (this.isRunning) vis += 0.4;
    else if (this.currentNoise > 0.2) vis += 0.2;
    if (this.isCrouching) vis -= 0.15;
    if (this.flashlightOn) vis += 0.25;
    return Math.max(0, Math.min(1, vis));
  }
}
