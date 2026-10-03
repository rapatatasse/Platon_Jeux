import * as THREE from 'three';
import { CELL, CHUNK_SIZE, VIEW_CHUNKS } from '../core/constants.js';
import { toChunk, chunkKey } from '../core/World.js';
import { CUBE_GEOMETRY, MATERIALS } from './materials.js';

const TYPES = [CELL.YELLOW, CELL.PURPLE, CELL.WHITE];
const _m = new THREE.Matrix4();

/**
 * Dessine le monde chunk par chunk avec des InstancedMesh (1 draw call par type et par chunk).
 * Seuls les chunks marqués "dirty" par le World sont reconstruits.
 * Les chunks trop loin du joueur sont retirés de la scène (pas de la mémoire du World).
 */
export class WorldRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.chunks = new Map();   // chunkKey -> { group, cx, cz }
  }

  setWorld(world) {
    this.world = world;
    this.clear();
    for (const ck of world.chunks.keys()) world.dirty.add(ck);
  }

  clear() {
    for (const c of this.chunks.values()) this.group.remove(c.group);
    this.chunks.clear();
  }

  update(playerX, playerZ) {
    const pcx = toChunk(playerX), pcz = toChunk(playerZ);
    for (const ck of this.world.takeDirty()) {
      const [cx, cz] = ck.split(',').map(Number);
      if (Math.abs(cx - pcx) <= VIEW_CHUNKS && Math.abs(cz - pcz) <= VIEW_CHUNKS) this.rebuildChunk(ck);
      else this.world.dirty.add(ck);   // hors champ : on attend d'en être proche
    }
    for (const [ck, c] of this.chunks) {
      const visible = Math.abs(c.cx - pcx) <= VIEW_CHUNKS && Math.abs(c.cz - pcz) <= VIEW_CHUNKS;
      c.group.visible = visible;
      if (!visible && (Math.abs(c.cx - pcx) > VIEW_CHUNKS + 2 || Math.abs(c.cz - pcz) > VIEW_CHUNKS + 2)) {
        this.group.remove(c.group);
        this.chunks.delete(ck);
        this.world.dirty.add(ck);   // sera reconstruit si on y revient
      }
    }
  }

  rebuildChunk(ck) {
    const [cx, cz] = ck.split(',').map(Number);
    const old = this.chunks.get(ck);
    if (old) this.group.remove(old.group);

    const cells = this.world.cellsOfChunk(cx, cz);
    const group = new THREE.Group();
    for (const type of TYPES) {
      const list = cells.filter((c) => c.type === type);
      if (!list.length) continue;
      const mesh = new THREE.InstancedMesh(CUBE_GEOMETRY, MATERIALS[type], list.length);
      mesh.castShadow = mesh.receiveShadow = true;
      list.forEach((c, i) => mesh.setMatrixAt(i, _m.makeTranslation(c.x, c.y, c.z)));
      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
    }
    this.group.add(group);
    this.chunks.set(ck, { group, cx, cz });
  }
}

export { CHUNK_SIZE, chunkKey };
