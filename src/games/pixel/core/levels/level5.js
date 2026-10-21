import { emptyMap, draw, carve } from './builder.js';

/** Une ligne de violets barre toute la salle (x = 8). Une seule balle : il faut ouvrir une brèche. */
const room = (rx, rz, gx, gz) => {
  const m = emptyMap(17, 9);
  carve(m, 8, 1, 8, 7, 'V');
  draw(m, rx, rz, 'R');
  draw(m, gx, gz, 'P');
  return m;
};

export default {
  id: 5,
  name: 'Le barrage',
  intro: 'Une ligne de violets te barre la route et le rouge ne doit jamais en toucher un. Tu as 1 balle : ouvre une brèche avec fire(x, y, z) puis rejoins la porte.',
  goal: { type: 'gates', count: 1 },
  bullets: 1,
  purpleMoveEvery: 0,
  map: room(2, 4, 14, 4),
  tests: [
    { name: 'Rouge en bas à gauche, porte en haut à droite', map: room(2, 7, 14, 1) },
  ],
};
