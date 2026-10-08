import * as THREE from "three";
import { MonsterAI } from "./MonsterAI";

export class Monster {
  group = new THREE.Group();
  ai: MonsterAI;

  private body: THREE.Mesh;
  private head: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private leftEye: THREE.Mesh;
  private rightEye: THREE.Mesh;

  private animTime = 0;
  private isMoving = false;

  constructor(ai: MonsterAI) {
    this.ai = ai;

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.9,
      metalness: 0.2,
    });

    // Body — elongated
    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.2, 8, 16), darkMat);
    this.body.position.y = 1.2;
    this.group.add(this.body);

    // Head
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), darkMat);
    this.head.position.y = 2.1;
    this.group.add(this.head);

    // Glowing eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
    this.leftEye.position.set(-0.1, 2.15, 0.25);
    this.group.add(this.leftEye);

    this.rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
    this.rightEye.position.set(0.1, 2.15, 0.25);
    this.group.add(this.rightEye);

    // Arms — long, thin
    this.leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 1.0, 8, 8), darkMat);
    this.leftArm.position.set(-0.5, 1.3, 0);
    this.leftArm.rotation.z = 0.3;
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 1.0, 8, 8), darkMat);
    this.rightArm.position.set(0.5, 1.3, 0);
    this.rightArm.rotation.z = -0.3;
    this.group.add(this.rightArm);

    // Legs
    this.leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.8, 8, 8), darkMat);
    this.leftLeg.position.set(-0.2, 0.4, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.8, 8, 8), darkMat);
    this.rightLeg.position.set(0.2, 0.4, 0);
    this.group.add(this.rightLeg);

    this.group.position.copy(ai.position);
  }

  update(dt: number) {
    // Sync position from AI
    this.group.position.set(
      this.ai.position.x,
      0,
      this.ai.position.z
    );

    // Face movement direction
    this.group.rotation.y = this.ai.position.y;

    // Simple walk animation
    this.isMoving =
      this.ai.state === "CHASE" ||
      this.ai.state === "ATTACK" ||
      this.ai.state === "INVESTIGATE" ||
      this.ai.state === "SEARCH";

    if (this.isMoving) {
      this.animTime += dt * 8;
    } else {
      this.animTime += dt * 2; // idle sway
    }

    const swing = this.isMoving ? Math.sin(this.animTime) * 0.4 : Math.sin(this.animTime) * 0.05;

    // Limb animation
    this.leftArm.rotation.x = swing;
    this.rightArm.rotation.x = -swing;
    this.leftLeg.rotation.x = -swing;
    this.rightLeg.rotation.x = swing;

    // Body sway
    this.body.rotation.z = Math.sin(this.animTime * 0.5) * 0.05;
    this.head.rotation.z = Math.sin(this.animTime * 0.3) * 0.08;

    // Eye glow pulsing
    const pulse = 0.7 + 0.3 * Math.sin(this.animTime * 2);
    (this.leftEye.material as THREE.MeshBasicMaterial).color.setRGB(pulse, 0, 0);
    (this.rightEye.material as THREE.MeshBasicMaterial).color.setRGB(pulse, 0, 0);
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        obj.material.dispose();
      }
    });
  }
}
