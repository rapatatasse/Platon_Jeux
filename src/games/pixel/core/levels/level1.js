import { emptyMap, draw } from './builder.js';

/**
 * Format d'un niveau :
 *   id, name, intro   : affichage
 *   goal              : { type: 'collect' | 'gates' | 'purples' | 'shape' | ..., count }  (shape : + pattern)
 *   bullets           : balles au début du niveau (valeur exacte)
 *   offsets           : cubes jaunes déjà fixés au rouge au départ (offsets locaux)
 *   purpleMoveEvery   : les violets avancent tous les N ticks (0 = statiques) ; purpleMode: 'bounce' = va-et-vient
 *   map               : carte ASCII (voir builder.js) — bordée de murs blancs
 *   tests             : variantes du mode test. Chaque entrée remplace des champs du niveau
 *                       (map, bullets, offsets, goal...) ; `budget` = nb de pas max, en multiple du chemin le plus court.
 *                       Le test 0 (niveau de base) est ajouté automatiquement.
 */

/** Carte ouverte 13 x 11, rouge en (rx, rz), porte en (gx, gz). */
const field = (rx, rz, gx, gz) => {
  const m = emptyMap(13, 11);
  draw(m, rx, rz, 'R');
  draw(m, gx, gz, 'P');
  return m;
};

export default {
  id: 1,
  name: 'Éveil',
  intro: 'Rejoins la porte bleue. Lis la variable Gates (position de la porte relative à toi) et avance avec move(x, z). Les diagonales comptent pour un pas.',
  goal: { type: 'gates', count: 1 },
  bullets: 0,
  purpleMoveEvery: 0,
  map: field(2, 8, 10, 2),
  tests: [
    { name: 'Porte ailleurs', map: field(9, 8, 2, 2) },
    { name: 'Nombre de pas minimal', map: field(3, 9, 9, 2), budget: 1 },
  ],
};
