import { solidMap, carve, draw, transpose } from './builder.js';

/** Labyrinthe en serpent : un seul couloir d'une case, la porte est au bout. */
const snake = (gx, gz, turn = false) => {
  const m = solidMap(13, 11);
  for (const z of [1, 3, 5, 7, 9]) carve(m, 1, z, 11, z);
  carve(m, 11, 2, 11, 2);
  carve(m, 1, 4, 1, 4);
  carve(m, 11, 6, 11, 6);
  carve(m, 1, 8, 1, 8);
  draw(m, 1, 1, 'R');
  draw(m, gx, gz, 'P');
  return turn ? transpose(m) : m;
};

export default {
  id: 3,
  name: 'Le serpent',
  intro: 'Un seul couloir en serpent. Si ton pixel n\'avance plus, change de direction : écris une fonction async avec await move(...) et compare Gates avant/après.',
  goal: { type: 'gates', count: 1 },
  bullets: 0,
  purpleMoveEvery: 0,
  map: snake(11, 9),
  tests: [
    { name: 'Porte ailleurs', map: snake(1, 7) },
    { name: 'Labyrinthe dans l\'autre sens', map: snake(11, 9, true) },
    { name: 'Nombre de pas minimal', map: snake(11, 9), budget: 1.6 },
  ],
};
