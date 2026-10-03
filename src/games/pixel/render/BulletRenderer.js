import * as THREE from 'three';
import { MATERIALS } from './materials.js';

const GEO = new THREE.SphereGeometry(0.22, 10, 10);

/** Une petite sphère par balle, interpolée vers la position logique. */
export class BulletRenderer {
  constructor(scene, game) {
    this.game = game;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.meshes = new Map();   // bullet.id -> mesh
  }

  update(dt) {
    const alive = new Set();
    for (const b of this.game.projectiles) {
      alive.add(b.id);
      let m = this.meshes.get(b.id);
      if (!m) {
        m = new THREE.Mesh(GEO, MATERIALS.bullet);
        m.position.set(b.x - b.dx, b.y - b.dy, b.z - b.dz);
        this.meshes.set(b.id, m);
        this.group.add(m);
      }
      m.position.lerp(new THREE.Vector3(b.x, b.y, b.z), Math.min(1, dt * 14));
    }
    for (const [id, m] of this.meshes) {
      if (!alive.has(id)) {
        this.group.remove(m);
        this.meshes.delete(id);
      }
    }
  }

  clear() {
    this.group.clear();
    this.meshes.clear();
  }
}
