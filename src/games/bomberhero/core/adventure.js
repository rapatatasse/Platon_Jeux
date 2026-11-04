import { FLOOR, WALL, BLOCK, CHEST } from './grid.js';
import { BomberGame } from './BomberGame.js';

/**
 * Mode Aventure : la tour. Chaque étage est un parcours (salles et couloirs) à franchir jusqu'à la porte
 * qui mène à l'étage suivant, en affrontant des gardiens (robots) et en récupérant des sorts dans les coffres.
 *
 * Description d'un étage :
 *   width, height  taille de la carte (nombre impair conseillé)
 *   time           temps limite en secondes (0 = aucun)
 *   carve          rectangles [x0, y0, x1, y1] de sol (salles, couloirs) ; tout le reste est mur
 *   walls          rectangles de murs ajoutés dans les salles
 *   pillars        rectangles où les cases paires/paires deviennent des piliers
 *   fill           rectangles [x0, y0, x1, y1, densité] semés de pierres cassables (tirage fixe : même carte à chaque partie)
 *   gates          cases fermées par une pierre (portes de salle)
 *   chests         coffres [x, y]
 *   enemies        gardiens [x, y, niveau] : '1' facile, '2' normal, '3' difficile
 *   heroes         départs des joueurs [x, y] (le 2e sert au joueur 2)
 *   door           la porte de sortie [x, y]
 *   aggro          distance (en cases) à laquelle un gardien se réveille
 */
export const LEVELS = [
  {
    name: 'Le vestibule', width: 15, height: 11, time: 0, aggro: 8,
    carve: [[1, 6, 13, 9], [10, 1, 13, 6]],
    pillars: [[1, 6, 13, 9]],
    fill: [[1, 6, 13, 9, 0.4], [10, 1, 13, 6, 0.35]],
    gates: [[11, 4]],
    chests: [[7, 8], [12, 3]],
    enemies: [[11, 2, '1']],
    heroes: [[1, 9], [2, 9]], door: [12, 1],
  },
  {
    name: "L'escalier tournant", width: 17, height: 13, time: 0, aggro: 8,
    carve: [[1, 10, 15, 11], [13, 7, 15, 11], [1, 7, 15, 8], [1, 4, 3, 8], [1, 4, 15, 5], [13, 1, 15, 5], [1, 1, 15, 2]],
    fill: [[1, 10, 15, 11, 0.22], [1, 7, 15, 8, 0.22], [1, 4, 15, 5, 0.22], [1, 1, 15, 2, 0.22]],
    gates: [[14, 9], [2, 6], [14, 3]],
    chests: [[8, 11], [8, 5]],
    enemies: [[9, 8, '1'], [6, 4, '1']],
    heroes: [[1, 11], [2, 11]], door: [2, 1],
  },
  {
    name: 'La salle des gardes', width: 17, height: 13, time: 170, aggro: 8,
    carve: [[1, 8, 5, 11], [9, 7, 15, 11], [9, 1, 15, 5], [1, 1, 6, 5], [5, 10, 9, 10], [12, 5, 12, 7], [6, 3, 9, 3]],
    pillars: [[9, 7, 15, 11], [9, 1, 15, 5]],
    fill: [[9, 7, 15, 11, 0.3], [9, 1, 15, 5, 0.3], [1, 1, 6, 5, 0.25]],
    gates: [[7, 10], [12, 6], [7, 3]],
    chests: [[10, 9], [9, 3], [3, 3]],
    enemies: [[12, 9, '1'], [14, 8, '1'], [12, 3, '2'], [5, 2, '2']],
    heroes: [[1, 11], [2, 11]], door: [2, 1],
  },
  {
    name: 'Les cachots', width: 17, height: 13, time: 0, aggro: 9,
    carve: [[1, 11, 15, 11], [15, 9, 15, 11], [1, 9, 15, 9], [1, 7, 1, 9], [1, 7, 15, 7], [15, 5, 15, 7], [1, 5, 15, 5], [1, 3, 1, 5], [1, 3, 15, 3], [15, 1, 15, 3], [1, 1, 15, 1],
      [6, 8, 10, 8], [6, 4, 10, 4], [6, 2, 10, 2]],
    fill: [[2, 11, 14, 11, 0.18], [2, 9, 14, 9, 0.18], [2, 7, 14, 7, 0.18], [2, 5, 14, 5, 0.18], [2, 3, 14, 3, 0.18], [2, 1, 14, 1, 0.18]],
    gates: [[15, 10], [1, 8], [15, 6], [1, 4], [15, 2]],
    chests: [[8, 8], [8, 4], [8, 2]],
    enemies: [[9, 9, '2'], [5, 7, '2'], [11, 5, '2'], [6, 3, '2']],
    heroes: [[1, 11], [2, 11]], door: [1, 1],
  },
  {
    name: 'La bibliothèque', width: 17, height: 13, time: 150, aggro: 9,
    carve: [[1, 1, 15, 11]],
    walls: [[3, 3, 12, 3], [4, 5, 13, 5], [3, 7, 12, 7], [4, 9, 13, 9]],
    fill: [[1, 1, 15, 11, 0.22]],
    chests: [[14, 10], [2, 6], [14, 4]],
    enemies: [[8, 10, '2'], [12, 6, '2'], [4, 4, '2'], [11, 2, '2']],
    heroes: [[1, 11], [2, 11]], door: [15, 1],
  },
  {
    name: 'Le couloir de feu', width: 17, height: 13, time: 110, aggro: 10,
    carve: [[1, 6, 15, 6], [3, 2, 5, 5], [9, 2, 11, 5], [13, 2, 15, 5], [3, 7, 5, 10], [9, 7, 11, 10], [13, 7, 15, 10]],
    fill: [[3, 2, 5, 5, 0.3], [9, 2, 11, 5, 0.3], [13, 2, 15, 5, 0.3], [3, 7, 5, 10, 0.3], [9, 7, 11, 10, 0.3], [13, 7, 15, 10, 0.3]],
    gates: [[7, 6], [12, 6]],
    chests: [[4, 3], [10, 9], [14, 4]],
    enemies: [[10, 3, '2'], [4, 8, '3'], [14, 8, '3'], [8, 6, '2']],
    heroes: [[1, 6], [2, 6]], door: [15, 6],
  },
  {
    name: 'La salle du trône', width: 17, height: 13, time: 160, aggro: 10,
    carve: [[3, 2, 13, 10], [1, 10, 3, 10], [8, 1, 8, 2]],
    pillars: [[3, 4, 13, 10]],
    fill: [[3, 2, 13, 10, 0.28]],
    chests: [[4, 3], [12, 3], [4, 9], [12, 9]],
    enemies: [[8, 5, '3'], [5, 6, '2'], [11, 6, '2'], [8, 8, '3'], [6, 3, '2']],
    heroes: [[1, 10], [2, 10]], door: [8, 1],
  },
  {
    name: 'Le sommet', width: 17, height: 13, time: 190, aggro: 10,
    carve: [[1, 9, 7, 11], [9, 6, 15, 11], [9, 1, 15, 4], [1, 1, 7, 5], [7, 10, 9, 10], [12, 4, 12, 6], [7, 2, 9, 2]],
    pillars: [[9, 7, 15, 11], [9, 1, 15, 3], [1, 1, 7, 5]],
    fill: [[9, 6, 15, 11, 0.28], [9, 1, 15, 4, 0.28], [1, 1, 7, 5, 0.28]],
    gates: [[8, 10], [12, 5], [8, 2]],
    chests: [[13, 9], [13, 1], [5, 4], [6, 10]],
    enemies: [[11, 8, '3'], [14, 7, '3'], [10, 3, '3'], [14, 3, '2'], [3, 3, '3'], [6, 2, '3']],
    heroes: [[1, 11], [2, 11]], door: [2, 1],
  },
];

const hash = (x, y, k) => {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Construit la carte d'un étage (déterministe). Retourne { width, height, cells, heroes, enemies, door, time, aggro }. */
export function buildLevel(def, index = 0) {
  const { width, height } = def;
  const cells = new Array(width * height).fill(WALL);
  const at = (x, y) => y * width + x;
  const inner = (x, y) => x > 0 && y > 0 && x < width - 1 && y < height - 1;
  const eachIn = (rect, fn) => { for (let y = rect[1]; y <= rect[3]; y++) for (let x = rect[0]; x <= rect[2]; x++) if (inner(x, y)) fn(x, y); };

  def.carve.forEach((r) => eachIn(r, (x, y) => { cells[at(x, y)] = FLOOR; }));
  (def.walls ?? []).forEach((r) => eachIn(r, (x, y) => { cells[at(x, y)] = WALL; }));
  (def.pillars ?? []).forEach((r) => eachIn(r, (x, y) => { if (x % 2 === 0 && y % 2 === 0) cells[at(x, y)] = WALL; }));

  const keep = new Set();
  const protect = (x, y, around = false) => {
    keep.add(`${x},${y}`);
    if (around) [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => keep.add(`${x + dx},${y + dy}`));
  };
  def.heroes.forEach(([x, y]) => { cells[at(x, y)] = FLOOR; protect(x, y, true); });
  def.enemies.forEach(([x, y]) => { cells[at(x, y)] = FLOOR; protect(x, y, true); });
  cells[at(...def.door)] = FLOOR; protect(def.door[0], def.door[1], true);

  (def.fill ?? []).forEach((r) => eachIn(r, (x, y) => {
    if (cells[at(x, y)] === FLOOR && !keep.has(`${x},${y}`) && hash(x, y, index + 1) < r[4]) cells[at(x, y)] = BLOCK;
  }));
  (def.gates ?? []).forEach(([x, y]) => { if (cells[at(x, y)] === FLOOR && !keep.has(`${x},${y}`)) cells[at(x, y)] = BLOCK; });
  (def.chests ?? []).forEach(([x, y]) => { if (cells[at(x, y)] !== WALL && !keep.has(`${x},${y}`)) cells[at(x, y)] = CHEST; });

  return {
    width, height, cells,
    heroes: def.heroes.map(([x, y]) => ({ x, y })),
    enemies: def.enemies.map(([x, y, level]) => ({ x, y, level })),
    door: { x: def.door[0], y: def.door[1] },
    time: def.time ?? 0,
    aggro: def.aggro ?? 8,
  };
}

/**
 * Une partie en mode Aventure : étage en cours, vies partagées, améliorations conservées d'un étage à l'autre.
 * Quand un joueur franchit la porte, tous les joueurs (même tombés) reviennent à la vie à l'étage suivant.
 */
export class AdventureRun {
  constructor({ heroCount = 1, startLevel = 0, lives = 3, levels = LEVELS } = {}) {
    this.heroCount = heroCount;
    this.levels = levels;
    this.index = Math.min(startLevel, levels.length - 1);
    this.lives = lives;
    this.carry = null;
  }

  get level() { return this.levels[this.index]; }
  get total() { return this.levels.length; }

  createGame(config, rng = Math.random) {
    return new BomberGame({
      config: { ...config, suddenDeathAt: 0 },
      level: { ...buildLevel(this.level, this.index), name: this.level.name },
      heroCount: this.heroCount,
      carry: this.carry,
    
      rng,
    });
  }

  /** Étage franchi : on garde les améliorations de chacun. Retourne 'next' ou 'victory'. */
  win(game) {
    this.carry = game.heroStats();
    this.index++;
    return this.index >= this.levels.length ? 'victory' : 'next';
  }

  /** Étage raté (tous les héros à terre ou temps écoulé). Retourne 'retry' ou 'gameover'. */
  lose() {
    this.lives--;
    return this.lives > 0 ? 'retry' : 'gameover';
  }
}
