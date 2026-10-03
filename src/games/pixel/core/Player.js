import { NEIGHBORS6 } from './constants.js';
import { key } from './World.js';

/**
 * Le joueur : un pixel rouge (toujours à l'offset local 0,0,0, hauteur 0)
 * + une liste de cubes jaunes décrits par leur offset {x, y, z} relatif au rouge.
 * Position monde du rouge : (this.x, 0, this.z).
 */
export class Player {
  constructor() {
    this.x = 0;
    this.z = 0;
    this.offsets = [];
    this.alive = true;
    this._index = new Set();
  }

  _reindex() {
    this._index = new Set(this.offsets.map((o) => key(o.x, o.y, o.z)));
  }

  /** Position monde du pixel rouge. */
  get position() {
    return { x: this.x, y: 0, z: this.z };
  }

  toLocal(wx, wy, wz) {
    return { x: wx - this.x, y: wy, z: wz - this.z };
  }

  toWorld(o) {
    return { x: this.x + o.x, y: o.y, z: this.z + o.z };
  }

  /** Toutes les cases occupées (monde). index = -1 pour le rouge. */
  cells() {
    return [
      { x: this.x, y: 0, z: this.z, lx: 0, ly: 0, lz: 0, index: -1 },
      ...this.offsets.map((o, i) => ({ x: this.x + o.x, y: o.y, z: this.z + o.z, lx: o.x, ly: o.y, lz: o.z, index: i })),
    ];
  }

  hasLocal(lx, ly, lz) {
    return (lx === 0 && ly === 0 && lz === 0) || this._index.has(key(lx, ly, lz));
  }

  occupies(wx, wy, wz) {
    return this.hasLocal(wx - this.x, wy, wz - this.z);
  }

  getOffsetIndex(lx, ly, lz) {
    return this.offsets.findIndex((o) => o.x === lx && o.y === ly && o.z === lz);
  }

  addOffset(lx, ly, lz) {
    if (this.hasLocal(lx, ly, lz)) return null;
    const o = { x: lx, y: ly, z: lz };
    this.offsets.push(o);
    this._index.add(key(lx, ly, lz));
    return o;
  }

  /** Ajoute un cube jaune au-dessus d'une colonne locale (première case libre >= fromY). */
  addOnTop(lx, lz, fromY = 0) {
    let y = fromY;
    while (this.hasLocal(lx, y, lz)) y++;
    return this.addOffset(lx, y, lz);
  }

  removeLocal(lx, ly, lz) {
    const i = this.getOffsetIndex(lx, ly, lz);
    if (i < 0) return null;
    const [o] = this.offsets.splice(i, 1);
    this._index.delete(key(lx, ly, lz));
    return o;
  }

  /**
   * Gravité : un cube ne peut pas flotter. Chaque cube descend tant que la case
   * en dessous est libre (ni sol, ni cube du joueur, ni case du monde).
   * `isWorldFree(wx, wy, wz)` est fourni par le jeu. Retourne les déplacements.
   */
  applyGravity(isWorldFree) {
    const moved = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (const o of [...this.offsets].sort((a, b) => a.y - b.y)) {
        const from = { ...o };
        while (o.y > 0 && !this.hasLocal(o.x, o.y - 1, o.z) && isWorldFree(this.x + o.x, o.y - 1, this.z + o.z)) {
          o.y -= 1;
          changed = true;
        }
        if (o.y !== from.y) {
          this._reindex();
          moved.push({ from, to: { ...o } });
        }
      }
    }
    return moved;
  }

  /** Remplace entièrement la liste des offsets (moveyellow). */
  setOffsets(list) {
    this.offsets = list.map((o) => ({ x: o.x, y: o.y, z: o.z }));
    this._reindex();
  }

  /**
   * Parcours en largeur depuis le rouge : tout cube jaune non relié (6 faces)
   * est retiré. Retourne les offsets détruits.
   */
  pruneDetached() {
    const visited = new Set([key(0, 0, 0)]);
    const stack = [[0, 0, 0]];
    while (stack.length) {
      const [x, y, z] = stack.pop();
      for (const [dx, dy, dz] of NEIGHBORS6) {
        const k = key(x + dx, y + dy, z + dz);
        if (!visited.has(k) && this._index.has(k)) {
          visited.add(k);
          stack.push([x + dx, y + dy, z + dz]);
        }
      }
    }
    const removed = this.offsets.filter((o) => !visited.has(key(o.x, o.y, o.z)));
    if (removed.length) {
      this.offsets = this.offsets.filter((o) => visited.has(key(o.x, o.y, o.z)));
      this._reindex();
    }
    return removed;
  }

  get size() {
    return this.offsets.length;
  }
}
