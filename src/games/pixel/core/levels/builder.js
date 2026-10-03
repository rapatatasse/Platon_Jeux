import { CELL } from '../constants.js';
import { World } from '../World.js';
import { mulberry32, hashSeed } from './rng.js';

/**
 * Construit le monde d'un niveau à partir de sa définition (voir level1.js pour le format).
 *
 * Carte ASCII :
 *   #  mur blanc        J  cube jaune        V  cube violet
 *   T  tour violette (2 de haut)             P  porte (case à traverser avec le rouge)
 *   R  départ du joueur (sinon : centre de la carte)   .  vide
 *
 * `random` place en plus des cubes au hasard (graine déterministe) sur les cases vides,
 * à distance mini du départ (`minFromStart`) et espacés entre eux (`spacing`).
 *
 * Retourne { world, gates, start, bounds }. Les coordonnées sont translatées pour que
 * le départ soit en (0, 0).
 */
export function buildLevel(def, seed = 1) {
  const rows = def.map;
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  let start = null;
  for (let z = 0; z < h; z++) {
    const x = rows[z].indexOf('R');
    if (x >= 0) start = { x, z };
  }
  start ??= { x: Math.floor(w / 2), z: Math.floor(h / 2) };

  const world = new World(() => {});
  const gates = [];
  const free = [];
  const tx = (x) => x - start.x, tz = (z) => z - start.z;

  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[z][x] ?? '.';
      const wx = tx(x), wz = tz(z);
      switch (ch) {
        case '#': world.set(wx, 0, wz, CELL.WHITE); break;
        case 'J': world.set(wx, 0, wz, CELL.YELLOW); break;
        case 'V': world.set(wx, 0, wz, CELL.PURPLE); break;
        case 'T': world.set(wx, 0, wz, CELL.PURPLE); world.set(wx, 1, wz, CELL.PURPLE); break;
        case 'P': gates.push({ x: wx, z: wz, passed: false }); break;
        case 'R': break;
        default: free.push({ x: wx, z: wz });
      }
    }
  }

  if (def.random) placeRandom(world, free, def.random, hashSeed(seed, def.id ?? 0));

  const bounds = { minX: tx(0), maxX: tx(w - 1), minZ: tz(0), maxZ: tz(h - 1), w, h };
  return { world, gates, start: { x: 0, z: 0 }, bounds };
}

function placeRandom(world, free, opts, seed) {
  const rng = mulberry32(seed);
  const { yellow = 0, purple = 0, minFromStart = 4, spacing = 2 } = opts;
  const candidates = free.filter((c) => Math.max(Math.abs(c.x), Math.abs(c.z)) >= minFromStart);
  shuffle(candidates, rng);
  const placed = [];
  const farEnough = (c) => placed.every((p) => Math.max(Math.abs(p.x - c.x), Math.abs(p.z - c.z)) >= spacing);

  const put = (count, type) => {
    let n = 0;
    while (n < count && candidates.length) {
      const c = candidates.pop();
      if (world.has(c.x, 0, c.z) || !farEnough(c)) continue;
      world.set(c.x, 0, c.z, type);
      placed.push(c);
      n++;
    }
  };
  put(yellow, CELL.YELLOW);
  put(purple, CELL.PURPLE);
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Petit utilitaire pour écrire une carte vide bordée de murs (utilisé par les niveaux). */
export function emptyMap(w, h) {
  const rows = [];
  for (let z = 0; z < h; z++) {
    rows.push(z === 0 || z === h - 1 ? '#'.repeat(w) : '#' + '.'.repeat(w - 2) + '#');
  }
  return rows;
}

/** Remplace des caractères dans une carte : draw(rows, x, z, 'V'). */
export function draw(rows, x, z, ch) {
  if (z < 0 || z >= rows.length || x < 0 || x >= rows[z].length) return;
  rows[z] = rows[z].slice(0, x) + ch + rows[z].slice(x + 1);
}

/** Ligne verticale de murs avec une porte au milieu (ou à `gateZ`). */
export function wallWithGate(rows, x, gateZ = Math.floor(rows.length / 2)) {
  for (let z = 1; z < rows.length - 1; z++) draw(rows, x, z, z === gateZ ? 'P' : '#');
}
