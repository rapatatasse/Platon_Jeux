import { CELL } from './constants.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/**
 * Plus court chemin (en pas, diagonales comprises) du rouge seul jusqu'à une case,
 * en contournant murs blancs et violets. Sert à fixer le budget des tests « nombre de pas ».
 * Retourne null si la case est inaccessible.
 */
export function shortestSteps(world, bounds, from, to, blocking = [CELL.WHITE, CELL.PURPLE]) {
  const k = (x, z) => `${x},${z}`;
  const dist = new Map([[k(from.x, from.z), 0]]);
  const queue = [[from.x, from.z]];
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i];
    const d = dist.get(k(x, z));
    if (x === to.x && z === to.z) return d;
    for (const [dx, dz] of DIRS) {
      const nx = x + dx, nz = z + dz;
      if (nx < bounds.minX || nx > bounds.maxX || nz < bounds.minZ || nz > bounds.maxZ) continue;
      const t = world.get(nx, 0, nz);
      if (blocking.includes(t) || dist.has(k(nx, nz))) continue;
      dist.set(k(nx, nz), d + 1);
      queue.push([nx, nz]);
    }
  }
  return null;
}
