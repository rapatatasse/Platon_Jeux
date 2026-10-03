import { CHUNK_SIZE } from './constants.js';

export const key = (x, y, z) => `${x},${y},${z}`;
export const chunkKey = (cx, cz) => `${cx},${cz}`;
export const toChunk = (v) => Math.floor(v / CHUNK_SIZE);

/**
 * Plateau infini : les cases sont rangées par "chunk" (carré de CHUNK_SIZE x CHUNK_SIZE).
 * Un chunk est généré la première fois qu'on s'en approche (populateChunk).
 * Le rendu ne redessine que les chunks marqués "dirty".
 */
export class World {
  constructor(populateChunk) {
    this.populateChunk = populateChunk;   // (world, cx, cz) => void
    this.chunks = new Map();              // chunkKey -> Map(cellKey -> { x, y, z, type })
    this.loaded = new Set();              // chunks déjà générés
    this.dirty = new Set();               // chunks à redessiner
  }

  _chunk(x, z, create = false) {
    const ck = chunkKey(toChunk(x), toChunk(z));
    let c = this.chunks.get(ck);
    if (!c && create) {
      c = new Map();
      this.chunks.set(ck, c);
    }
    return c;
  }

  get(x, y, z) {
    return this._chunk(x, z)?.get(key(x, y, z))?.type ?? null;
  }

  has(x, y, z) {
    return this.get(x, y, z) !== null;
  }

  set(x, y, z, type) {
    this._chunk(x, z, true).set(key(x, y, z), { x, y, z, type });
    this.markDirty(x, z);
  }

  remove(x, y, z) {
    const c = this._chunk(x, z);
    const k = key(x, y, z);
    const cell = c?.get(k);
    if (!cell) return null;
    c.delete(k);
    this.markDirty(x, z);
    return cell.type;
  }

  markDirty(x, z) {
    this.dirty.add(chunkKey(toChunk(x), toChunk(z)));
  }

  /** Génère les chunks manquants autour d'une position (en cases). */
  ensureAround(x, z, radiusChunks) {
    const cx0 = toChunk(x), cz0 = toChunk(z);
    for (let cx = cx0 - radiusChunks; cx <= cx0 + radiusChunks; cx++) {
      for (let cz = cz0 - radiusChunks; cz <= cz0 + radiusChunks; cz++) {
        const ck = chunkKey(cx, cz);
        if (this.loaded.has(ck)) continue;
        this.loaded.add(ck);
        this.populateChunk(this, cx, cz);
        this.dirty.add(ck);
      }
    }
  }

  /** Toutes les cases d'un chunk (tableau, éventuellement vide). */
  cellsOfChunk(cx, cz) {
    return [...(this.chunks.get(chunkKey(cx, cz))?.values() ?? [])];
  }

  /** Itère sur toutes les cases d'un type dans un rayon (utilisé par l'IA des violets). */
  *cellsNear(x, z, radius, type = null) {
    for (let cx = toChunk(x - radius); cx <= toChunk(x + radius); cx++) {
      for (let cz = toChunk(z - radius); cz <= toChunk(z + radius); cz++) {
        const c = this.chunks.get(chunkKey(cx, cz));
        if (!c) continue;
        for (const cell of c.values()) {
          if (type && cell.type !== type) continue;
          if (Math.abs(cell.x - x) <= radius && Math.abs(cell.z - z) <= radius) yield cell;
        }
      }
    }
  }

  /** Vide un carré autour d'une position (zone de sécurité au début d'un niveau). */
  clearArea(x, z, radius) {
    for (const cell of [...this.cellsNear(x, z, radius)]) this.remove(cell.x, cell.y, cell.z);
  }

  takeDirty() {
    const d = [...this.dirty];
    this.dirty.clear();
    return d;
  }
}
