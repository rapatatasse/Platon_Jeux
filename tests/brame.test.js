import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/games/brame/core/rules.js';
import { aiStep } from '../src/games/brame/core/ai.js';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

function position({ saved, reserve = [0, 0], cells = {} }) {
  const g = new Game({ rng: seeded(1) });
  g.saved = saved; g.reserve = reserve; g.cells = cells;
  return g;
}

test("fin de partie anticipée : l'écart ne peut plus être comblé", () => {
  const g = position({ saved: [3, 0], cells: { c0r5: { owner: 1, count: 2 }, c1r2: { owner: 0, count: 4 } } });
  let over = null;
  g.on('over', (e) => { over = e; });
  assert.equal(g._checkOver(), true);
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, 0);
  assert.equal(over.decided, true);
});

test('fin anticipée : vaut aussi pour le second joueur, en comptant les pions de la réserve', () => {
  const g = position({ saved: [0, 4], reserve: [1, 0], cells: { c0r5: { owner: 0, count: 2 } } });
  assert.equal(g._checkOver(), true);
  assert.equal(g.winner, 1);
});

test("pas de fin anticipée tant que l'adversaire peut au moins égaliser", () => {
  const g = position({ saved: [3, 0], cells: { c0r5: { owner: 1, count: 3 }, c1r2: { owner: 0, count: 4 } } });
  assert.equal(g._checkOver(), false);
  assert.notEqual(g.phase, 'over');
  const h = position({ saved: [2, 2], reserve: [3, 3] });
  assert.equal(h._checkOver(), false);
});

test("fin de partie classique inchangée : plus de pions = victoire aux points, égalité possible", () => {
  const g = position({ saved: [2, 2], cells: { c0r5: { owner: 0, count: 1 } } });
  assert.equal(g._checkOver(), true);
  assert.equal(g.winner, null);
});

test('la fin anticipée est détectée en cours de partie (sortie d\'un pion)', () => {
  const g = new Game({ rng: seeded(2) });
  g.saved = [2, 0]; g.reserve = [0, 0];
  g.cells = { c0r1: { owner: 0, count: 1 }, c1r5: { owner: 1, count: 2 } };
  g.dice = [{ v: 2, used: false }, { v: 5, used: true }, { v: 5, used: true }];
  g.moveLimit = 1; g.phase = 'move';
  assert.equal(g.move('c0r1', 'exit', [0]), true);
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, 0);
});

test("l'ordinateur monte vers le camp adverse et les parties se terminent vite (parties jouées d'avance incluses)", () => {
  const realRandom = Math.random;
  Math.random = seeded(7);
  try {
    let decided = 0, steps = 0, attacks = 0;
    const N = 12;
    for (let k = 0; k < N; k++) {
      const g = new Game({ rng: seeded(k + 3) });
      g.on('over', (e) => { if (e.decided) decided++; });
      g.on('attackRound', () => attacks++);
      let n = 0;
      while (!g.over && n < 3000) { aiStep(g); n++; }
      assert.ok(g.over, `partie ${k} terminée`);
      steps += n;
    }
    assert.ok(decided >= 1, 'au moins une partie décidée d\'avance');
    assert.ok(steps / N < 700, `durée moyenne : ${steps / N} actions`);
    assert.ok(attacks / N >= 6, `attaques par partie : ${attacks / N}`);
  } finally { Math.random = realRandom; }
});

import { leakCount } from '../src/games/brame/core/ai.js';

const board = (red, black, { turn = 1 } = {}) => {
  const g = new Game({ rng: seeded(5) });
  g.reserve = [0, 0];
  g.cells = {};
  red.forEach((id) => { g.cells[id] = { owner: 1, count: 1 }; });
  black.forEach((id) => { g.cells[id] = { owner: 0, count: 1 }; });
  g.current = turn;
  return g;
};

test('fuites : trois pions sur une même rangée de couloirs verrouillent le camp', () => {
  const g = board(['c0r3', 'c1r3', 'c2r3'], ['c1r6']);
  assert.equal(leakCount(g, 1), 0);
});

test('fuites : une voie libre reste ouverte, y compris par les passages en diagonale', () => {
  assert.ok(leakCount(board(['c0r3', 'c1r3'], ['c1r6']), 1) > 0);
  // le pion noir déjà sur c2r3 passe par la diagonale c2r3 → c1r2 malgré les deux postes
  assert.ok(leakCount(board(['c0r3', 'c1r3'], ['c2r3']), 1) > 0);
});

test('fuites : un pion adverse tenu à distance par un poste ne compte pas', () => {
  const g = board(['c0r3', 'c1r3', 'c2r3'], ['c0r4', 'c1r4', 'c2r4']);
  assert.equal(leakCount(g, 1), 0);
});

test("l'ordinateur ferme le passage resté libre quand il le peut", () => {
  const realRandom = Math.random;
  Math.random = seeded(11);
  try {
    // Rouge tient deux couloirs ; son pion sur c2r5 peut fermer le troisième avec un 2.
    const g = board(['c0r3', 'c1r3', 'c2r5'], ['c2r8', 'c1r8', 'c0r8']);
    g.dice = [{ v: 2, used: false }, { v: 1, used: true }, { v: 1, used: true }];
    g.moveLimit = 1;
    g.phase = 'move';
    assert.ok(leakCount(g, 1) > 0, 'une fuite au départ');
    aiStep(g);
    assert.equal(leakCount(g, 1), 0, 'le passage est fermé');
  } finally { Math.random = realRandom; }
});

test("camp verrouillé : l'ordinateur file vers la sortie et sauve un pion dès qu'il le peut", () => {
  const realRandom = Math.random;
  Math.random = seeded(21);
  try {
    // Rouge (en retard 3 - 5) tient tous les couloirs ; le dernier pion noir est bloqué. Un pion rouge est à 1 pas de la sortie.
    const g = board(['c0r0', 'c1r1', 'c2r1', 'c2r3', 'c0r10', 'c1r7', 'c2r7'], ['c2r5']);
    g.saved = [5, 3];
    g.dice = [{ v: 1, used: false }, { v: 1, used: true }, { v: 1, used: true }];
    g.moveLimit = 1;
    g.phase = 'move';
    assert.equal(leakCount(g, 1), 0, 'camp verrouillé');
    aiStep(g);
    assert.equal(g.saved[1], 4, 'un pion est sauvé');
  } finally { Math.random = realRandom; }
});

test("fin de partie défavorable : l'ordinateur n'élimine pas le dernier pion adverse s'il perdrait", () => {
  const realRandom = Math.random;
  Math.random = seeded(4);
  try {
    // Rouge est en retard (3 - 5) ; attaquer le dernier pion noir (à égalité) finirait la partie perdue.
    const g = board(['c1r4', 'c0r1', 'c2r1', 'c1r1'], ['c1r5']);
    g.cells.c1r4.count = 4;
    g.saved = [5, 3];
    g.phase = 'idle';
    aiStep(g);
    assert.notEqual(g.phase, 'attackSelect');
    assert.notEqual(g.phase, 'attack');
  } finally { Math.random = realRandom; }
});

test("l'ordinateur sauve en moyenne plus de pions quand son camp est verrouillé (parties complètes)", () => {
  const realRandom = Math.random;
  Math.random = seeded(9);
  try {
    let saved = 0;
    const N = 12;
    for (let k = 0; k < N; k++) {
      const g = new Game({ rng: seeded(k + 40) });
      let n = 0;
      while (!g.over && n < 3000) { aiStep(g); n++; }
      assert.ok(g.over);
      saved += g.saved[0] + g.saved[1];
    }
    assert.ok(saved / N >= 4, `pions sauvés par partie : ${saved / N}`);
  } finally { Math.random = realRandom; }
});
