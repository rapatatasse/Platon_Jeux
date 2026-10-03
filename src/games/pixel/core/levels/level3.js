import { emptyMap } from './builder.js';

/**
 * Niveau 3 : le tir. run([0, 0, [x, y, z]]) tire une balle qui détruit le premier
 * pixel rencontré. Chaque violet détruit rend une balle.
 */
export default {
  id: 3,
  name: 'Tir',
  intro: 'Tire avec run([0, 0, [1, 0, 0]]) et détruis 5 violets à la balle. Tu commences avec 5 balles.',
  goal: { type: 'shoot', count: 5 },
  bullets: 5,
  purpleMoveEvery: 0,
  map: emptyMap(25, 25),
  random: { yellow: 8, purple: 14, minFromStart: 5, spacing: 3 },
};
