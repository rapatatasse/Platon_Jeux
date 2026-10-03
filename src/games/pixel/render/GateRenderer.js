import * as THREE from 'three';
import { COLORS } from '../core/constants.js';

const GEO = new THREE.PlaneGeometry(0.9, 0.9);
const POST = new THREE.BoxGeometry(0.15, 1.6, 0.15);

/** Portes : dalle lumineuse au sol (bleue à traverser, verte une fois passée) + deux poteaux. */
export class GateRenderer {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.items = [];
  }

  setGates(gates) {
    this.group.clear();
    this.items = gates.map((g) => {
      const mat = new THREE.MeshBasicMaterial({ color: COLORS.gate, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
      const tile = new THREE.Mesh(GEO, mat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(g.x, -0.45, g.z);
      const postMat = new THREE.MeshStandardMaterial({ color: COLORS.gate, emissive: COLORS.gate, emissiveIntensity: 0.6 });
      const p1 = new THREE.Mesh(POST, postMat), p2 = new THREE.Mesh(POST, postMat);
      p1.position.set(g.x, 0.3, g.z - 0.5);
      p2.position.set(g.x, 0.3, g.z + 0.5);
      this.group.add(tile, p1, p2);
      return { gate: g, mat, postMat };
    });
  }

  update(time) {
    for (const it of this.items) {
      const done = it.gate.passed;
      const color = done ? COLORS.gatePassed : COLORS.gate;
      it.mat.color.setHex(color);
      it.postMat.color.setHex(color);
      it.postMat.emissive.setHex(color);
      it.mat.opacity = done ? 0.5 : 0.55 + 0.35 * Math.sin(time * 4);
    }
  }
}
