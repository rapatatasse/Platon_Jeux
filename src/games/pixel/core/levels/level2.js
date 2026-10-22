import { solidMap, carve, draw, mirrorZ } from './builder.js';

/** Couloir en L de 5 cases de large : bras horizontal (rouge) puis bras vertical (porte). */
const corridor = (gx, gz, flip = false) => {
  const m = solidMap(22, 20);
  carve(m, 1, 1, 20, 5);
  carve(m, 16, 1, 20, 18);
  draw(m, 2, 3, 'R');
  draw(m, gx, gz, 'P');
  return flip ? mirrorZ(m) : m;
};

export default {
  id: 2,
  name: 'Le virage',
  intro: 'Un couloir de 5 cases de large qui tourne. La porte est au bout : adapte ton trajet quand le mur te bloque en utilisant la position de la porte avant et après votre action ou plus pro utilier Scanner (il montre aussi les murs).',
  goal: { type: 'gates', count: 1 },
  bullets: 0,
  purpleMoveEvery: 0,
  map: corridor(18, 17),
  tests: [
    { name: 'Porte ailleurs', map: corridor(20, 10) },
    { name: 'Couloir dans l\'autre sens', map: corridor(18, 17, true) },
    { name: 'Nombre de pas minimal', map: corridor(18, 15), budget: 1.4 },
  ],
};
