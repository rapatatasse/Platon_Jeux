import { emptyMap, draw } from './builder.js';

/** Salle 13 x 6 : des violets font des allers-retours sur leur ligne, le rouge reste en haut et tire vers le bas de l'écran (fire(0, 0, 1)). */
const arena = (purples) => {
  const m = emptyMap(15, 8);
  draw(m, 7, 1, 'R');
  for (const [x, z] of purples) draw(m, x, z, 'V');
  return m;
};

const stack = (n) => Array.from({ length: n }, (_, i) => ({ x: 0, y: i + 1, z: 0 }));

export default {
  id: 9,
  name: 'Tir en mouvement',
  intro: 'Les violets défilent de droite à gauche et rebondissent sur les murs, ils bougent avant ton prochain tir. Utilise Scanner (6 jaunes te donnent une portée de 7) et anticipe : 10 balles, 3 violets.',
  goal: { type: 'purples', count: 3 },
  bullets: 10,
  purpleMoveEvery: 1,
  purpleMode: 'bounce',
  offsets: stack(6),
  map: arena([[12, 6], [9, 5], [5, 4]]),
  tests: [
    { name: '2 violets et 2 balles', map: arena([[12, 6], [5, 4]]), bullets: 2, goal: { type: 'purples', count: 2 } },
  ],
};
