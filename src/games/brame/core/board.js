// Plateau de BRAME : graphe pur (aucun DOM, aucun Three.js).
// 3 colonnes (0 gauche, 1 milieu, 2 droite) de 11 cases, rangées 0 (haut) à 10 (bas),
// reliées par 8 passages en diagonale et 2 ronds centraux (cases à part entière).

export const COLS = 3;
export const ROWS = 11;

export const cellId = (col, row) => `c${col}r${row}`;
export const parseCell = (id) => {
  const m = /^c(\d)r(\d+)$/.exec(id);
  return m ? { col: +m[1], row: +m[2] } : null;
};

export const CIRCLES = ['k0', 'k1'];
export const BASE = 'base';
/** Nœuds virtuels hors plateau : le camp d'où entrent les pions, la sortie côté adverse qui les sauve. */
export const RESERVE = 'reserve';
export const EXIT = 'exit';

const PASSAGES = [
  [cellId(0, 0), cellId(1, 1)], [cellId(2, 0), cellId(1, 1)],
  [cellId(0, 3), cellId(1, 2)], [cellId(2, 3), cellId(1, 2)],
  [cellId(0, 7), cellId(1, 8)], [cellId(2, 7), cellId(1, 8)],
  [cellId(0, 10), cellId(1, 9)], [cellId(2, 10), cellId(1, 9)],
  ['k0', cellId(0, 4)], ['k0', cellId(0, 6)], ['k0', cellId(1, 4)], ['k0', cellId(1, 6)],
  ['k1', cellId(2, 4)], ['k1', cellId(2, 6)], ['k1', cellId(1, 4)], ['k1', cellId(1, 6)],
];

export const NODES = [
  ...Array.from({ length: COLS * ROWS }, (_, i) => cellId(Math.floor(i / ROWS), i % ROWS)),
  ...CIRCLES,
];

export const NEIGHBORS = Object.fromEntries(NODES.map((n) => [n, new Set()]));
const link = (a, b) => { NEIGHBORS[a].add(b); NEIGHBORS[b].add(a); };
for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS - 1; r++) link(cellId(c, r), cellId(c, r + 1));
PASSAGES.forEach(([a, b]) => link(a, b));

/** Rangée « de progression » d'un nœud (les ronds comptent comme la rangée 5). */
export const rowOf = (id) => (parseCell(id) ? parseCell(id).row : 5);

/** Joueur 0 (noir) part du bas et vise le haut ; joueur 1 (rouge) part du haut et vise le bas. */
export const startRow = (player) => (player === 0 ? ROWS - 1 : 0);
export const goalRow = (player) => (player === 0 ? 0 : ROWS - 1);
export const dirOf = (player) => (player === 0 ? -1 : 1);

export const startCells = (player) => Array.from({ length: COLS }, (_, c) => cellId(c, startRow(player)));
export const isGoal = (id, player) => parseCell(id)?.row === goalRow(player);

/** Cases voisines vers lesquelles une pyramide du joueur peut avancer (progression strictement croissante). */
export function forwardNeighbors(id, player) {
  if (id === BASE) return startCells(player);
  const d = dirOf(player);
  return [...NEIGHBORS[id]].filter((n) => (rowOf(n) - rowOf(id)) * d > 0);
}

/** Distance (en pas) de chaque nœud à l'arrivée du joueur, en ignorant les obstacles. */
export function distancesToGoal(player) {
  const dist = Object.fromEntries(NODES.map((n) => [n, Infinity]));
  const queue = NODES.filter((n) => isGoal(n, player));
  queue.forEach((n) => { dist[n] = 0; });
  while (queue.length) {
    const n = queue.shift();
    NEIGHBORS[n].forEach((m) => {
      if (dist[m] === Infinity) { dist[m] = dist[n] + 1; queue.push(m); }
    });
  }
  return dist;
}
