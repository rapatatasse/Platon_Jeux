import * as THREE from 'three';
import { CELL } from '../core/constants.js';
import { CUBE_GEOMETRY, MATERIALS } from './materials.js';

/**
 * Le joueur : un groupe Three.js (rouge + jaunes) reconstruit quand sa forme change,
 * et déplacé en douceur (lerp) vers sa position logique entre deux ticks.
 */
export class PlayerRenderer {
  constructor(scene, player) {
    this.player = player;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.dirty = true;
    this.pops = new Map();   // key -> temps restant de l'animation "pop"

    this.red = new THREE.Mesh(CUBE_GEOMETRY, MATERIALS.red);
    this.red.castShadow = true;
    this.group.add(this.red);

    this.yellows = new THREE.Group();
    this.group.add(this.yellows);
    this.group.position.set(player.x, 0, player.z);
  }

  markDirty() {
    this.dirty = true;
  }

  /** Lance une petite animation d'apparition sur un cube (offset local). */
  pop(local) {
    this.pops.set(`${local.x},${local.y},${local.z}`, 0.35);
  }

  rebuild() {
    this.yellows.clear();
    for (const o of this.player.offsets) {
      const m = new THREE.Mesh(CUBE_GEOMETRY, MATERIALS[CELL.YELLOW]);
      m.castShadow = true;
      m.position.set(o.x, o.y, o.z);
      m.userData.key = `${o.x},${o.y},${o.z}`;
      this.yellows.add(m);
    }
    this.dirty = false;
  }

  update(dt, time) {
    if (this.dirty) this.rebuild();
    this.group.position.lerp(new THREE.Vector3(this.player.x, 0, this.player.z), Math.min(1, dt * 10));
    this.red.material.emissiveIntensity = 0.3 + 0.2 * Math.sin(time * 4);

    for (const m of this.yellows.children) {
      const t = this.pops.get(m.userData.key);
      if (t === undefined) continue;
      const left = t - dt;
      const s = left > 0 ? 1 + 0.5 * Math.sin((1 - left / 0.35) * Math.PI) : 1;
      m.scale.setScalar(s);
      if (left <= 0) this.pops.delete(m.userData.key); else this.pops.set(m.userData.key, left);
    }
  }
}
