import * as THREE from "three";
import type { Player } from "../player/Player";
import type { MazeGenerator } from "../maze/MazeGenerator";

export type LootTier = "cheap" | "medium" | "expensive" | "artifact";

export type LootItemState = "ground" | "held" | "extracted";

export interface LootItem {
  id: number;
  tier: LootTier;
  value: number;
  weight: number;
  fragility: number; // 0..1 — chance per hard landing that value degrades
  position: THREE.Vector3;
  state: LootItemState;
  vel: THREE.Vector3;
  mesh: THREE.Mesh | null;
  shakesLeft: number;
  spin: THREE.Vector3;
}

/** Russian display names for each tier (shown on pickup banner). */
export const LOOT_NAMES: Record<LootTier, string> = {
  cheap: "Бутылка",
  medium: "Коробка с инструментами",
  expensive: "Кассета с плёнкой",
  artifact: "Реликвия",
};

/** Per-tier visual config: base color, emissive color, emissive intensity, geometry. */
const TIER_VISUAL: Record<
  LootTier,
  {
    color: number;
    emissive: number;
    emissiveIntensity: number;
    geo: () => THREE.BufferGeometry;
  }
> = {
  cheap: {
    color: 0x8a9a3a,
    emissive: 0x8a9a3a,
    emissiveIntensity: 0.35,
    geo: () => new THREE.CylinderGeometry(0.12, 0.14, 0.35, 8),
  },
  medium: {
    color: 0xb8860b,
    emissive: 0xb8860b,
    emissiveIntensity: 0.45,
    geo: () => new THREE.BoxGeometry(0.45, 0.35, 0.3),
  },
  expensive: {
    color: 0x4488ff,
    emissive: 0x4488ff,
    emissiveIntensity: 0.55,
    geo: () => new THREE.BoxGeometry(0.5, 0.25, 0.4),
  },
  artifact: {
    color: 0xffd700,
    emissive: 0xffd700,
    emissiveIntensity: 0.8,
    geo: () => new THREE.OctahedronGeometry(0.35, 0),
  },
};

/** Weight helpers used by Game.ts for HUD display. */
export function lootWeight(item: LootItem): number {
  return item.weight;
}

/** Value helper — returns the current (possibly degraded) value. */
export function lootValue(item: LootItem): number {
  return item.value;
}

export class LootSystem {
  items: LootItem[] = [];
  private player: Player;
  private scene: THREE.Scene | null = null;
  private phase = 0; // global clock for emissive pulse

  constructor(player: Player) {
    this.player = player;
  }

  /**
   * Set the scene (call before buildMeshes so meshes are added to it).
   * Game.ts assigns this after the scene is ready.
   */
  setScene(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Rebuild all item meshes. Disposes old ones, then creates fresh meshes
   * for every ground-state item. Held/extracted items get no mesh (held
   * item follows the camera, extracted items are gone).
   * Idempotent: safe to call multiple times.
   */
  buildMeshes() {
    // Dispose and remove existing item meshes
    for (const item of this.items) {
      if (item.mesh) {
        if (this.scene) this.scene.remove(item.mesh);
        item.mesh.geometry.dispose();
        const mat = item.mesh.material as THREE.Material;
        mat.dispose();
        item.mesh = null;
      }
    }

    // Create new meshes for ground-state items
    for (const item of this.items) {
      if (item.state !== "ground") continue;
      const cfg = TIER_VISUAL[item.tier];
      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.emissive,
        emissiveIntensity: cfg.emissiveIntensity,
        roughness: 0.7,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(cfg.geo(), mat);
      mesh.position.copy(item.position);
      // Random initial rotation so items don't all face the same way
      mesh.rotation.y = Math.random() * Math.PI * 2;
      item.mesh = mesh;
      if (this.scene) this.scene.add(mesh);
    }
  }

  /**
   * Find the nearest ground-state item within maxDist of pos (horizontal
   * distance, ignoring Y). Returns null if none in range.
   */
  nearestGroundItem(pos: THREE.Vector3, maxDist: number): LootItem | null {
    let best: LootItem | null = null;
    let bestDist = maxDist;
    for (const item of this.items) {
      if (item.state !== "ground") continue;
      const dx = item.position.x - pos.x;
      const dz = item.position.z - pos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestDist) {
        bestDist = d;
        best = item;
      }
    }
    return best;
  }

  /**
   * Per-frame update:
   * - Ground items: rolling physics (vel + friction + wall bounce)
   * - Held item: follows the camera (view-model position)
   * - All visible items: emissive pulse + slow idle spin (ground only)
   */
  update(
    dt: number,
    camera: THREE.PerspectiveCamera,
    held: LootItem | null,
    maze: MazeGenerator,
    cellSize: number
  ) {
    this.phase += dt;

    const fwd = new THREE.Vector3(
      -Math.sin(this.player.rotationY),
      0,
      -Math.cos(this.player.rotationY)
    );
    const right = new THREE.Vector3(
      Math.cos(this.player.rotationY),
      0,
      -Math.sin(this.player.rotationY)
    );

    for (const item of this.items) {
      if (item.state === "held") {
        // View-model: 0.9 m ahead of the camera, offset right and down
        if (item.mesh) {
          item.mesh.position
            .copy(camera.position)
            .addScaledVector(fwd, 0.9)
            .addScaledVector(right, 0.35)
            .add(new THREE.Vector3(0, -0.45, 0));
          // Slight bob while carrying
          item.mesh.position.y += Math.sin(this.phase * 4) * 0.015;
          item.mesh.rotation.y += dt * 0.5;
        }
        continue;
      }

      if (item.state === "extracted") continue;

      // Ground item: rolling physics
      if (item.vel.lengthSq() > 0.001) {
        // Move
        item.position.addScaledVector(item.vel, dt);
        // Friction
        item.vel.multiplyScalar(Math.max(0, 1 - 3.5 * dt));

        // Wall bounce (simplified: check solid at new position)
        if (maze.solidAtWorld(item.position.x, item.position.z, cellSize)) {
          // Reverse velocity component into the wall and push back
          item.vel.multiplyScalar(-0.4);
          item.position.addScaledVector(item.vel, dt * 2);
          // Hard landing: shake + fragility check
          this.applyImpact(item, item.vel.length());
        }

        // Stop rolling when slow enough
        if (item.vel.lengthSq() < 0.005) {
          item.vel.set(0, 0, 0);
        }

        // Update mesh if present
        if (item.mesh) {
          item.mesh.position.copy(item.position);
          // Tumble while rolling
          if (item.spin.lengthSq() > 0.01) {
            item.mesh.rotation.x += item.spin.x * dt;
            item.mesh.rotation.y += item.spin.y * dt;
            item.mesh.rotation.z += item.spin.z * dt;
            item.spin.multiplyScalar(Math.max(0, 1 - 2.0 * dt));
          }
        }
      } else if (item.mesh) {
        // Idle: slow spin + emissive pulse
        item.mesh.position.copy(item.position);
        item.mesh.rotation.y += dt * 0.3;
        const mat = item.mesh.material as THREE.MeshStandardMaterial;
        const base = TIER_VISUAL[item.tier].emissiveIntensity;
        mat.emissiveIntensity = base + Math.sin(this.phase * 2.5 + item.id) * base * 0.3;
      }
    }

    // Ensure held item mesh is visible, ground items visible, extracted hidden
    for (const item of this.items) {
      if (item.mesh) {
        item.mesh.visible = item.state !== "extracted";
      }
    }
  }

  /** Apply a hard-landing impact: reduce value by fragility chance. */
  private applyImpact(item: LootItem, impactSpeed: number) {
    if (item.shakesLeft <= 0) return;
    item.shakesLeft--;
    // Impact chance = fragility × (impactSpeed / 3), capped at fragility
    const chance = item.fragility * Math.min(1, impactSpeed / 3);
    if (Math.random() < chance) {
      // Value drops by 15–40%
      const loss = 0.15 + Math.random() * 0.25;
      item.value = Math.max(50, Math.round((item.value * (1 - loss)) / 50) * 50);
      // If artifact, it shatters at low value
      if (item.tier === "artifact" && item.value < 2000) {
        item.value = 0;
      }
    }
  }

  /** Dispose all item meshes (call on game dispose). */
  dispose() {
    for (const item of this.items) {
      if (item.mesh) {
        if (this.scene) this.scene.remove(item.mesh);
        item.mesh.geometry.dispose();
        (item.mesh.material as THREE.Material).dispose();
        item.mesh = null;
      }
    }
    this.items = [];
  }
}
