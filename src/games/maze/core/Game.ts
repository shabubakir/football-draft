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
import {
  loadEconomy,
  saveEconomy,
  type EconomyState,
} from "./Economy";
import { raidForLevel, MAX_RAID_LEVEL } from "./raidConfig";
import {
  LootSystem,
  LOOT_NAMES,
  type LootItem,
  type LootTier,
} from "../loot/LootSystem";

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

  // ---- Extraction (R.E.P.O.-style) state ----
  loot!: LootSystem;
  economy!: EconomyState;
  heldLoot: LootItem | null = null;
  capacityMax = 40;
  onHeldChange: (() => void) | null = null;
  /** Raid config for the run in progress (set in start()). */
  get raid() {
    return raidForLevel(this.economy.raidLevel, this.state.difficulty);
  }

  // Ceiling fixtures (Backrooms-style): permanent point lights that
  // flicker. The player walks towards them.
  private roomLightBulbs: { room: number; light: THREE.PointLight }[] = [];

  onWin: ((time: number) => void) | null = null;
  onLose: (() => void) | null = null;
  onHudUpdate: ((hud: {
    stamina: number;
    battery: number;
    fuses: number;
    fusesTotal: number;
    banked: number;
    quota: number;
    carried: number;
    timeLeft: number;
    event: string | null;
  }) => void) | null = null;
  onBanner: ((text: string) => void) | null = null;
  onPause: ((paused: boolean) => void) | null = null;
  private paused = false;
  private qDropped = false;
  private ePressed = false;
  private wWall = false;
  private bannerTimer = 0;
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
      if (code === "KeyF" && this.state.phase === "raid" && !this.paused) {
        this.toggleFlashlight();
      }
    };
    this.audio = new AudioManager();

    this.state = loadGameState();
    this.economy = loadEconomy();
    const cfg = this.raid;
    this.maze = new MazeGenerator(cfg.mazeSize, this.state.seed);
    this.maze.generate();

    const diff = DIFFICULTIES[this.state.difficulty];

    this.mazeRenderer = new MazeRenderer(this.maze);
    this.scene.add(this.mazeRenderer.group);

    this.player = new Player(this.camera);
    this.scene.add(this.player.mesh);
    this.loot = new LootSystem(this.player);
    this.loot.setScene(this.scene);

    // Player starts at center-ish
    const startPos = new THREE.Vector3(
      2 * CELL_SIZE + CELL_SIZE / 2,
      0,
      2 * CELL_SIZE + CELL_SIZE / 2
    );
    this.player.position.copy(startPos);

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
    this.spawnLoot(cfg);

    this.resize();
    window.addEventListener("resize", this.resize);
  }

  // ---- Loot: spawning, carrying, extraction ------------------------------

  /** Place value-bearing loot items for a raid config (rooms get the best). */
  spawnLoot(cfg: {
    lootCount: number;
    lootWeights: { cheap: number; medium: number; expensive: number };
    rareLootChance: number;
    quota: number;
  }) {
    const rng = new RNG(this.state.seed + 777);
    const items: LootItem[] = [];

    // Value scales with the raid so quotas stay meaningful:
    // each level's loot pool can plausibly clear its own quota 1.5–2x over.
    const scale = cfg.quota / 5000;
    const roomCenters = this.maze.roomCenters();
    const spots: { x: number; z: number }[] = [];
    if (roomCenters.length > 0) {
      roomCenters.forEach((rc) => {
        spots.push(rc);
        // one extra spot next to the room center
        spots.push({
          x: THREE.MathUtils.clamp(rc.x + 4, 4, this.maze.size * CELL_SIZE - 4),
          z: rc.z,
        });
      });
    }

    for (let i = 0; i < cfg.lootCount; i++) {
      let x: number;
      let z: number;
      if (spots.length > 0 && rng.next() < 0.65) {
        const rc = spots[rng.nextInt(0, spots.length - 1)];
        x = rc.x + (rng.next() - 0.5) * 4;
        z = rc.z + (rng.next() - 0.5) * 4;
      } else {
        x = (1 + rng.nextInt(0, this.maze.size - 3)) * CELL_SIZE + CELL_SIZE / 2;
        z = (1 + rng.nextInt(0, this.maze.size - 3)) * CELL_SIZE + CELL_SIZE / 2;
      }
      // Keep loot away from the spawn and the extraction pad
      const distToStart = Math.hypot(x - this.player.position.x, z - this.player.position.z);
      const distToExit = Math.hypot(x - this.exitPosition.x, z - this.exitPosition.z);
      if (distToStart < 8 || distToExit < 6) {
        x = (1 + rng.nextInt(0, this.maze.size - 3)) * CELL_SIZE + CELL_SIZE / 2;
        z = (1 + rng.nextInt(0, this.maze.size - 3)) * CELL_SIZE + CELL_SIZE / 2;
      }

      // Pick a tier from weights
      const roll = rng.next() * (cfg.lootWeights.cheap + cfg.lootWeights.medium + cfg.lootWeights.expensive);
      let tier: LootTier;
      let value = 0;
      if (roll < cfg.lootWeights.cheap) {
        tier = "cheap";
        value = (50 + rng.next() * 200) * (scale < 1 ? scale : 1);
      } else if (roll < cfg.lootWeights.cheap + cfg.lootWeights.medium) {
        tier = "medium";
        value = (400 + rng.next() * 800) * scale;
      } else {
        tier = "expensive";
        value = (2000 + rng.next() * 2500) * scale;
      }
      // Rare "artifact" roll — the jackpot that makes the risk worthwhile
      if (rng.next() < cfg.rareLootChance) {
        tier = "artifact";
        value = (6000 + rng.next() * 3000) * scale;
      }
      value = Math.round(value / 50) * 50;

      const item: LootItem = {
        id: i,
        tier,
        value,
        weight:
          tier === "cheap" ? 2 + rng.next() * 4 :
          tier === "medium" ? 6 + rng.next() * 8 :
          tier === "expensive" ? 15 + rng.next() * 25 :
          30 + rng.next() * 30,
        fragility:
          tier === "artifact" ? 0.9 :
          tier === "expensive" ? 0.7 :
          tier === "medium" ? 0.35 : 0.15,
        position: new THREE.Vector3(x, 0.55, z),
        state: "ground",
        vel: new THREE.Vector3(),
        mesh: null,
        shakesLeft: 0,
        spin: new THREE.Vector3(),
      };
      items.push(item);
    }

    this.loot.items = items;
    this.loot.buildMeshes();
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
    const roomCenters = this.maze.roomCentersTop3();
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

    this.loot.buildMeshes();

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
    if (this.state.phase !== "raid" && !this.paused) return;
    this.paused = !this.paused;
    if (this.paused) this.input.releaseLock();
    this.onPause?.(this.paused);
  }

  // Called from the UI when the pointer is released (Esc) — pause the game
  handlePointerUnlock() {
    if (this.state.phase === "raid" && !this.paused) {
      this.togglePause();
    }
  }

  start() {
    this.startRaid();
  }

  /** Begin a raid: fresh seed/maze/loot, quota from the economy level. */
  startRaid() {
    const cfg = this.raid;
    this.paused = false;
    this.state.phase = "raid";
    this.state.seed = Math.floor(Math.random() * 1000000);
    this.state.quota = cfg.quota;
    this.state.banked = 0;
    this.state.carried = 0;
    this.state.elapsed = 0;
    this.state.eventBanner = null;
    this.state.fusesCollected = 0;
    this.state.fusesTotal = DIFFICULTIES[this.state.difficulty].fuseCount;
    this.lastTime = performance.now();

    // Upgrades feed into this raid
    this.capacityMax = 40 + this.economy.upgrades.capacity * 20;
    const up = this.economy.upgrades;
    this.player.staminaExhausted = false;
    this.player.flashlightBattery = 100;
    this.player.flashlightOn = true;
    this.player.flashlightBoost = up.flashlight > 0 ? 1.4 : 1;
    this.player.batteryCapacity = 100 + up.battery * 50;
    this.player.speedMult = 1 + up.speed * 0.1;
    this.player.staminaMult = 1 + up.stamina * 0.25;
    this.player.stamina = 100;

    this.audio.init();
    this.audio.resume();
    this.audio.startAmbient();

    this.input.attach();
    this.input.requestLock(this.renderer.domElement);

    // Regenerate maze with the raid-level size + new seed
    this.maze = new MazeGenerator(cfg.mazeSize, this.state.seed);
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

    // Reset monster
    const monsterSpawn = new THREE.Vector3(
      (this.maze.size - 3) * CELL_SIZE + CELL_SIZE / 2,
      0,
      (this.maze.size - 3) * CELL_SIZE + CELL_SIZE / 2
    );
    this.monsterAI.position.copy(monsterSpawn);
    this.monsterAI.state = "PATROL";
    this.monsterAI.path = [];
    this.monsterAI.pathIndex = 0;

    // Reposition items + spawn the raid's loot
    this.placeItems(
      DIFFICULTIES[this.state.difficulty].batteryCount,
      DIFFICULTIES[this.state.difficulty].fuseCount
    );
    this.spawnLoot(cfg);

    // Drop anything from a previous run
    if (this.heldLoot) {
      const it = this.heldLoot;
      it.state = "ground";
      it.mesh!.visible = true;
    }
    this.heldLoot = null;
    this.onHeldChange?.();

    this.setupRoomLights();

    // Never run two loops: a double-click on start/restart only resets the
    // state above while the already-running loop picks it up next frame.
    if (!this.loopRunning) {
      this.loopRunning = true;
      requestAnimationFrame(this.loop);
    }
  }

  /**
   * Raid over (extracted or caught). Settles the economy and returns the
   * summary the shop UI needs.
   */
  finishRaid(won: boolean): {
    won: boolean;
    banked: number;
    quota: number;
    total: number;
    nextLevel: number;
  } {
    const s = this.state;
    const banked = s.banked;
    const quota = s.quota;
    const carried = s.carried;
    const e = this.economy;

    if (won && banked >= quota) {
      // Success: keep the haul, level up, bonus for the over-quota part
      e.money += banked;
      e.totalEarned += banked;
      e.raidsWon++;
      if (banked > e.bestExtraction) e.bestExtraction = banked;
      const leftover = banked - quota;
      if (leftover > 0) e.money += Math.floor(leftover * 0.25);
      e.raidLevel = Math.min(MAX_RAID_LEVEL, e.raidLevel + 1);
    } else if (won) {
      // Extracted but under quota — the haul still banks, no level-up
      e.money += banked;
      e.totalEarned += banked;
      e.raidsLost++;
    } else {
      // Caught: unsaved loot is gone, 20% insurance on the banked part
      e.money += Math.floor(banked * 0.2);
      e.raidsLost++;
    }
    void carried;
    saveEconomy(e);

    this.state.phase = "shop";
    // Freeze the run
    this.input.detach();
    this.input.releaseLock();
    this.audio.stopAmbient();

    return {
      won,
      banked,
      quota,
      total: e.money,
      nextLevel: e.raidLevel,
    };
  }

  private loop = (time: number) => {
    if (this.state.phase !== "raid") {
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

    // Banner auto-clear
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.state.eventBanner = null;
    }

    // Player update (with the live maze for wall collision)
    const bounds = {
      min: new THREE.Vector3(0.5, 0, 0.5),
      max: new THREE.Vector3(
        this.maze.size * CELL_SIZE - 0.5,
        0,
        this.maze.size * CELL_SIZE - 0.5
      ),
    };
    this.player.update(dt, this.input, bounds, this.maze, CELL_SIZE, this.carriedWeight / this.capacityMax);

    // Carry logic (E interact, weight slows, Q drop, wall auto-drop)
    this.updateCarry(dt);

    // Loot physics (rolling drops, held item follows camera)
    this.loot.update(dt, this.camera, this.heldLoot, this.maze, CELL_SIZE);
    this.state.carried = this.heldLoot ? this.heldLoot.value : 0;

    // Generate noise from player (steps scale with carried weight)
    let noise = this.player.currentNoise;
    if (this.heldLoot) {
      const w = this.carriedWeight / this.capacityMax;
      noise += w * 0.15; // heavy load = audible footsteps
    }
    if (noise > 0) {
      this.noises.push({
        position: this.player.position.clone(),
        intensity: THREE.MathUtils.clamp(noise, 0, 1),
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

    // Check item pickups (batteries / fuses)
    this.checkPickups();

    // Extraction: standing on the pad with loot banks it instantly
    if (this.heldLoot && this.player.position.distanceTo(this.exitPosition) < 2.2) {
      this.extractHeld();
    }

    // Check win condition: quota met at the extraction pad
    if (
      this.state.banked >= this.state.quota &&
      this.player.position.distanceTo(this.exitPosition) < 2.5
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
      this.player.moving,
      this.player.isRunning,
      proximity,
      lightProximity
    );

    // HUD update
    const cfg = this.raid;
    if (this.onHudUpdate) {
      this.onHudUpdate({
        stamina: this.player.stamina,
        battery: this.player.flashlightBattery,
        fuses: this.state.fusesCollected,
        fusesTotal: this.state.fusesTotal,
        banked: this.state.banked,
        quota: this.state.quota,
        carried: this.state.carried,
        timeLeft: Math.max(0, cfg.raidTimeLimit - this.state.elapsed),
        event: this.state.eventBanner,
      });
    }

    // Render
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  }

  // ---- Carrying loot ------------------------------------------------------

  get carriedWeight(): number {
    return this.heldLoot ? this.heldLoot.weight : 0;
  }

  private updateCarry(dt: number) {
    const L = this.loot;
    void dt;
    const distToNearest = L.nearestGroundItem(this.player.position, 2.2);

    if (this.heldLoot) {
      // Q — drop it (noise depends on weight)
      if (this.input.isDown("KeyQ") && !this.qDropped) {
        this.qDropped = true;
        this.dropHeldLoot();
      }
      if (!this.input.isDown("KeyQ")) this.qDropped = false;

      // Wall ahead? The load won't fit — auto-drop with a thud
      const fwd = new THREE.Vector3(
        -Math.sin(this.player.rotationY),
        0,
        -Math.cos(this.player.rotationY)
      );
      const probe = this.player.position.clone().addScaledVector(fwd, 1.1);
      const solid = this.maze.solidAtWorld(probe.x, probe.z, CELL_SIZE);
      if (solid && !this.wWall) {
        this.wWall = true;
        this.dropHeldLoot();
      } else if (!solid) {
        this.wWall = false;
      }

      // Sprinting out of stamina while overloaded = the load comes off
      if (this.player.stamina <= 0 && this.player.isRunning && this.carriedWeight > 15) {
        this.dropHeldLoot();
        this.banner("СЛОМАННАЯ СПИНА — ЛУТ УПАЛ");
      }
    } else {
      this.wWall = false;
      // E — pick up the nearest item if the pack has room
      if (this.input.isDown("KeyE") && !this.ePressed) {
        this.ePressed = true;
        if (distToNearest) {
          const free = this.capacityMax - this.carriedWeight;
          if (distToNearest.weight <= free + 0.01) {
            this.pickUpLoot(distToNearest);
          } else {
            this.banner(`СЛИШКОМ ТЯЖЕЛО (${distToNearest.weight.toFixed(0)} кг, место ${free.toFixed(0)} кг)`);
          }
        }
      }
      if (!this.input.isDown("KeyE")) this.ePressed = false;
    }
  }

  private pickUpLoot(item: LootItem) {
    if (this.carriedWeight + item.weight > this.capacityMax + 0.01) return;
    item.state = "held";
    this.heldLoot = item;
    this.audio.playPickup();
    this.banner(`${LOOT_NAMES[item.tier]} — $${item.value}`);
    this.onHeldChange?.();
  }

  private dropHeldLoot() {
    const item = this.heldLoot;
    if (!item) return;
    item.state = "ground";
    const fwd = new THREE.Vector3(
      -Math.sin(this.player.rotationY),
      0,
      -Math.cos(this.player.rotationY)
    );
    item.position.copy(this.player.position).addScaledVector(fwd, 1.3);
    item.position.y = 0.55;
    item.vel.copy(fwd).multiplyScalar(3);
    item.shakesLeft = Math.ceil(item.weight / 8);
    item.mesh!.visible = true;
    this.heldLoot = null;
    this.audio.playDrop(THREE.MathUtils.clamp(item.weight / 40, 0.2, 1));
    // The thud draws the monster — a real noise event
    this.noises.push({
      position: item.position.clone(),
      intensity: THREE.MathUtils.clamp(0.5 + item.weight / 40, 0.4, 1),
      timestamp: performance.now(),
    });
    this.banner(`УБРОСИЛ: ${LOOT_NAMES[item.tier]} ($${item.value})`);
    this.onHeldChange?.();
  }

  /** Bank the held loot at the extraction pad. */
  private extractHeld() {
    const item = this.heldLoot;
    if (!item) return;
    item.state = "extracted";
    this.heldLoot = null;
    this.state.banked += item.value;
    this.audio.playWin();
    this.banner(`+ $${item.value} В КАЗНУ`);
    this.onHeldChange?.();
  }

  private banner(text: string) {
    this.state.eventBanner = text;
    this.bannerTimer = 3;
    this.onBanner?.(text);
  }

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
        } else if (item.type === "fuse") {
          this.state.fusesCollected++;
          this.audio.playMechanical();
        }
      }
    }
  }

  private win() {
    const won = this.state.banked >= this.state.quota;
    if (won && (this.state.bestTime === null || this.state.elapsed < this.state.bestTime)) {
      this.state.bestTime = this.state.elapsed;
    }
    if (won) this.state.wins++;
    this.state.lastSeed = this.state.seed;
    saveGameState(this.state);
    this.audio.playWin();
    if (this.onWin) this.onWin(this.state.elapsed);
  }

  private lose() {
    this.audio.playDeath();
    this.state.deaths++;
    saveGameState(this.state);
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
