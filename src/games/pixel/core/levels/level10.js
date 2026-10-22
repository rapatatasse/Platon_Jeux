import { solidMap, carve, draw } from './builder.js';

/**
 * Croix de 4 branches autour d'une salle centrale (cubes jaunes et violets placés au hasard, graine fixe) :
 *   nord  : porte murée par des violets (à abattre au tir)
 *   est   : couloir en baïonnette avec des violets qui rebondissent
 *   sud   : slalom de violets (le scanner indique le passage)
 *   ouest : porte derrière deux colonnes de tours violettes
 */
const C = 22;
const SIZE = 45;

function cross() {
  const m = solidMap(SIZE, SIZE);
  carve(m, C - 5, C - 5, C + 5, C + 5, ',');
  carve(m, C - 1, C - 5, C + 1, C + 5, '.');
  carve(m, C - 5, C - 1, C + 5, C + 1, '.');
  draw(m, C, C, 'R');

  // Nord : couloir de 3 de large, porte en (C, 2), deux rangées de violets devant.
  carve(m, C - 1, 3, C + 1, C - 6, '.');
  draw(m, C, 2, 'P');
  carve(m, C - 1, 5, C + 1, 6, 'V');

  // Ouest : couloir de 3 de large, porte en (2, C), deux colonnes de tours de 3 cubes.
  carve(m, 3, C - 1, C - 6, C + 1, '.');
  draw(m, 2, C, 'P');
  carve(m, 8, C - 1, 9, C + 1, '3');

  // Sud : slalom (une case libre par rangée de violets, en alternance), porte en (C, 42).
  carve(m, C - 1, C + 6, C + 1, 41, '.');
  draw(m, C, 42, 'P');
  for (const [i, z] of [30, 32, 34, 36, 38].entries()) {
    carve(m, C - 1, z, C + 1, z, 'V');
    draw(m, i % 2 ? C - 1 : C + 1, z, '.');
  }
  draw(m, C, 31, 'J');
  draw(m, C, 35, 'J');

  // Est : couloir z = C-1 jusqu'à x = C+14, puis descente et allée de rebond fermée à gauche.
  carve(m, C + 6, C - 1, C + 14, C - 1, '.');
  carve(m, C + 14, C, C + 14, C + 1, '.');
  carve(m, C + 14, C + 1, C + 20, C + 1, '.');
  draw(m, C + 17, C + 1, 'B');
  draw(m, C + 19, C + 1, 'b');
  draw(m, C + 21, C + 1, 'P');
  return m;
}

export default {
  id: 10,
  name: 'La croix',
  intro: 'Quatre portes, quatre difficultés : nord murée de violets, est gardée par des violets qui rebondissent, sud en slalom, ouest derrière des tours. Les cubes de la salle centrale changent selon le test. Traverse les 4 portes.',
  goal: { type: 'gates', count: 4 },
  bullets: 12,
  purpleMoveEvery: 2,
  purpleMode: 'bounce',
  onlyMarked: true,
  fixedSeed: 1,
  random: { inZone: true, yellow: 6, purple: 8, minFromStart: 2, spacing: 2 },
  map: cross(),
  tests: [
    { name: 'Autre tirage (graine 2)', fixedSeed: 2 },
    { name: 'Autre tirage (graine 3)', fixedSeed: 3 },
  ],
};
