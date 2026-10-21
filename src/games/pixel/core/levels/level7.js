import { emptyMap, draw } from './builder.js';

const stack = (n) => Array.from({ length: n }, (_, i) => ({ x: 0, y: i + 1, z: 0 }));

/** Croix posée au sol : le rouge au centre, deux cubes dans chacune des 4 directions. */
export const CROSS = [
  { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 }, { x: -2, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 2 },
  { x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: -2 },
];

const map = emptyMap(11, 11);
draw(map, 5, 5, 'R');

export default {
  id: 7,
  name: 'La croix',
  intro: 'Tu démarres avec 8 cubes jaunes empilés sur toi. Lis CubesOffsets et utilise moveYellow pour les ranger en croix à plat autour du rouge (2 cubes dans chaque direction).',
  goal: { type: 'shape', count: 1, pattern: CROSS },
  bullets: 0,
  purpleMoveEvery: 0,
  offsets: stack(8),
  map,
  tests: [],
};
