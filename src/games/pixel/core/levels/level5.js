import { emptyMap, wallWithGate, draw } from './builder.js';

/** Niveau 5 : deux portes décalées, quelques violets qui gardent le passage. */
const map = emptyMap(41, 21);
wallWithGate(map, 13, 5);
wallWithGate(map, 27, 15);
draw(map, 5, 10, 'R');
draw(map, 16, 5, 'V');        // gardien derrière la première porte, décalé
draw(map, 24, 15, 'V');
draw(map, 20, 10, 'J');
draw(map, 34, 10, 'J');

export default {
  id: 5,
  name: 'Deux portes',
  intro: 'Deux portes à traverser. Écris une fonction pour te faufiler : par exemple avancer(n) et empiler().',
  goal: { type: 'gates', count: 2 },
  bullets: 2,
  purpleMoveEvery: 0,
  map,
  random: { yellow: 8, purple: 4, minFromStart: 3, spacing: 3 },
};
