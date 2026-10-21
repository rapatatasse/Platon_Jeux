import { emptyMap, draw, wallWithGate } from './builder.js';

/** Un mur avec une ouverture bouchée par une tour de violets empilés. Tirer sur la base fait tomber le reste. */
const tower = (height) => {
  const m = emptyMap(17, 9);
  wallWithGate(m, 8, 4);
  draw(m, 8, 4, String(height));
  draw(m, 2, 4, 'R');
  draw(m, 14, 4, 'P');
  return m;
};

export default {
  id: 6,
  name: 'La tour',
  intro: 'Une tour de 3 violets bouche le passage. Un tir détruit le cube du bas, les autres retombent : tire 3 fois puis rejoins la porte.',
  goal: { type: 'gates', count: 1 },
  bullets: 3,
  purpleMoveEvery: 0,
  map: tower(3),
  tests: [
    { name: '4 violets et 4 balles', map: tower(4), bullets: 4 },
  ],
};
