import * as THREE from 'three';
import { colorOf } from './materials.js';

const SHARD = new THREE.BoxGeometry(0.22, 0.22, 0.22);

/**
 * Effets visuels éphémères : explosion en éclats (destruction), flash au sol (blocage).
 * Chaque effet a une durée de vie et est supprimé tout seul.
 */
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }

  /** Éclats colorés qui jaillissent d'une case puis retombent. */
  burst({ x, y, z, type }, count = 12) {
    const mat = new THREE.MeshBasicMaterial({ color: colorOf(type), transparent: true });
    const shards = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(SHARD, mat);
      m.position.set(x, y, z);
      m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 6 + 2, (Math.random() - 0.5) * 6);
      m.userData.spin = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(8);
      this.scene.add(m);
      shards.push(m);
    }
    this.items.push({ shards, mat, life: 0.8, total: 0.8 });
  }

  /** Anneau qui grossit puis disparaît (mur touché, tir...). */
  ring({ x, y, z }, color = 0xffffff) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.5, 24), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y - 0.45, z);
    this.scene.add(m);
    this.items.push({ ring: m, mat, life: 0.5, total: 0.5 });
  }

  /** Feu d'artifice autour du joueur (réussite d'un niveau) : plusieurs salves décalées. */
  celebrate({ x, z }, duration = 2.5) {
    const colors = [0xffd400, 0x4ff0ff, 0x5ef28a, 0xff2d2d, 0xffffff];
    const salvos = Math.floor(duration / 0.25);
    for (let i = 0; i < salvos; i++) {
      setTimeout(() => {
        const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 4;
        const type = colors[i % colors.length];
        this.burst({ x: x + Math.cos(a) * r, y: 1 + Math.random() * 2, z: z + Math.sin(a) * r, type }, 16);
        this.ring({ x, y: 0, z }, type);
      }, i * 250);
    }
  }

  update(dt) {
    for (const it of [...this.items]) {
      it.life -= dt;
      const k = Math.max(0, it.life / it.total);
      it.mat.opacity = k;
      if (it.shards) {
        for (const s of it.shards) {
          s.userData.v.y -= 18 * dt;
          s.position.addScaledVector(s.userData.v, dt);
          s.rotation.x += s.userData.spin.x * dt;
          s.rotation.y += s.userData.spin.y * dt;
          s.scale.setScalar(k);
        }
      }
      if (it.ring) it.ring.scale.setScalar(1 + (1 - k) * 3);
      if (it.life <= 0) {
        if (it.shards) it.shards.forEach((s) => this.scene.remove(s));
        if (it.ring) { this.scene.remove(it.ring); it.ring.geometry.dispose(); }
        it.mat.dispose();
        this.items.splice(this.items.indexOf(it), 1);
      }
    }
  }
}
