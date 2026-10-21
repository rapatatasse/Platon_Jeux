import { emptyMap, draw } from './builder.js';

/**
 * Niveau scanner : 8 cubes jaunes posés en « chaîne ». Chaque jaune ramassé (empilé sur le rouge)
 * augmente la portée du scanner de 1, ce qui révèle le suivant. Le jaune k+1 est exactement à la portée
 * du jaune k et tous les autres sont hors portée : aucun ordre de ramassage ambigu (voir tests/pixelLevels.test.js).
 * Positions relatives au départ (centre d'une carte de 17 x 17).
 */
const CHAIN = [[0, -1], [2, -1], [3, -4], [7, -4], [6, 1], [0, 5], [-7, 3], [-7, -5]];
const CENTER = 8;

const level = (chain, walls = []) => {
  const m = emptyMap(17, 17);
  draw(m, CENTER, CENTER, 'R');
  for (const [x, z] of chain) draw(m, CENTER + x, CENTER + z, 'J');
  for (const [x, z] of walls) draw(m, CENTER + x, CENTER + z, '#');
  return m;
};

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export default {
  id: 4,
  name: 'Le scanner',
  intro: 'Lis la variable Scanner : elle liste les violets et les jaunes proches. Ramasse 8 cubes jaunes ; chaque jaune au-dessus de toi augmente la portée de 1.',
  goal: { type: 'collect', count: 8 },
  bullets: 0,
  purpleMoveEvery: 0,
  map: level(CHAIN),
  tests: [
    { name: 'Jaunes ailleurs', map: level(CHAIN.map(([x, z]) => [-z, x])) },
    {
      name: 'Murs entre le rouge et les jaunes',
      map: level(CHAIN, [
        ...range(-3, 1).map((z) => [1, z]),
        ...range(-5, -1).map((x) => [x, 3]),
        ...range(-3, 3).map((z) => [5, z]),
      ]),
    },
  ],
};
