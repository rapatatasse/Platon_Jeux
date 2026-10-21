import { emptyMap, draw } from './builder.js';

/** Arène 3 x 3 : le violet est écrasé par un cube jaune qui tombe d'un cran. */
const arena = (rx, rz, vx, vz) => {
  const m = emptyMap(5, 5);
  draw(m, rx, rz, 'R');
  draw(m, vx, vz, 'V');
  return m;
};

export default {
  id: 8,
  name: 'L\'écrasement',
  intro: 'Détruis le violet par écrasement : un cube jaune qui le percute est détruit, et si un autre cube jaune est juste au-dessus, il retombe et l\'écrase. Tu as 2 jaunes sur toi.',
  goal: { type: 'purples', count: 1 },
  bullets: 0,
  purpleMoveEvery: 0,
  offsets: [{ x: 0, y: 1, z: 0 }, { x: 0, y: 2, z: 0 }],
  map: arena(1, 2, 3, 2),
  tests: [
    { name: 'Violet à gauche', map: arena(3, 2, 1, 2) },
    { name: 'Violet en haut à droite', map: arena(1, 3, 3, 1) },
  ],
};
