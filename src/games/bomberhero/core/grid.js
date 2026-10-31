export const FLOOR = 'floor';
export const WALL = 'wall';
export const BLOCK = 'block';
export const CHEST = 'chest';
export const VOID = 'void';

export const DIRS = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];

/**
 * Cartes disponibles. `solid(x, y, W, H)` : murs indestructibles en plus des remparts et des piliers ;
 * `open` : cases toujours libres (portes) ; `axis` : départs au milieu des 4 côtés (sinon dans les 4 coins).
 * Toutes sont symétriques (miroirs horizontal et vertical) : même chance pour chaque joueur.
 */
export const LAYOUTS = {
  classique: { name: 'Classique', solid: () => false },
  croix: {
    name: 'Croix', axis: true,
    solid: (x, y, W, H) => Math.abs(x - (W - 1) / 2) > 2 && Math.abs(y - (H - 1) / 2) > 2,
  },
  anneau: {
    name: 'Anneau',
    solid: (x, y, W, H) => {
      const cx = (W - 1) / 2, cy = (H - 1) / 2;
      return Math.abs(x - cx) <= Math.floor(cx / 2) && Math.abs(y - cy) <= Math.floor(cy / 3);
    },
  },
  salles: {
    name: 'Salles',
    solid: (x, y, W, H) => {
      const a = Math.abs(x - (W - 1) / 2), b = Math.abs(y - (H - 1) / 2);
      if (a === 0) return b !== 3;
      if (b === 0) return a !== 3;
      return false;
    },
    open: (x, y, W, H) => {
      const a = Math.abs(x - (W - 1) / 2), b = Math.abs(y - (H - 1) / 2);
      return (a === 0 && b === 3) || (b === 0 && a === 3);
    },
  },
  losange: {
    name: 'Losange', axis: true,
    solid: (x, y, W, H) => {
      const cx = (W - 1) / 2, cy = (H - 1) / 2;
      return Math.abs(x - cx) / cx + Math.abs(y - cy) / cy > 1.06;
    },
  },
};
export const LAYOUT_IDS = Object.keys(LAYOUTS);

/** Cases de départ des joueurs. 2 joueurs : positions opposées. */
export function spawnPoints(width, height, layout = 'classique') {
  const cx = (width - 1) / 2, cy = (height - 1) / 2;
  if (LAYOUTS[layout]?.axis) {
    return [
      { x: cx, y: 1, dx: 0, dy: 1 },
      { x: cx, y: height - 2, dx: 0, dy: -1 },
      { x: 1, y: cy, dx: 1, dy: 0 },
      { x: width - 2, y: cy, dx: -1, dy: 0 },
    ];
  }
  return [
    { x: 1, y: 1, dx: 1, dy: 0 },
    { x: width - 2, y: height - 2, dx: -1, dy: 0 },
    { x: width - 2, y: 1, dx: -1, dy: 0 },
    { x: 1, y: height - 2, dx: 1, dy: 0 },
  ];
}

/** Cases dégagées autour des départs (forme en L dans un coin, croix sur un côté). */
function safeCells(width, height, layout) {
  const cx = (width - 1) / 2, cy = (height - 1) / 2, safe = new Set();
  const inside = (x, y) => x > 0 && y > 0 && x < width - 1 && y < height - 1;
  for (const p of spawnPoints(width, height, layout)) {
    const around = LAYOUTS[layout]?.axis
      ? [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]
      : [[0, 0], [p.x < cx ? 1 : -1, 0], [0, p.y < cy ? 1 : -1]];
    around.forEach(([dx, dy]) => inside(p.x + dx, p.y + dy) && safe.add(`${p.x + dx},${p.y + dy}`));
  }
  return safe;
}

/** Structure fixe d'une carte (remparts, piliers, murs de la forme) sans blocs ni coffres : sert à l'aperçu du menu. */
export function layoutStructure(width, height, layoutId = 'classique') {
  const layout = LAYOUTS[layoutId] ?? LAYOUTS.classique;
  const safe = safeCells(width, height, layoutId);
  const cells = new Array(width * height).fill(FLOOR);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
    const forced = safe.has(`${x},${y}`) || layout.open?.(x, y, width, height);
    if (border || (!forced && (layout.solid(x, y, width, height) || (x % 2 === 0 && y % 2 === 0)))) cells[y * width + x] = WALL;
  }
  return cells;
}

const shuffle = (arr, rng) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Arène symétrique (4 quarts identiques par miroir) : même chance pour tous les joueurs.
 * Structure selon la carte (`layout`), puis blocs destructibles au hasard et coffres.
 * Retourne un tableau plat `cells[y * width + x]`.
 */
export function generateMap({ width, height, blockDensity, chestsPerQuarter }, rng = Math.random, layout = 'classique') {
  const cells = layoutStructure(width, height, layout);
  const safe = safeCells(width, height, layout);
  const set = (x, y, t) => {
    for (const [mx, my] of [[x, y], [width - 1 - x, y], [x, height - 1 - y], [width - 1 - x, height - 1 - y]]) cells[my * width + mx] = t;
  };
  const midX = (width - 1) / 2, midY = (height - 1) / 2;
  const candidates = [];
  for (let y = 1; y <= midY; y++) {
    for (let x = 1; x <= midX; x++) {
      if (cells[y * width + x] !== FLOOR || safe.has(`${x},${y}`)) continue;
      if (rng() < blockDensity) { set(x, y, BLOCK); candidates.push([x, y]); }
    }
  }
  shuffle(candidates.filter(([x, y]) => x < midX && y < midY), rng).slice(0, chestsPerQuarter).forEach(([x, y]) => set(x, y, CHEST));
  return cells;
}

/** Ordre de fermeture des remparts (spirale du bord vers le centre). */
export function spiralOrder(width, height) {
  const order = [];
  let x0 = 1, y0 = 1, x1 = width - 2, y1 = height - 2;
  while (x0 <= x1 && y0 <= y1) {
    for (let x = x0; x <= x1; x++) order.push([x, y0]);
    for (let y = y0 + 1; y <= y1; y++) order.push([x1, y]);
    if (y1 > y0) for (let x = x1 - 1; x >= x0; x--) order.push([x, y1]);
    if (x1 > x0) for (let y = y1 - 1; y > y0; y--) order.push([x0, y]);
    x0++; y0++; x1--; y1--;
  }
  return order;
}
