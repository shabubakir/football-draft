import * as THREE from "three";
import { Input } from "../core/Input";

const WALK_SPEED = 4;
const RUN_SPEED = 7;
const CROUCH_SPEED = 1.5;
const STAMINA_MAX = 100;
const STAMINA_DRAIN = 20; // per second while running
const STAMINA_REGEN = 15; // per second when not running
const STAMINA_EXHAUST_THRESHOLD = 15;

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

  // Noise level (0-1) based on current action
  currentNoise = 0;

  camera: THREE.PerspectiveCamera;
  flashlight: THREE.SpotLight;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;

    // Player "body" is invisible (first-person), but we track position
    this.mesh = new THREE.Group();

    // Flashlight
    this.flashlight = new THREE.SpotLight(0xfff4e0, 3, 20, Math.PI / 6, 0.5, 1.5);
    this.flashlight.position.set(0.2, -0.2, 0);
    this.flashlight.target.position.set(0, -0.2, -5);
    this.mesh.add(this.flashlight);
    this.mesh.add(this.flashlight.target);

    // Subtle camera bob
    this.mesh.position.copy(this.position);
  }

  update(dt: number, input: Input, mazeBounds: { min: THREE.Vector3; max: THREE.Vector3 }) {
    // Mouse look
    const { x, y } = input.consumeMouse();
    this.rotationY -= x * 0.002;
    this.rotationX -= y * 0.002;
    this.rotationX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.rotationX));

    // Movement
    const forward = new THREE.Vector3(
      Math.sin(this.rotationY),
      0,
      Math.cos(this.rotationY)
    );
    const right = new THREE.Vector3(
      Math.cos(this.rotationY),
      0,
      -Math.sin(this.rotationY)
    );

    let move = new THREE.Vector3();
    if (input.isDown("KeyW")) move.add(forward);
    if (input.isDown("KeyS")) move.sub(forward);
    if (input.isDown("KeyD")) move.add(right);
    if (input.isDown("KeyA")) move.sub(right);

    const moving = move.lengthSq() > 0;
    if (moving) move.normalize();

    // Crouch
    this.isCrouching = input.isDown("ControlLeft") || input.isDown("KeyC");

    // Run
    const wantsRun = input.isDown("ShiftLeft") && moving && !this.staminaExhausted;
    this.isRunning = wantsRun;

    // Stamina
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
      this.stamina = Math.min(STAMINA_MAX, this.stamina);
    }

    // Speed
    let speed = WALK_SPEED;
    if (this.isCrouching) speed = CROUCH_SPEED;
    else if (this.isRunning) speed = RUN_SPEED;

    // Apply movement
    const delta = move.multiplyScalar(speed * dt);
    this.position.add(delta);

    // Clamp to maze bounds
    this.position.x = Math.max(mazeBounds.min.x, Math.min(mazeBounds.max.x, this.position.x));
    this.position.z = Math.max(mazeBounds.min.z, Math.min(mazeBounds.max.z, this.position.z));

    // Collision with walls (simple: check if we're inside a wall cell)
    this.resolveCollisions();

    // Flashlight
    if (input.keys.has("KeyF") && input.keys.size <= 1) {
      // Toggle on press (simplified)
    }
    this.flashlight.visible = this.flashlightOn && this.flashlightBattery > 0;

    // Battery drain
    if (this.flashlightOn) {
      this.flashlightBattery -= dt * 2; // 50 seconds of light
      if (this.flashlightBattery <= 0) {
        this.flashlightBattery = 0;
        this.flashlightOn = false;
      }
    }

    // Flicker
    if (this.flashlight.visible) {
      const flicker = 0.9 + 0.1 * Math.sin(Date.now() * 0.01) * Math.random();
      this.flashlight.intensity = 3 * flicker;
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

  private resolveCollisions() {
    // Simple wall collision: check 4 surrounding points
    const margin = 0.3;
    const points = [
      new THREE.Vector3(this.position.x - margin, 0, this.position.z - margin),
      new THREE.Vector3(this.position.x + margin, 0, this.position.z - margin),
      new THREE.Vector3(this.position.x - margin, 0, this.position.z + margin),
      new THREE.Vector3(this.position.x + margin, 0, this.position.z + margin),
    ];

    // This is simplified — in a real implementation, you'd check against maze walls
    // For now, just clamp to bounds
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
