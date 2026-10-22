import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/games/pixel/core/Game.js';
import { parseCommand } from '../src/games/pixel/core/commands.js';
import { CELL } from '../src/games/pixel/core/constants.js';
import { World } from '../src/games/pixel/core/World.js';
import { buildLevel, LEVELS } from '../src/games/pixel/core/levels/index.js';

/** Partie de test : monde vide, joueur en (0,0), objectif inatteignable par défaut. */
function emptyGame(goal = { type: 'collect', count: 999 }) {
  const g = new Game();
  g.level = { ...g.level, goal, purpleMoveEvery: 0 };
  g.world = new World(() => {});
  g.gates = [];
  return g;
}

test('parseCommand valide et refuse correctement', () => {
  assert.equal(parseCommand([1, 0]).ok, true);
  assert.equal(parseCommand([2, 0]).ok, false);
  assert.equal(parseCommand('x').ok, false);
  assert.equal(parseCommand([0, 0, [0, 0, 0]]).ok, false);
  assert.equal(parseCommand([0, 0, [1, 0, 0]]).cmd.fire.x, 1);
  const m = parseCommand([0, 0, null, [0, [0, 2, 0], 1, [1, 0, 0]]]);
  assert.equal(m.ok, true);
  assert.equal(m.cmd.moves.length, 2);
  assert.equal(parseCommand([0, 0, null, [0, [0, -1, 0]]]).ok, false);
  assert.equal(parseCommand([0, 0, null, [0, [0, 0, 0]]]).ok, false);
});

test('ramasser un jaune le pose au-dessus du rouge', () => {
  const g = emptyGame();
  g.world.set(1, 0, 0, CELL.YELLOW);
  g.enqueue([1, 0]);
  g.tick();
  assert.equal(g.player.x, 1);
  assert.deepEqual(g.player.offsets, [{ x: 0, y: 1, z: 0 }]);
  assert.equal(g.world.has(1, 0, 0), false);
});

test('le rouge touche un violet = game over', () => {
  const g = emptyGame();
  g.world.set(0, 0, 1, CELL.PURPLE);
  g.enqueue([0, 1]);
  g.tick();
  assert.equal(g.state, 'gameover');
});

test('un mur blanc bloque le déplacement', () => {
  const g = emptyGame();
  g.world.set(-1, 0, 0, CELL.WHITE);
  g.enqueue([-1, 0]);
  g.tick();
  assert.equal(g.player.x, 0);
});

test('un cube jaune qui tombe sur un violet l\'écrase : détruit, +1 balle, la colonne descend', () => {
  const g = emptyGame();
  g.player.setOffsets([{ x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }, { x: 2, y: 1, z: 0 }]);
  g.world.set(2, 0, 1, CELL.PURPLE);
  const before = g.bullets;
  g.enqueue([0, 1]);
  g.tick();
  assert.equal(g.world.has(2, 0, 1), false, 'violet détruit');
  assert.equal(g.bullets, before + 1);
  // le cube (2,0) a été détruit puis (2,1) est descendu pour combler le trou
  assert.ok(g.player.hasLocal(2, 0, 0));
  assert.equal(g.player.size, 3);
});

test('un cube détaché par moveyellow est détruit', () => {
  const g = emptyGame();
  g.player.setOffsets([{ x: 1, y: 0, z: 0 }]);
  g.enqueue([0, 0, null, [0, [5, 0, 0]]]);
  g.tick();
  assert.equal(g.player.size, 0);
});

test('tir : détruit le premier pixel rencontré, refusé sans balle', () => {
  const g = emptyGame();
  g.world.set(4, 0, 0, CELL.PURPLE);
  g.bullets = 1;
  g.enqueue([0, 0, [1, 0, 0]]);
  g.tick();               // tir + la balle parcourt 3 cases
  g.tick();               // elle atteint (4,0,0)
  assert.equal(g.world.has(4, 0, 0), false);
  assert.equal(g.bullets, 1, 'balle consommée puis regagnée grâce au violet');
  g.bullets = 0;
  let err = null;
  g.events.on('error', (e) => { err = e; });
  g.enqueue([0, 0, [1, 0, 0]]);
  g.tick();
  assert.match(err, /BulletsCount = 0/);
});

test('objectif atteint -> animation puis niveau suivant, le joueur repart avec les cubes du niveau', () => {
  const g = emptyGame({ type: 'collect', count: 1 });
  g.world.set(1, 0, 0, CELL.YELLOW);
  g.enqueue([1, 0]);
  g.tick();
  assert.equal(g.state, 'levelcomplete');
  for (let i = 0; i < 10 && g.state === 'levelcomplete'; i++) g.tick();
  assert.equal(g.level.n, 2);
  assert.equal(g.state, 'playing');
  assert.equal(g.player.size, 0, 'les cubes sont réinitialisés par le niveau (offsets de départ)');
  assert.equal(g.progress.collect, 0, 'la progression repart de zéro');
});

test('objectif portes : le rouge doit traverser la case porte', () => {
  const g = emptyGame({ type: 'gates', count: 1 });
  g.gates = [{ x: 2, z: 0, passed: false }];
  g.enqueue([1, 0]); g.tick();
  assert.equal(g.state, 'playing');
  g.enqueue([1, 0]); g.tick();
  assert.equal(g.progress.gates, 1);
  assert.equal(g.state, 'levelcomplete');
});

test('pas de sandwich : un violet entre deux cubes jaunes n\'est pas détruit', () => {
  const g = emptyGame({ type: 'purples', count: 1 });
  g.player.setOffsets([{ x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 2, y: 0, z: 1 }]);
  g.world.set(1, 0, 1, CELL.PURPLE);
  g.enqueue([0, 0]); g.tick();
  assert.equal(g.player.size, 4, 'les quatre cubes sont intacts');
  assert.equal(g.world.get(1, 0, 1), CELL.PURPLE);
  assert.equal(g.progress.purples, 0);
});

test('objectif tir : seul un violet touché par une balle compte', () => {
  const g = emptyGame({ type: 'shoot', count: 1 });
  g.world.set(4, 0, 0, CELL.PURPLE);
  g.bullets = 1;
  g.enqueue([0, 0, [1, 0, 0]]);
  g.tick(); g.tick();
  assert.equal(g.progress.shoot, 1);
  assert.equal(g.state, 'levelcomplete');
});

test('tous les niveaux se construisent : bordure blanche, départ libre, portes présentes', () => {
  for (const def of LEVELS) {
    const { world, gates, bounds } = buildLevel(def, 7);
    assert.equal(world.get(bounds.minX, 0, bounds.minZ), CELL.WHITE, `${def.name} : coin bordé`);
    assert.equal(world.has(0, 0, 0), false, `${def.name} : départ libre`);
    if (def.goal.type === 'gates') assert.equal(gates.length, def.goal.count, `${def.name} : nb de portes`);
    if (def.id === 1) {
      for (const c of world.cellsNear(0, 0, 100)) assert.notEqual(c.type, CELL.PURPLE, 'niveau 1 sans violet');
    }
  }
});

test('les murs blancs sont incassables : la balle disparaît sans détruire le mur', () => {
  const g = emptyGame();
  g.world.set(3, 0, 0, CELL.WHITE);
  g.world.set(5, 0, 0, CELL.PURPLE);
  g.bullets = 1;
  g.enqueue([0, 0, [1, 0, 0]]);
  g.tick(); g.tick(); g.tick();
  assert.equal(g.world.get(3, 0, 0), CELL.WHITE);
  assert.equal(g.world.get(5, 0, 0), CELL.PURPLE, 'la balle ne traverse pas le mur');
  assert.equal(g.projectiles.length, 0);
  assert.equal(g.bullets, 0, 'balle perdue');
});

test('boucle infinie : move() lève une erreur quand la file est pleine, stop() la vide', async () => {
  const { createTerminalApi } = await import('../src/games/pixel/api/terminalApi.js');
  const g = emptyGame();
  const api = createTerminalApi(g, () => {});
  assert.throws(() => { while (true) api.move(1, 0); }, /file pleine/);
  assert.ok(g.queue.length > 0);
  api.stop();
  assert.equal(g.queue.length, 0);
});

test('boucle sans commande : le garde-fou stoppe le script après 1000 tours', async () => {
  const { createTerminalApi, evaluate, compileUserFunction } = await import('../src/games/pixel/api/terminalApi.js');
  const api = createTerminalApi(emptyGame(), () => {});
  assert.throws(() => evaluate(api, 'while (true) {}'), /fatigué/);
  assert.throws(() => evaluate(api, 'for (;;) {}'), /fatigué/);
  assert.throws(() => evaluate(api, 'let i = 0; do { i++ } while (true)'), /fatigué/);
  compileUserFunction(api, 'function boucle() { while (true) {} }');
  assert.throws(() => api.boucle(), /fatigué/);
  assert.equal(evaluate(api, 'let n = 0; for (let i = 0; i < 100; i++) n += i; n'), 4950);
});

test('gravité : un cube placé en hauteur sans support retombe', () => {
  const g = emptyGame();
  g.player.setOffsets([{ x: 1, y: 0, z: 0 }]);
  let fell = null;
  g.events.on('cubeMoved', (m) => { fell = m; });
  g.enqueue([0, 0, null, [0, [1, 3, 0]]]);
  g.tick();
  assert.deepEqual(g.player.offsets, [{ x: 1, y: 0, z: 0 }]);
  assert.deepEqual(fell.to, { x: 1, y: 0, z: 0 });
});

test('gravité : un cube au-dessus du rouge reste, un cube flottant à côté tombe', () => {
  const g = emptyGame();
  g.player.setOffsets([{ x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }]);
  g.enqueue([0, 0]);
  g.tick();
  assert.ok(g.player.hasLocal(0, 1, 0), 'posé sur le rouge');
  assert.ok(g.player.hasLocal(1, 0, 0), 'retombé au sol');
  assert.equal(g.player.size, 2);
});

test('gravité du monde : une tour violette retombe quand sa base est détruite', () => {
  const g = emptyGame();
  g.world.set(4, 0, 0, CELL.PURPLE);
  g.world.set(4, 1, 0, CELL.PURPLE);
  g.bullets = 1;
  g.enqueue([0, 0, [1, 0, 0]]);
  g.tick(); g.tick();
  assert.equal(g.world.get(4, 0, 0), CELL.PURPLE, 'le cube du dessus est redescendu');
  assert.equal(g.world.has(4, 1, 0), false);
});
