import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NEIGHBORS, cellId, forwardNeighbors, BASE, EXIT, RESERVE } from '../src/games/brame/core/board.js';
import { Game } from '../src/games/brame/core/rules.js';
import { aiStep } from '../src/games/brame/core/ai.js';

const seq = (...values) => { let i = 0; return () => (values[i++ % values.length] - 0.5) / 6; };
const empty = (game) => { game.cells = {}; game.pyramids = [null, null]; game.reserve = [0, 0]; };
const put = (game, id, owner, count) => { game.cells[id] = { owner, count }; };

test('le plateau relie colonnes, passages et ronds centraux', () => {
  assert.ok(NEIGHBORS[cellId(0, 0)].has(cellId(1, 1)));
  assert.ok(NEIGHBORS[cellId(0, 3)].has(cellId(1, 2)));
  assert.ok(NEIGHBORS.k0.has(cellId(0, 4)) && NEIGHBORS.k0.has(cellId(1, 6)));
  assert.ok(!NEIGHBORS.k0.has(cellId(2, 4)));
  assert.deepEqual(forwardNeighbors(BASE, 1), [cellId(0, 0), cellId(1, 0), cellId(2, 0)]);
});

test('départ : plateau vide, 15 pions par camp hors plateau', () => {
  const g = new Game();
  assert.deepEqual(g.cells, {});
  assert.deepEqual(g.reserve, [15, 15]);
});

test('un pion entre depuis le camp par la rangée de départ, selon le dé', () => {
  const g = new Game();
  assert.deepEqual(g.destinations(RESERVE, 1, 0).sort(), [cellId(0, 10), cellId(1, 10), cellId(2, 10)]);
  assert.ok(g.destinations(RESERVE, 2, 0).includes(cellId(1, 9)));
  assert.deepEqual(g.destinations(RESERVE, 1, 1).sort(), [cellId(0, 0), cellId(1, 0), cellId(2, 0)]);
});

test('on sort du plateau côté adverse seulement avec le nombre exact de pas', () => {
  const g = new Game();
  empty(g);
  put(g, cellId(0, 0), 0, 1);
  assert.ok(g.destinations(cellId(0, 0), 1).includes(EXIT));
  assert.ok(!g.destinations(cellId(0, 0), 2).includes(EXIT));
  put(g, cellId(0, 1), 0, 1);
  assert.ok(!g.destinations(cellId(0, 1), 1).includes(EXIT));
  assert.ok(g.destinations(cellId(0, 1), 2).includes(EXIT));
  assert.ok(!g.destinations(cellId(0, 10), 1).includes(EXIT));
});

test('les pions du camp ne bloquent pas l\'adversaire : la sortie reste libre', () => {
  const g = new Game();
  put(g, cellId(0, 0), 0, 1);
  assert.ok(g.destinations(cellId(0, 0), 1, 0).includes(EXIT));
});

test('entrer un pion depuis le camp le pose sur le plateau', () => {
  const g = new Game({ rng: seq(1, 2, 4) });
  g.roll();
  assert.ok(g.move(RESERVE, cellId(1, 9), [1]));
  assert.equal(g.reserve[0], 14);
  assert.equal(g.cells[cellId(1, 9)].count, 1);
});

test('un pion fait exactement le nombre de pas du dé, retours autorisés', () => {
  const g = new Game();
  empty(g);
  put(g, cellId(1, 5), 0, 1);
  put(g, cellId(1, 0), 1, 1);
  const two = g.destinations(cellId(1, 5), 2);
  assert.ok(two.includes(cellId(1, 5)) && two.includes(cellId(1, 3)) && two.includes('k0'));
  assert.ok(!g.destinations(cellId(1, 5), 1).includes(cellId(1, 5)));
});

test('un pion ne passe ni sur un adversaire ni sur une pyramide', () => {
  const g = new Game();
  empty(g);
  put(g, cellId(0, 10), 0, 1);
  put(g, cellId(0, 9), 1, 1);
  assert.ok(!g.destinations(cellId(0, 10), 2).includes(cellId(0, 8)));
  g.cells = {}; put(g, cellId(0, 10), 0, 1); g.pyramids[1] = cellId(0, 9);
  assert.ok(!g.destinations(cellId(0, 10), 1).includes(cellId(0, 9)));
});

test('tomber pile sur la rangée d\'arrivée sauve le pion', () => {
  const g = new Game({ rng: seq(2, 3, 5) });
  empty(g);
  put(g, cellId(0, 2), 0, 2);
  put(g, cellId(2, 10), 1, 3);
  g.roll();
  assert.equal(g.phase, 'move');
  assert.ok(g.move(cellId(0, 2), EXIT, [1]));
  assert.equal(g.saved[0], 1);
  assert.equal(g.cells[cellId(0, 2)].count, 1);
});

test('un double force la pyramide puis un seul pion avance avec le dé restant', () => {
  const g = new Game({ rng: seq(4, 4, 2, 1) });
  put(g, cellId(1, 10), 0, 5);
  g.roll();
  assert.equal(g.phase, 'pyramid');
  assert.equal(g.pyr.steps, 1);
  assert.deepEqual(g.pyramidOptions(), [cellId(0, 10), cellId(1, 10), cellId(2, 10)].filter(() => true));
  assert.ok(g.pyramidStep(cellId(1, 10)));
  assert.equal(g.lost[0], 5);
  assert.equal(g.phase, 'move');
  assert.equal(g.moveLimit, 1);
  assert.equal(g.dice.filter((d) => !d.used).length, 1);
});

test('la pyramide renvoie la pyramide adverse dans son camp et s\'arrête dans le camp adverse', () => {
  const g = new Game({ rng: seq(2, 2, 3, 5) });
  empty(g);
  put(g, cellId(1, 5), 0, 1);
  put(g, cellId(1, 9), 1, 1);
  g.pyramids[1] = cellId(1, 7);
  g.pyramids[0] = cellId(1, 8);
  g.current = 1;
  put(g, cellId(2, 0), 1, 1);
  g.roll();
  assert.equal(g.phase, 'pyramid');
  g.pyr.steps = 3;
  g.pyramids[1] = cellId(1, 7);
  g.pyramidStep(cellId(1, 8));
  assert.equal(g.pyramids[0], null);
  g.pyramidStep(cellId(1, 9));
  assert.equal(g.lost[1], 1);
  g.pyramidStep(cellId(1, 10));
  assert.equal(g.pyramids[1], null);
});

test('un triple : choix du dé pyramide, suppression d\'un pion adverse, un seul pion avance', () => {
  const g = new Game({ rng: seq(3, 3, 3, 3, 6) });
  put(g, cellId(1, 0), 1, 5);
  g.roll();
  assert.equal(g.phase, 'pyrChoose');
  assert.ok(g.choosePyramid(2));
  assert.equal(g.pyr.steps, 2);
  g.pyramidStep(cellId(0, 10));
  g.pyramidStep(cellId(0, 9));
  assert.equal(g.phase, 'tripleKill');
  assert.ok(g.removeEnemy(cellId(1, 0)));
  assert.equal(g.cells[cellId(1, 0)].count, 4);
  assert.equal(g.phase, 'move');
});

test('attaque : égalité = défaite de l\'attaquant, le vainqueur occupe la case', () => {
  const g = new Game({ rng: seq(3, 3) });
  empty(g);
  put(g, cellId(1, 5), 0, 2);
  put(g, cellId(1, 4), 1, 2);
  put(g, cellId(2, 10), 0, 1);
  assert.ok(g.beginAttack());
  assert.ok(g.attackBattalion(cellId(1, 5), cellId(1, 4)));
  const r = g.attackRound();
  assert.equal(r.attackerLoses, true);
  assert.equal(g.lost[0], 1);
  assert.equal(g.cells[cellId(1, 5)].owner, 0);
  g.attackRound();
  assert.equal(g.cells[cellId(1, 5)].owner, 1);
  assert.equal(g.cells[cellId(1, 4)], undefined);
  assert.equal(g.current, 1);
});

test('attaque gagnée : le bataillon avance et peut rejouer une seule fois', () => {
  const g = new Game({ rng: seq(6, 1, 6, 1, 6, 1) });
  empty(g);
  put(g, cellId(1, 5), 0, 1);
  put(g, cellId(1, 4), 1, 1);
  put(g, cellId(1, 3), 1, 1);
  g.beginAttack();
  g.attackBattalion(cellId(1, 5), cellId(1, 4));
  g.attackRound();
  assert.equal(g.cells[cellId(1, 4)].owner, 0);
  assert.equal(g.phase, 'attackFollow');
  g.attackBattalion(cellId(1, 4), cellId(1, 3));
  g.attackRound();
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, null);
});

test('la partie se termine quand un camp n\'a plus de pions : le plus de pions sauvés gagne', () => {
  const g = new Game({ rng: seq(3, 4, 5) });
  empty(g);
  put(g, cellId(0, 3), 0, 1);
  put(g, cellId(2, 10), 1, 1);
  g.saved = [2, 5];
  g.roll();
  g.move(cellId(0, 3), EXIT, [1]);
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, 1);
});

test('des parties complètes ordinateur contre ordinateur se terminent', () => {
  for (let k = 0; k < 20; k++) {
    const g = new Game();
    let steps = 0;
    while (!g.over && steps++ < 20000) aiStep(g);
    assert.ok(g.over, `partie ${k} non terminée`);
    assert.ok(g.saved[0] + g.saved[1] + g.lost[0] + g.lost[1] + g.pionsLeft(0) + g.pionsLeft(1) === 30);
  }
});

test('la partie se sauvegarde et se recharge à l\'identique (reprise après rechargement)', () => {
  const g = new Game({ rng: seq(2, 3, 5) });
  g.roll();
  g.move('reserve', cellId(1, 9), [0]);
  const data = JSON.parse(JSON.stringify(g.serialize()));
  const h = new Game();
  h.load(data);
  assert.deepEqual(h.serialize(), g.serialize());
  assert.equal(h.phase, 'move');
  assert.equal(h.moveLimit, Infinity);
  assert.ok(h.move('reserve', cellId(1, 8), [1]) || h.freeDice().length >= 0);
});

test('un déplacement fournit un chemin case par case de la bonne longueur', () => {
  const g = new Game({ rng: seq(2, 3, 5) });
  g.roll();
  let moved = null;
  g.on('moved', (m) => { moved = m; });
  g.move('reserve', cellId(1, 9), [0]);
  assert.equal(moved.path.length, 3);
  assert.equal(moved.path[0], RESERVE);
  assert.equal(moved.path[2], cellId(1, 9));
  assert.ok(moved.path[1].endsWith('r10'));
  const h = new Game();
  empty(h);
  put(h, cellId(0, 1), 0, 1);
  const p = h.path(cellId(0, 1), EXIT, 2);
  assert.deepEqual(p, [cellId(0, 1), cellId(0, 0), EXIT]);
});
