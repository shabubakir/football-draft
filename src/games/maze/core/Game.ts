import * as THREE from "three";
import { Input } from "./Input";
import { MazeGenerator, RNG } from "../maze/MazeGenerator";
import { MazeRenderer } from "../maze/MazeRenderer";
import { Player } from "../player/Player";
import { Monster } from "../monster/Monster";
import { MonsterAI, NoiseEvent } from "../monster/MonsterAI";
import { AudioManager } from "../audio/AudioManager";
import {
  GameState,
  Difficulty,
  DIFFICULTIES,
  loadGameState,
  saveGameState,
} from "./GameState";

const CELL_SIZE = 4;

export class Game {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  input: Input;
  audio: AudioManager;

  maze: MazeGenerator;
  mazeRenderer: MazeRenderer;
  player: Player;
  monster: Monster;
  monsterAI: MonsterAI;

  state: GameState;
  noises: NoiseEvent[] = [];
  private lastTime = 0;
  private aiTimer = 0;
  private aiInterval = 0.1; // 10 FPS for AI
  private items: { type: string; position: THREE.Vector3; collected: boolean }[] = [];
  private itemMeshes: THREE.Mesh[] = [];
  private exitMesh: THREE.Mesh | null = null;
  private exitPosition: THREE.Vector3;
  private loopRunning = false;

  // Ceiling fixtures (Backrooms-style): permanent point lights that
  // flicker. The player walks towards them.
  private roomLightBulbs: { room: number; light: THREE.PointLight }[] = [];

  onWin: ((time: number) => void) | null = null;
  onLose: (() => void) | null = null;
  onHudUpdate: ((hud: { stamina: number; battery: number; fuses: number; fusesTotal: number }) => void) | null = null;
  onPause: ((paused: boolean) => void) | null = null;
  private paused = false;
  get isPaused() {
    return this.paused;
  }

  constructor(private container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x181708);
    this.scene.fog = new THREE.FogExp2(0x181708, 0.032);

    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // Nothing in the scene casts shadows (all lights are non-shadow
    // PointLights + one SpotLight), so skip the shadow pass entirely.
    this.renderer.shadowMap.enabled = false;
    // Same tonemapping as the Backrooms engine: soft shoulder keeps
    // close surfaces from clipping to a white disc.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    container.appendChild(this.renderer.domElement);

    this.input = new Input();
    // F toggles the flashlight (edge-triggered in Input, no strobing)
    this.input.onPress = (code) => {
      if (code === "KeyF" && this.state.phase === "playing" && !this.paused) {
        this.toggleFlashlight();
      }
    };
    this.audio = new AudioManager();

    this.state = loadGameState();
    this.maze = new MazeGenerator(25, this.state.seed);
    this.maze.generate();

    const diff = DIFFICULTIES[this.state.difficulty];

    this.mazeRenderer = new MazeRenderer(this.maze);
    this.scene.add(this.mazeRenderer.group);

    // Player starts at center-ish
    const startPos = new THREE.Vector3(
      2 * CELL_SIZE + CELL_SIZE / 2,
      0,
      2 * CELL_SIZE + CELL_SIZE / 2
    );

    this.player = new Player(this.camera);
    this.player.position.copy(startPos);
    this.scene.add(this.player.mesh);

    // Monster spawns far from player
    const monsterSpawn = new THREE.Vector3(
      (this.maze.size - 3) * CELL_SIZE + CELL_SIZE / 2,
      0,
      (this.maze.size - 3) * CELL_SIZE + CELL_SIZE / 2
    );

    this.monsterAI = new MonsterAI(
      {
        speed: diff.monsterSpeed,
        hearRange: diff.monsterHearRange,
        visionRange: diff.monsterVisionRange,
        visionAngle: diff.monsterVisionAngle,
      },
      this.maze,
      CELL_SIZE
    );
    this.monsterAI.position.copy(monsterSpawn);
    this.monster = new Monster(this.monsterAI);
    this.scene.add(this.monster.group);

    // Ambient light — same dim warm floor light as Backrooms
    const ambient = new THREE.AmbientLight(0x3a342a, 0.55);
    this.scene.add(ambient);

    // Exit position (far corner) — must be set before placeItems
    this.exitPosition = new THREE.Vector3(
      (this.maze.size - 1) * CELL_SIZE + CELL_SIZE / 2,
      0,
      (this.maze.size - 1) * CELL_SIZE + CELL_SIZE / 2
    );

    // Place items
    this.placeItems(diff.batteryCount, diff.fuseCount);

    this.resize();
    window.addEventListener("resize", this.resize);
  }

  private placeItems(batteryCount: number, fuseCount: number) {
    // Restart-safe: remove the previous run's meshes before adding new ones
    for (const m of this.itemMeshes) {
      this.scene.remove(m);
      m.geometry.dispose();
      const mat = m.material as THREE.Material;
      mat.dispose();
    }
    this.itemMeshes = [];
    if (this.exitMesh) {
      this.scene.remove(this.exitMesh);
      this.exitMesh.geometry.dispose();
      (this.exitMesh.material as THREE.Material).dispose();
      this.exitMesh = null;
    }

    const rng = new RNG(this.state.seed + 999);
    this.items = [];

    for (let i = 0; i < batteryCount; i++) {
      const x = rng.nextInt(1, this.maze.size - 2);
      const z = rng.nextInt(1, this.maze.size - 2);
      this.items.push({
        type: "battery",
        position: new THREE.Vector3(
          x * CELL_SIZE + CELL_SIZE / 2,
          0.5,
          z * CELL_SIZE + CELL_SIZE / 2
        ),
        collected: false,
      });
    }

    // Fuses live in the rooms (one per room) — you must go inside to grab them
    const roomCenters = this.maze.roomCenters();
    for (let i = 0; i < fuseCount; i++) {
      const rc = roomCenters[i % roomCenters.length];
      const x = Math.floor(rc.x / CELL_SIZE) + (rng.next() < 0.5 ? -1 : 1);
      const z = Math.floor(rc.z / CELL_SIZE) + (rng.next() < 0.5 ? -1 : 1);
      this.items.push({
        type: "fuse",
        position: new THREE.Vector3(
          THREE.MathUtils.clamp(x, 1, this.maze.size - 2) * CELL_SIZE + CELL_SIZE / 2,
          0.5,
          THREE.MathUtils.clamp(z, 1, this.maze.size - 2) * CELL_SIZE + CELL_SIZE / 2
        ),
        collected: false,
      });
    }

    // Add item meshes
    this.items.forEach((item) => {
      let mesh: THREE.Mesh;
      if (item.type === "battery") {
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 0.4, 8),
          new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.5 })
        );
      } else {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.1, 0.3),
          new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.5 })
        );
      }
      mesh.position.copy(item.position);
      this.scene.add(mesh);
      this.itemMeshes.push(mesh);
    });

    // Exit marker
    const exitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 3, 16),
      new THREE.MeshStandardMaterial({ color: 0x0044ff, emissive: 0x0044ff, emissiveIntensity: 0.3, transparent: true, opacity: 0.5 })
    );
    exitMesh.position.copy(this.exitPosition);
    this.scene.add(exitMesh);
    this.exitMesh = exitMesh;
  }

  // Scan room lights for the current maze. Backrooms-style: every fixture
  // is a permanent point light that flickers — no per-room on/off.
  // The player walks TOWARDS the light, and the flashlight auto-dims
  // near close walls (see Player.update).
  private setupRoomLights() {
    this.roomLightBulbs = [];
    this.mazeRenderer.group.traverse((obj) => {
      if (obj instanceof THREE.PointLight && obj.userData.flicker) {
        this.roomLightBulbs.push({ room: -1, light: obj });
      }
    });
  }

  // Backrooms-style "fluorescent hum" proximity cue: the closer the player
  // is to a lit fixture, the louder the hum (see AudioManager.playHum).
  // Returns 0..1 (1 = right under a lit ceiling).
  private computeLightProximity(): number {
    const pos = this.player.position;
    let minDistSq = Infinity;
    for (const rl of this.roomLightBulbs) {
      const l = rl.light;
      if (l.userData.flicker && l.intensity > 0.5) {
        const dx = l.position.x - pos.x;
        const dy = l.position.y - (pos.y + 1.7);
        const dz = l.position.z - pos.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < minDistSq) minDistSq = d2;
      }
    }
    // 0 at 12 m, 1 at 2 m (smooth)
    const d = Math.sqrt(minDistSq);
    return THREE.MathUtils.clamp((12 - d) / 10, 0, 1);
  }

  togglePause() {
    if (this.state.phase !== "playing" && !this.paused) return;
    this.paused = !this.paused;
    if (this.paused) this.input.releaseLock();
    this.onPause?.(this.paused);
  }

  // Called from the UI when the pointer is released (Esc) — pause the game
  handlePointerUnlock() {
    if (this.state.phase === "playing" && !this.paused) {
      this.togglePause();
    }
  }

  start() {
    this.paused = false;
    this.state.phase = "playing";
    this.state.seed = Math.floor(Math.random() * 1000000);
    this.state.fusesCollected = 0;
    this.state.batteriesCollected = 0;
    this.state.elapsed = 0;
    this.lastTime = performance.now();

    this.audio.init();
    this.audio.resume();
    this.audio.startAmbient();

    this.input.attach();
    this.input.requestLock(this.renderer.domElement);

    // Regenerate maze with new seed
    this.maze = new MazeGenerator(25, this.state.seed);
    this.maze.generate();

    // Rebuild maze visuals
    this.scene.remove(this.mazeRenderer.group);
    this.mazeRenderer.dispose();
    this.mazeRenderer = new MazeRenderer(this.maze);
    this.scene.add(this.mazeRenderer.group);

    // Reset player
    this.player.position.set(
      2 * CELL_SIZE + CELL_SIZE / 2,
      0,
      2 * CELL_SIZE + CELL_SIZE / 2
    );
    this.player.stamina = 100;
    this.player.flashlightBattery = 100;
    this.player.flashlightOn = true;

    // Reset monster
    this.monsterAI.position.set(
      (this.maze.size - 3) * CELL_SIZE + CELL_SIZE / 2,
      0,
      (this.maze.size - 3) * CELL_SIZE + CELL_SIZE / 2
    );
    this.monsterAI.state = "PATROL";
    this.monsterAI.path = [];
    this.monsterAI.pathIndex = 0;

    // Reposition items
    this.placeItems(
      DIFFICULTIES[this.state.difficulty].batteryCount,
      DIFFICULTIES[this.state.difficulty].fuseCount
    );

    this.setupRoomLights();

    // Never run two loops: a double-click on start/restart only resets the
    // state above while the already-running loop picks it up next frame.
    if (!this.loopRunning) {
      this.loopRunning = true;
      requestAnimationFrame(this.loop);
    }
  }

  private loop = (time: number) => {
    if (this.state.phase !== "playing") {
      this.loopRunning = false;
      return;
    }

    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    // Paused (Esc): freeze the game, keep rendering
    if (this.paused) {
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(this.loop);
      return;
    }

    this.state.elapsed += dt;

    // Player update (with the live maze for wall collision)
    const bounds = {
      min: new THREE.Vector3(0.5, 0, 0.5),
      max: new THREE.Vector3(
        this.maze.size * CELL_SIZE - 0.5,
        0,
        this.maze.size * CELL_SIZE - 0.5
      ),
    };
    this.player.update(dt, this.input, bounds, this.maze, CELL_SIZE);

    // Generate noise from player
    if (this.player.currentNoise > 0) {
      this.noises.push({
        position: this.player.position.clone(),
        intensity: this.player.currentNoise,
        timestamp: time,
      });
    }
    // Noises older than ~1.5s are forgotten: the monster investigates fresh
    // sounds only, and this array can't grow without bound anymore.
    if (this.noises.length > 0) {
      const cutoff = time - 1500;
      if (this.noises[0].timestamp <= cutoff) {
        this.noises = this.noises.filter((n) => n.timestamp > cutoff);
      }
    }

    // AI update at 10 FPS
    this.aiTimer += dt;
    if (this.aiTimer >= this.aiInterval) {
      this.aiTimer = 0;
      const playerVisible = this.player.getVisibility();
      this.monsterAI.update(dt * 10, this.player.position, playerVisible, this.noises);
    }

    // Monster visual update
    this.monster.update(dt);

    // Check item pickups
    this.checkPickups();

    // Check win condition
    if (
      this.state.fusesCollected >= this.state.fusesTotal &&
      this.player.position.distanceTo(this.exitPosition) < 2
    ) {
      this.win();
      return;
    }

    // Check lose condition
    if (this.player.position.distanceTo(this.monsterAI.position) < 1.0) {
      this.lose();
      return;
    }

    // Ceiling fixtures flicker (permanent — Backrooms-style)
    this.mazeRenderer.update(this.state.elapsed);

    // Audio: footsteps + heartbeat + fluorescent-hum proximity to fixtures
    const proximity = this.monsterAI.getProximity(this.player.position);
    const lightProximity = this.computeLightProximity();
    this.audio.update(
      dt,
      this.player.currentNoise > 0,
      this.player.isRunning,
      proximity,
      lightProximity
    );

    // HUD update
    if (this.onHudUpdate) {
      this.onHudUpdate({
        stamina: this.player.stamina,
        battery: this.player.flashlightBattery,
        fuses: this.state.fusesCollected,
        fusesTotal: this.state.fusesTotal,
      });
    }

    // Render
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  };

  private checkPickups() {
    const fusesNeeded = DIFFICULTIES[this.state.difficulty].fuseCount;
    this.state.fusesTotal = fusesNeeded;

    for (const item of this.items) {
      if (item.collected) continue;
      if (this.player.position.distanceTo(item.position) < 1.5) {
        item.collected = true;
        this.audio.playPickup();

        if (item.type === "battery") {
          this.player.addBattery(40);
          this.state.batteriesCollected++;
        } else if (item.type === "fuse") {
          this.state.fusesCollected++;
          this.audio.playMechanical();
        }
      }
    }
  }

  private win() {
    this.state.phase = "won";
    this.audio.playWin();
    this.audio.stopAmbient();
    if (this.state.bestTime === null || this.state.elapsed < this.state.bestTime) {
      this.state.bestTime = this.state.elapsed;
    }
    this.state.wins++;
    this.state.lastSeed = this.state.seed;
    saveGameState(this.state);
    this.input.releaseLock();
    this.input.detach();
    if (this.onWin) this.onWin(this.state.elapsed);
  }

  private lose() {
    this.state.phase = "lost";
    this.audio.playDeath();
    this.audio.stopAmbient();
    this.state.deaths++;
    saveGameState(this.state);
    this.input.releaseLock();
    this.input.detach();
    if (this.onLose) this.onLose();
  }

  toggleFlashlight() {
    this.player.toggleFlashlight();
  }

  private resize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  dispose() {
    this.paused = false;
    this.loopRunning = false;
    this.noises = [];
    this.renderer.dispose();
    this.audio.dispose();
    this.input.detach();
    window.removeEventListener("resize", this.resize);
    this.container.removeChild(this.renderer.domElement);
  }
}
