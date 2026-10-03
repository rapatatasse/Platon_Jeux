import { emptyMap, wallWithGate, draw } from './builder.js';

/**
 * Niveau 4 : une porte. Un mur coupe la carte, il faut passer par l'ouverture (case bleue)
 * avec le pixel rouge. L'ouverture fait 1 case de large : les cubes jaunes sur les côtés
 * bloquent ! Il faut les réorganiser avec moveyellow (les empiler en hauteur, ou les aligner
 * devant/derrière le rouge).
 */
const map = emptyMap(31, 19);
wallWithGate(map, 16, 9);
draw(map, 6, 9, 'R');        // départ à gauche du mur
draw(map, 24, 5, 'J');
draw(map, 24, 13, 'J');
draw(map, 26, 9, 'V');

export default {
  id: 4,
  name: 'La porte',
  intro: 'Traverse la porte (case bleue) avec le rouge. Astuce : run([0, 0, null, [0, [0, 1, 0]]]) empile le cube 0 au-dessus de toi.',
  goal: { type: 'gates', count: 1 },
  bullets: 0,
  purpleMoveEvery: 0,
  map,
  random: { yellow: 6, purple: 2, minFromStart: 3, spacing: 3 },
};
