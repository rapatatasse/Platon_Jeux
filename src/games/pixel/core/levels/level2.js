import { emptyMap } from './builder.js';

/**
 * Niveau 2 : le sandwich. Un violet coincé entre deux cubes du joueur
 * (gauche/droite ou devant/derrière) est détruit et rapporte une balle.
 * Attention : le rouge qui touche un violet = perdu ; un jaune qui le percute de face est détruit.
 */
export default {
  id: 2,
  name: 'Sandwich',
  intro: 'Détruis 5 violets en les coinçant entre deux de tes cubes jaunes. Le rouge ne doit jamais les toucher !',
  goal: { type: 'sandwich', count: 5 },
  bullets: 0,
  purpleMoveEvery: 0,
  map: emptyMap(30, 30),
  random: { yellow: 25, purple: 12, minFromStart: 4, spacing: 3 },
};
