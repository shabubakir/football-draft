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
  private exitPosition: THREE.Vector3;

  onWin: ((time: number) => void) | null = null;
  onLose: (() => void) | null = null;
  onHudUpdate: ((hud: { stamina: number; battery: number; fuses: number; fusesTotal: number }) => void) | null = null;

  constructor(private container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);
    this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.04);

    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    container.appendChild(this.renderer.domElement);

    this.input = new Input();
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

    // Ambient light
    const ambient = new THREE.AmbientLight(0x111122, 0.5);
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

    for (let i = 0; i < fuseCount; i++) {
      const x = rng.nextInt(1, this.maze.size - 2);
      const z = rng.nextInt(1, this.maze.size - 2);
      this.items.push({
        type: "fuse",
        position: new THREE.Vector3(
          x * CELL_SIZE + CELL_SIZE / 2,
          0.5,
          z * CELL_SIZE + CELL_SIZE / 2
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
    });

    // Exit marker
    const exitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 3, 16),
      new THREE.MeshStandardMaterial({ color: 0x0044ff, emissive: 0x0044ff, emissiveIntensity: 0.3, transparent: true, opacity: 0.5 })
    );
    exitMesh.position.copy(this.exitPosition);
    this.scene.add(exitMesh);
  }

  start() {
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

    requestAnimationFrame(this.loop);
  }

  private loop = (time: number) => {
    if (this.state.phase !== "playing") return;

    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    this.state.elapsed += dt;

    // Player update
    const bounds = {
      min: new THREE.Vector3(0.5, 0, 0.5),
      max: new THREE.Vector3(
        this.maze.size * CELL_SIZE - 0.5,
        0,
        this.maze.size * CELL_SIZE - 0.5
      ),
    };
    this.player.update(dt, this.input, bounds);

    // Generate noise from player
    if (this.player.currentNoise > 0) {
      this.noises.push({
        position: this.player.position.clone(),
        intensity: this.player.currentNoise,
        timestamp: time,
      });
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

    // Audio update
    const proximity = this.monsterAI.getProximity(this.player.position);
    this.audio.update(dt, this.player.currentNoise > 0, this.player.isRunning, proximity);

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
    this.renderer.dispose();
    this.audio.dispose();
    this.input.detach();
    window.removeEventListener("resize", this.resize);
    this.container.removeChild(this.renderer.domElement);
  }
}
