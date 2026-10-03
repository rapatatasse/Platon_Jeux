import { emptyMap, wallWithGate, draw } from './builder.js';

/** Niveau 6 : trois portes, des tours violettes et des violets qui se déplacent vers le joueur. */
const map = emptyMap(51, 25);
wallWithGate(map, 12, 6);
wallWithGate(map, 25, 18);
wallWithGate(map, 38, 12);
draw(map, 5, 12, 'R');
draw(map, 15, 6, 'T');        // tours (2 de haut) derrière les portes
draw(map, 28, 18, 'T');
draw(map, 41, 12, 'T');
draw(map, 18, 12, 'J');
draw(map, 31, 12, 'J');
draw(map, 45, 6, 'J');
draw(map, 45, 18, 'J');

export default {
  id: 6,
  name: 'Trois portes',
  intro: 'Trois portes, et les violets bougent ! Tire sur les tours ou évite-les. Bonne chance.',
  goal: { type: 'gates', count: 3 },
  bullets: 3,
  purpleMoveEvery: 4,
  purpleRange: 8,
  map,
  random: { yellow: 10, purple: 6, minFromStart: 4, spacing: 3 },
};
