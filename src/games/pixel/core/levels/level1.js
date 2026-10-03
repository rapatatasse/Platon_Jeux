import { emptyMap } from './builder.js';

/**
 * Niveau 1 : découverte. Aucun danger, juste des cubes jaunes à ramasser.
 *
 * Format d'un niveau :
 *   id, name, intro   : affichage
 *   goal              : { type: 'collect' | 'sandwich' | 'shoot' | 'gates', count }
 *   bullets           : balles données au début du niveau (le joueur garde les siennes si plus)
 *   purpleMoveEvery   : les violets avancent tous les N ticks (0 = statiques)
 *   map               : carte ASCII (voir builder.js) — bordée de murs blancs
 *   random            : cubes placés au hasard sur les cases vides
 */
export default {
  id: 1,
  name: 'Éveil',
  intro: 'Ramasse 8 cubes jaunes avec run([x, z]). Aucun danger ici : explore !',
  goal: { type: 'collect', count: 8 },
  bullets: 0,
  purpleMoveEvery: 0,
  map: emptyMap(21, 21),
  random: { yellow: 14, purple: 0, minFromStart: 4, spacing: 3 },
};
