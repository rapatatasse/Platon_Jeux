import { CELL } from './constants.js';

/**
 * Scanner du pixel rouge (logique pure, sans rendu).
 * Portée = 1 case + 1 par cube jaune empilé directement au-dessus du rouge (colonne continue).
 * La zone scannée est le carré de côté 2 × portée + 1 centré sur le rouge.
 */
export function scanRange(player) {
  let r = 1;
  while (player.hasLocal(0, r, 0)) r++;
  return r;
}

const NAMES = [[CELL.PURPLE, 'violet'], [CELL.YELLOW, 'jaune']];

/**
 * Retourne [{ type: 'violet' | 'jaune', coordinates: [[dx, dz], ...] }, ...]
 * Coordonnées relatives au rouge (dx : droite +, dz : bas de l'écran +). Les types absents sont omis.
 */
export function scan(game) {
  const { player, world } = game;
  const range = scanRange(player);
  return NAMES.map(([type, name]) => {
    const seen = new Set();
    const coordinates = [];
    for (const c of world.cellsNear(player.x, player.z, range, type)) {
      const dx = c.x - player.x, dz = c.z - player.z;
      const k = `${dx},${dz}`;
      if (seen.has(k)) continue;
      seen.add(k);
      coordinates.push([dx, dz]);
    }
    coordinates.sort((a, b) => Math.max(Math.abs(a[0]), Math.abs(a[1])) - Math.max(Math.abs(b[0]), Math.abs(b[1])) || a[0] - b[0] || a[1] - b[1]);
    return { type: name, coordinates };
  }).filter((e) => e.coordinates.length);
}
