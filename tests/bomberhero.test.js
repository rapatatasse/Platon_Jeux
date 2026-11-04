import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BomberGame } from '../src/games/bomberhero/core/BomberGame.js';
import { generateMap, spiralOrder, FLOOR, WALL, BLOCK, CHEST, VOID } from '../src/games/bomberhero/core/grid.js';
import { GAME } from '../src/games/bomberhero/config.js';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const CFG = { ...GAME, blockDensity: 0, chestsPerQuarter: 0, bonusChance: 0, suddenDeathAt: 0 };
const make = (n = 2, over = {}) => new BomberGame({ config: { ...CFG, ...over }, playerCount: n, rng: seeded() });
const run = (g, sec, step = 1 / 60) => { for (let t = 0; t < sec; t += step) g.update(step); };
const clear = (g) => g.cells.forEach((c, i) => { if (c === BLOCK || c === CHEST) g.cells[i] = FLOOR; });

test('arène : bordée de murs, symétrique, coins dégagés', () => {
  const cells = generateMap({ ...GAME }, seeded(7));
  const { width: W, height: H } = GAME;
  for (let x = 0; x < W; x++) { assert.equal(cells[x], WALL); assert.equal(cells[(H - 1) * W + x], WALL); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    assert.equal(cells[y * W + x], cells[y * W + (W - 1 - x)]);
    assert.equal(cells[y * W + x], cells[(H - 1 - y) * W + x]);
  }
  for (const [x, y] of [[1, 1], [2, 1], [1, 2], [W - 2, H - 2], [W - 3, H - 2], [W - 2, H - 3]]) assert.equal(cells[y * W + x], FLOOR);
  assert.equal(cells.filter((c) => c === CHEST).length, GAME.chestsPerQuarter * 4);
  assert.equal(cells[2 * W + 2], WALL);
});

test('spirale de fermeture : couvre toutes les cases intérieures une seule fois', () => {
  const o = spiralOrder(15, 13);
  assert.equal(o.length, 13 * 11);
  assert.equal(new Set(o.map(([x, y]) => `${x},${y}`)).size, o.length);
});

test('déplacement case par case, bloqué par un mur', () => {
  const g = make();
  g.setInput(0, 1, 0);
  run(g, 0.6);
  assert.ok(g.players[0].x >= 2);
  g.setInput(0, 0, -1);
  run(g, 2);
  assert.equal(g.players[0].y, 1);
});

test('demi-tour possible en cours de déplacement', () => {
  const g = make();
  g.setInput(0, 1, 0);
  run(g, 0.1);
  g.setInput(0, -1, 0);
  run(g, 0.5);
  assert.equal(g.players[0].x, 1);
});

test('une bombe détruit un bloc, le joueur peut quitter sa bombe mais pas y revenir', () => {
  const g = make();
  g.cells[1 * 15 + 4] = BLOCK;
  g.placeBomb(0);
  assert.equal(g.bombs.length, 1);
  g.setInput(0, 1, 0);
  run(g, 0.5);
  assert.ok(g.players[0].x >= 2);
  g.setInput(0, -1, 0);
  run(g, 0.8);
  assert.ok(g.players[0].x >= 2, 'la bombe bloque le retour');
});

test('explosion : bloc détruit, flammes arrêtées par les murs, mort du joueur touché', () => {
  const g = make();
  g.players[0].range = 3;
  g.cells[1 * 15 + 4] = BLOCK;
  const events = [];
  g.on('*', (e) => events.push(e));
  g.placeBomb(0);
  g.setInput(0, 0, 1);
  run(g, 0.5);
  run(g, 2.2);
  assert.ok(events.includes('explosion'));
  assert.equal(g.cell(4, 1), FLOOR);
  assert.ok(events.includes('blockDestroyed'));
  assert.ok(g.players[0].alive, 'le joueur s\'est mis à l\'abri en descendant');
  g.cells[1 * 15 + 4] = BLOCK;
  g.setInput(0, 0, 0);
  g.players[1].x = g.players[1].tx = 2; g.players[1].y = g.players[1].ty = 1;
  g.players[0].x = g.players[0].tx = 3; g.players[0].y = g.players[0].ty = 1; g.players[0].prog = 0;
  g.flames = [];
  g.placeBomb(1);
  run(g, 2.5);
  assert.equal(g.players[0].alive, false);
  assert.equal(g.players[1].alive, false, 'son propre sortilège posé peut le tuer');
  assert.ok(g.cell(4, 1) !== BLOCK);
});

test('réaction en chaîne', () => {
  const g = make();
  clear(g);
  const p0 = g.players[0];
  g.placeBomb(0);
  g.bombs[0].fuse = 100;
  p0.bombsMax = 3;
  g.bombs.push({ id: 99, x: 3, y: 1, tx: 3, ty: 1, prog: 0, slide: null, owner: 1, range: 2, fuse: 0.05, walkers: new Set() });
  run(g, 0.2);
  assert.equal(g.bombs.length, 0);
});

test('bonus et coffre : un bloc cassé laisse un bonus, un coffre un pouvoir', () => {
  const g = make(2, { bonusChance: 1 });
  g.cells[1 * 15 + 3] = BLOCK;
  g.cells[2 * 15 + 1] = CHEST;
  g.players[0].range = 2;
  g.placeBomb(0);
  g.setInput(0, 0, 0);
  run(g, 3);
  assert.ok([...g.items.values()].some((i) => i.kind === 'power'));
  assert.ok([...g.items.values()].some((i) => i.kind !== 'power'));
});

test('ramassage : le pouvoir est stocké', () => {
  const g = make();
  g.items.set('2,1', { x: 2, y: 1, kind: 'power', power: 'haste' });
  g.setInput(0, 1, 0);
  run(g, 0.5);
  assert.equal(g.players[0].power, 'haste');
  assert.equal(g.items.size, 0);
  g.usePower(0);
  assert.ok(g.players[0].hasteT > 0);
  assert.equal(g.players[0].power, null);
});

test('pouvoir glace : fige le premier joueur en ligne', () => {
  const g = make();
  g.players[1].x = g.players[1].tx = 5; g.players[1].y = g.players[1].ty = 1;
  g.players[0].power = 'ice';
  g.usePower(0);
  assert.ok(g.players[1].frozen > 3);
  g.setInput(1, -1, 0);
  run(g, 1);
  assert.equal(g.players[1].x, 5);
  run(g, 3);
  assert.ok(g.players[1].x < 5);
});

test('pouvoir rayon : brise le premier bloc et tue en ligne', () => {
  const g = make();
  g.cells[1 * 15 + 6] = BLOCK;
  g.players[1].x = g.players[1].tx = 4; g.players[1].y = g.players[1].ty = 1;
  g.players[0].power = 'ray';
  g.usePower(0);
  g.update(0.016);
  assert.equal(g.cell(6, 1), FLOOR);
  assert.equal(g.players[1].alive, false);
});

test('pouvoir poussée : fait glisser une bombe', () => {
  const g = make();
  clear(g);
  g.bombs.push({ id: 5, x: 3, y: 1, tx: 3, ty: 1, prog: 0, slide: null, owner: 1, range: 1, fuse: 10, walkers: new Set() });
  g.players[0].power = 'push';
  g.usePower(0);
  run(g, 1.6);
  assert.ok(g.bombs[0].x > 5);
  assert.equal(g.bombs[0].slide, null, 'arrêtée par un mur');
});

test('pouvoir poussée : repousse un adversaire', () => {
  const g = make();
  g.players[1].x = g.players[1].tx = 3; g.players[1].y = g.players[1].ty = 1;
  g.players[0].power = 'push';
  g.usePower(0);
  run(g, 1);
  assert.equal(g.players[1].x, 3 + GAME.powers.push.slide);
});

test('pouvoir ralentisseur : ralentit les adversaires uniquement', () => {
  const g = make(3);
  g.players[0].power = 'slow';
  g.usePower(0);
  assert.equal(g.players[0].slowT, 0);
  assert.ok(g.players[1].slowT > 0 && g.players[2].slowT > 0);
  assert.ok(g.speedOf(g.players[1]) < g.speedOf(g.players[0]));
});

test('fin de manche : le dernier survivant gagne, la partie se termine après roundsToWin', () => {
  const g = make(2, { roundsToWin: 2, roundEndDelay: 0.1 });
  const ev = [];
  g.on('roundEnd', (e) => ev.push(e));
  g.on('matchEnd', (e) => ev.push(e));
  g.kill(g.players[1]);
  run(g, 0.5);
  assert.equal(ev[0].winner, 0);
  assert.equal(g.state, 'roundOver');
  g.startRound();
  g.kill(g.players[1]);
  run(g, 0.5);
  assert.equal(g.state, 'over');
  assert.equal(g.matchWinner, 0);
});

test('match nul si tout le monde meurt', () => {
  const g = make(2, { roundEndDelay: 0.1 });
  g.kill(g.players[0]); g.kill(g.players[1]);
  run(g, 0.5);
  assert.equal(g.winner, null);
  assert.deepEqual(g.wins, [0, 0]);
});

test("mort subite : les cases disparaissent depuis l'extérieur et on y tombe", () => {
  const g = make(2, { suddenDeathAt: 1, suddenDeathStep: 0.05, roundEndDelay: 0.1 });
  run(g, 1.2);
  assert.equal(g.cell(1, 1), VOID);
  run(g, 3);
  assert.ok(g.alivePlayers.length <= 1);
  assert.notEqual(g.state, 'playing');
});

test('vide : le joueur sur une case qui disparaît tombe, le vide ne gêne ni bombes ni flammes', () => {
  const g = make(2, { suddenDeathAt: 0.1, suddenDeathStep: 0.05, roundEndDelay: 0.1 });
  const died = [];
  g.on('playerDied', (e) => died.push(e));
  run(g, 0.4);
  assert.equal(g.cell(1, 1), VOID);
  assert.equal(died[0].cause, 'fall');
  assert.equal(g.players[0].alive, false);
  assert.ok(g.closingNext.length <= 3);
});

test('vide : marcher dans le vide fait tomber', () => {
  const g = make(2, { suddenDeathAt: 0.1, suddenDeathStep: 0.05 });
  g.setCell(3, 1, VOID);
  g.setInput(0, 1, 0);
  run(g, 1);
  assert.equal(g.players[0].alive, false);
});

test('pouvoir flamme : mur de flammes qui tue, arrêté par un bloc sans le détruire', () => {
  const g = make();
  g.cells[1 * 15 + 6] = BLOCK;
  g.players[1].x = g.players[1].tx = 4; g.players[1].y = g.players[1].ty = 1;
  g.players[0].power = 'fire';
  g.usePower(0);
  assert.equal(g.flames.length, 4);
  run(g, 0.5);
  assert.equal(g.players[1].alive, false);
  assert.equal(g.cell(6, 1), BLOCK);
  run(g, 2);
  assert.equal(g.flames.length, 0);
});

test('arène réduite à 2 joueurs : symétrique, bordée, coins de départ dégagés', () => {
  const cfg = { ...GAME, ...GAME.sizes[2] };
  const { width: W, height: H } = cfg;
  assert.ok(W < GAME.width && H < GAME.height);
  const cells = generateMap(cfg, seeded(3));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    assert.equal(cells[y * W + x], cells[y * W + (W - 1 - x)]);
    assert.equal(cells[y * W + x], cells[(H - 1 - y) * W + x]);
  }
  for (const [x, y] of [[1, 1], [2, 1], [1, 2], [W - 2, H - 2], [W - 3, H - 2], [W - 2, H - 3]]) assert.equal(cells[y * W + x], FLOOR);
  const g = new BomberGame({ config: cfg, playerCount: 2, rng: seeded(3) });
  assert.deepEqual([g.players[1].x, g.players[1].y], [W - 2, H - 2]);
});

import { Bot } from '../src/games/bomberhero/core/Bot.js';

const play = (g, bots, sec, step = 1 / 60) => { for (let t = 0; t < sec; t += step) { bots.forEach((b) => b.update(step)); g.update(step); } };

test('robot : fuit un sortilège sur le point d\'exploser', () => {
  const g = make();
  clear(g);
  g.bombs.push({ id: 7, x: 2, y: 1, tx: 2, ty: 1, prog: 0, slide: null, owner: 1, range: 3, fuse: 1.5, walkers: new Set() });
  play(g, [new Bot(g, 0)], 3);
  assert.equal(g.players[0].alive, true);
});

test('robot : ne marche pas dans le vide ni dans les flammes', () => {
  const g = make();
  clear(g);
  g.setCell(2, 1, VOID);
  g.flames.push({ x: 1, y: 2, t: 5, total: 5, kind: 'fire' });
  play(g, [new Bot(g, 0)], 2);
  assert.equal(g.players[0].alive, true);
});

test('robot : utilise son pouvoir quand un adversaire est aligné', () => {
  const g = make();
  clear(g);
  g.players[1].x = g.players[1].tx = 5; g.players[1].y = g.players[1].ty = 1;
  g.players[0].power = 'ice';
  play(g, [new Bot(g, 0)], 0.5);
  assert.equal(g.players[0].power, null);
});

test('robots : des manches entières se terminent et ils cassent des blocs', () => {
  for (const seed of [2, 5, 9]) {
    const cfg = { ...GAME, ...GAME.sizes[2] };
    const g = new BomberGame({ config: cfg, playerCount: 2, rng: seeded(seed) });
    let blocks = 0;
    g.on('blockDestroyed', () => blocks++);
    play(g, g.players.map((p) => new Bot(g, p.id)), 200);
    assert.ok(['roundOver', 'over'].includes(g.state), 'la manche se termine');
    assert.ok(blocks > 0);
  }
});

/** Compte les demi-tours en cours de case (signe d'un robot qui hésite). */
const countReversals = (g, bots, sec) => {
  let rev = 0, last = { tx: -1, ty: -1, x: -1, y: -1 };
  for (let t = 0; t < sec; t += 1 / 60) {
    bots.forEach((b) => b.update(1 / 60));
    g.update(1 / 60);
    const p = g.players[0];
    if (p.prog > 0 && (p.tx !== last.tx || p.ty !== last.ty) && last.x === p.tx && last.y === p.ty) rev++;
    last = { tx: p.tx, ty: p.ty, x: p.x, y: p.y };
  }
  return rev;
};

test('robot : ne fait pas d\'allers-retours sur place quand l\'adversaire est inaccessible', () => {
  const g = make();
  clear(g);
  [[4, 1], [6, 1], [5, 2]].forEach(([x, y]) => g.setCell(x, y, WALL));
  g.players[1].x = g.players[1].tx = 5; g.players[1].y = g.players[1].ty = 1;
  g.players[0].bombsMax = 0;
  assert.ok(countReversals(g, [new Bot(g, 0)], 10) <= 2);
});

test('robot : va jusqu\'à son but sans hésiter (pas de demi-tours répétés)', () => {
  const g = make(2, { blockDensity: 0.78, chestsPerQuarter: 2 });
  const bot = new Bot(g, 0);
  assert.ok(countReversals(g, [bot], 8) <= 3);
});

import { LAYOUT_IDS, LAYOUTS, spawnPoints, layoutStructure } from '../src/games/bomberhero/core/grid.js';
import { BOT_LEVELS } from '../src/games/bomberhero/config.js';

/** Cases atteignables depuis `from` (blocs et coffres comptés comme franchissables : on peut les détruire). */
const reachable = (cells, W, H, from) => {
  const seen = new Set([`${from.x},${from.y}`]), stack = [from];
  while (stack.length) {
    const { x, y } = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k) || cells[ny * W + nx] === WALL) continue;
      seen.add(k); stack.push({ x: nx, y: ny });
    }
  }
  return seen;
};

test('cartes : 5 cartes différentes, symétriques, bordées, départs dégagés et reliés entre eux', () => {
  assert.equal(LAYOUT_IDS.length, 5);
  const shapes = new Set();
  for (const id of LAYOUT_IDS) for (const cfg of [GAME, { ...GAME, ...GAME.sizes[2] }]) {
    const { width: W, height: H } = cfg;
    const cells = generateMap(cfg, seeded(4), id);
    shapes.add(`${W}x${H}:${layoutStructure(W, H, id).join()}`);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const border = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      if (border) assert.equal(cells[y * W + x], WALL, `${id} bord`);
      assert.equal(cells[y * W + x], cells[y * W + (W - 1 - x)], `${id} symétrie x`);
      assert.equal(cells[y * W + x], cells[(H - 1 - y) * W + x], `${id} symétrie y`);
    }
    const spawns = spawnPoints(W, H, id);
    spawns.forEach((s) => {
      assert.equal(cells[s.y * W + s.x], FLOOR, `${id} départ libre`);
      assert.ok(reachable(cells, W, H, s).size > 25, `${id} départ non enfermé`);
    });
    const all = reachable(cells, W, H, spawns[0]);
    spawns.forEach((s) => assert.ok(all.has(`${s.x},${s.y}`), `${id} départs reliés`));
  }
  assert.equal(shapes.size, 10, 'chaque carte a sa propre forme');
});

test('cartes : chaque carte se joue (manche avec robots) et le sol s\'effondre sans bloquer', () => {
  for (const id of LAYOUT_IDS) {
    for (const n of [2, 4]) {
      const cfg = { ...GAME, ...GAME.sizes?.[n], layout: id, suddenDeathAt: 15 };
      const g = new BomberGame({ config: cfg, playerCount: n, rng: seeded(6) });
      assert.equal(g.layoutId, id);
      play(g, g.players.map((p) => new Bot(g, p.id)), 120);
      assert.ok(['roundOver', 'over'].includes(g.state), `${id} ${n} joueurs : manche terminée`);
    }
  }
});

test('cartes : « aléatoire » tire une carte valide à chaque manche', () => {
  const g = new BomberGame({ config: { ...GAME, layout: 'random' }, playerCount: 2, rng: seeded(11) });
  const seen = new Set([g.layoutId]);
  for (let i = 0; i < 25; i++) { g.startRound(); seen.add(g.layoutId); }
  assert.ok([...seen].every((id) => LAYOUTS[id]));
  assert.ok(seen.size >= 3);
});

test('effondrement : les murs de la forme de la carte ne retardent pas la chute des cases', () => {
  const g = new BomberGame({ config: { ...GAME, layout: 'croix', suddenDeathAt: 0.1, suddenDeathStep: 0.1 }, playerCount: 2, rng: seeded(2) });
  g.time = 1;
  for (let i = 0; i < 6; i++) g.updateClosing(0.1);
  const fallen = g.cells.filter((c) => c === VOID).length;
  assert.ok(fallen >= 6, `cases tombées : ${fallen}`);
  assert.ok(g.closingPreview(3).every(([x, y]) => g.collapsible(x, y)));
});

test('robots : le niveau facile est plus lent et attend avant de relancer un sortilège', () => {
  const g = make();
  const easy = new Bot(g, 0, BOT_LEVELS.facile);
  easy.update(0.5);
  assert.equal(g.players[0].speedScale, BOT_LEVELS.facile.speed);
  assert.ok(g.speedOf(g.players[0]) < GAME.player.speed);
  const hard = new Bot(g, 1, BOT_LEVELS.difficile);
  hard.update(0.5);
  assert.equal(g.players[1].speedScale, 1);
  assert.ok(BOT_LEVELS.facile.think > BOT_LEVELS.normal.think && BOT_LEVELS.normal.think > BOT_LEVELS.difficile.think);
  assert.ok(BOT_LEVELS.facile.speed < BOT_LEVELS.normal.speed && BOT_LEVELS.normal.speed < BOT_LEVELS.difficile.speed);
});

test('robots : quel que soit le niveau, une manche se termine', () => {
  for (const level of Object.values(BOT_LEVELS)) {
    const cfg = { ...GAME, ...GAME.sizes[2], suddenDeathAt: 30 };
    const g = new BomberGame({ config: cfg, playerCount: 2, rng: seeded(8) });
    play(g, g.players.map((p) => new Bot(g, p.id, level)), 120);
    assert.ok(['roundOver', 'over'].includes(g.state), level.name);
  }
});

test('ses propres pouvoirs (rayon, flamme) ne touchent pas le lanceur, mais touchent les autres', () => {
  for (const power of ['ray', 'fire']) {
    const g = make();
    clear(g);
    g.players[0].x = g.players[0].tx = 3; g.players[0].y = g.players[0].ty = 1;
    g.players[0].dir = { dx: 1, dy: 0 };
    g.players[1].x = g.players[1].tx = 6; g.players[1].y = g.players[1].ty = 1;
    g.players[0].power = power;
    g.usePower(0);
    g.setInput(0, 1, 0);
    run(g, 2.8);
    assert.equal(g.players[0].alive, true, `lanceur épargné (${power})`);
    assert.equal(g.players[1].alive, false, `adversaire touché (${power})`);
  }
});

test("les flammes d'un adversaire tuent toujours", () => {
  const g = make();
  clear(g);
  g.flames.push({ x: 1, y: 1, t: 1, total: 1, kind: 'fire', owner: 1 });
  g.update(0.016);
  assert.equal(g.players[0].alive, false);
});

test('son propre sortilège posé tue le lanceur qui reste dans la zone', () => {
  const g = make();
  clear(g);
  g.placeBomb(0);
  run(g, 3);
  assert.equal(g.players[0].alive, false);
});

test("robot : bien placé mais en attente (délai entre deux sortilèges), il reste sur place au lieu de faire des allers-retours", () => {
  const g = make();
  clear(g);
  g.cells[1 * 15 + 5] = BLOCK;
  g.players[0].x = g.players[0].tx = 3; g.players[0].y = g.players[0].ty = 1;
  g.players[1].x = g.players[1].tx = 13; g.players[1].y = g.players[1].ty = 11;
  g.setCell(12, 11, WALL); g.setCell(13, 10, WALL);
  const bot = new Bot(g, 0, { ...BOT_LEVELS.facile, blunder: 0 });
  bot.bombReady = 10;
  assert.equal(countReversals(g, [bot], 2), 0);
  assert.deepEqual([g.players[0].x, g.players[0].y], [3, 1]);
});

test('robot : même avec un délai de réaction long, il ne dépasse pas sa case cible', () => {
  const g = make();
  clear(g);
  g.players[1].x = g.players[1].tx = 13; g.players[1].y = g.players[1].ty = 1;
  const bot = new Bot(g, 0, { ...BOT_LEVELS.facile, blunder: 0 });
  let steps = 0, last = '1,1';
  for (let t = 0; t < 6; t += 1 / 60) {
    bot.update(1 / 60); g.update(1 / 60);
    const p = g.players[0], k = `${p.x},${p.y}`;
    if (k !== last) { steps++; last = k; }
  }
  assert.ok(steps <= 12, `déplacements : ${steps}`);
});

test('robot : bloqué sans bouger, il est forcé de sortir de son coin en L, de lancer un sortilège puis de repartir', () => {
  const g = make();
  clear(g);
  // coin en L : seules (1,1), (2,1) et (1,2) sont libres, des blocs partout autour
  for (let y = 1; y <= 4; y++) for (let x = 1; x <= 4; x++) {
    if ((x === 1 && y === 1) || (x === 2 && y === 1) || (x === 1 && y === 2)) continue;
    if (g.cell(x, y) === FLOOR) g.setCell(x, y, BLOCK);
  }
  g.players[1].x = g.players[1].tx = 13; g.players[1].y = g.players[1].ty = 11;
  g.setCell(12, 11, WALL); g.setCell(13, 10, WALL);
  const bot = new Bot(g, 0, { ...BOT_LEVELS.facile, blunder: 0, bombDelay: 99 });
  bot.bombReady = 99;
  let placed = null, moved = false;
  g.on('bombPlaced', () => { placed ??= g.time; });
  for (let t = 0; t < 12; t += 1 / 60) {
    bot.update(1 / 60); g.update(1 / 60);
    if (g.players[0].x !== 1 || g.players[0].y !== 1) moved = true;
  }
  assert.ok(moved, 'il sort de sa case');
  assert.ok(placed !== null && placed < 9, `il lance un sortilège (${placed})`);
  assert.equal(g.players[0].alive, true, 'et survit');
});

import { LEVELS, buildLevel, AdventureRun } from '../src/games/bomberhero/core/adventure.js';
import { ENEMY_LEVELS } from '../src/games/bomberhero/config.js';

test('aventure : chaque étage est jouable (départs, gardiens et porte sur le sol, tout est atteignable)', () => {
  assert.ok(LEVELS.length >= 8);
  LEVELS.forEach((def, i) => {
    const L = buildLevel(def, i);
    const at = (p) => L.cells[p.y * L.width + p.x];
    assert.equal(L.cells.length, L.width * L.height);
    for (let x = 0; x < L.width; x++) { assert.equal(L.cells[x], WALL); assert.equal(L.cells[(L.height - 1) * L.width + x], WALL); }
    L.heroes.forEach((h) => assert.equal(at(h), FLOOR, `${def.name} : départ libre`));
    L.enemies.forEach((e) => { assert.equal(at(e), FLOOR, `${def.name} : gardien sur le sol`); assert.ok(ENEMY_LEVELS[e.level], 'niveau de gardien connu'); });
    assert.equal(at(L.door), FLOOR, `${def.name} : porte sur le sol`);
    const seen = reachable(L.cells, L.width, L.height, L.heroes[0]);
    assert.ok(seen.has(`${L.door.x},${L.door.y}`), `${def.name} : porte atteignable`);
    L.heroes.forEach((h) => assert.ok(seen.has(`${h.x},${h.y}`), `${def.name} : héros reliés`));
    L.enemies.forEach((e) => assert.ok(seen.has(`${e.x},${e.y}`), `${def.name} : gardiens atteignables`));
    L.enemies.forEach((e) => assert.ok(Math.abs(e.x - L.heroes[0].x) + Math.abs(e.y - L.heroes[0].y) >= 5, `${def.name} : pas de gardien collé au départ`));
    assert.ok(L.cells.filter((c) => c === CHEST).length >= 2, `${def.name} : des coffres`);
  });
});

test('aventure : la difficulté augmente d\'étage en étage et certains étages sont chronométrés', () => {
  const strength = (def) => def.enemies.reduce((s, e) => s + Number(e[2]), 0);
  for (let i = 1; i < LEVELS.length; i++) assert.ok(strength(LEVELS[i]) >= strength(LEVELS[i - 1]), `étage ${i + 1}`);
  assert.ok(strength(LEVELS.at(-1)) > 2 * strength(LEVELS[0]));
  assert.ok(LEVELS.filter((d) => d.time > 0).length >= 3);
  assert.ok(LEVELS.at(-1).enemies.length > LEVELS[0].enemies.length);
});

test('aventure : un héros sur la porte franchit l\'étage, les deux joueurs reviennent à la vie à l\'étage suivant', () => {
  const run = new AdventureRun({ heroCount: 2 });
  const g = run.createGame(GAME, seeded(3));
  assert.deepEqual(g.players.slice(0, 2).map((p) => p.team), ['h', 'h']);
  assert.ok(g.players.slice(2).every((p) => p.team === 'e'));
  assert.equal(g.players.length, 2 + LEVELS[0].enemies.length);
  g.kill(g.players[1]);
  g.players[0].bombsMax = 3;
  const events = [];
  g.on('levelCleared', (e) => events.push(e));
  g.players[0].x = g.players[0].tx = g.exit.x; g.players[0].y = g.players[0].ty = g.exit.y;
  g.update(0.016);
  assert.equal(g.state, 'cleared');
  assert.equal(events[0].revived, 1);
  assert.equal(run.win(g), 'next');
  const next = run.createGame(GAME, seeded(3));
  assert.ok(next.players.slice(0, 2).every((p) => p.alive), 'les deux héros sont en vie');
  assert.equal(next.players[0].bombsMax, 3, 'améliorations conservées');
  assert.equal(run.index, 1);
});

test('aventure : tous les héros à terre ou temps écoulé = échec, les vies sont comptées', () => {
  const run = new AdventureRun({ heroCount: 2, startLevel: 2, lives: 2 });
  let g = run.createGame(GAME, seeded(1));
  const fails = [];
  g.on('levelFailed', (e) => fails.push(e.reason));
  g.kill(g.players[0]);
  g.update(0.016);
  assert.equal(g.state, 'playing', 'un héros reste debout');
  g.kill(g.players[1]);
  g.update(0.016);
  assert.equal(g.state, 'failed');
  assert.equal(run.lose(), 'retry');
  g = run.createGame(GAME, seeded(1));
  g.on('levelFailed', (e) => fails.push(e.reason));
  assert.ok(g.timeLimit > 0);
  g.time = g.timeLimit;
  g.update(0.016);
  assert.deepEqual(fails, ['dead', 'time']);
  assert.equal(run.lose(), 'gameover');
});

test('aventure : la dernière porte donne la victoire', () => {
  const run = new AdventureRun({ heroCount: 1, startLevel: LEVELS.length - 1 });
  const g = run.createGame(GAME, seeded(1));
  assert.equal(run.win(g), 'victory');
});

test('aventure : les gardiens dorment jusqu\'à ce qu\'un héros approche, et ne s\'attaquent pas entre eux', () => {
  const run = new AdventureRun({ heroCount: 1 });
  const g = run.createGame(GAME, seeded(2));
  const enemy = g.players[1];
  const bot = new Bot(g, enemy.id, { ...BOT_LEVELS.normal, aggro: 4 });
  const start = [enemy.x, enemy.y];
  play(g, [bot], 2);
  assert.deepEqual([enemy.x, enemy.y], start, 'il dort');
  assert.equal(bot.awake, false);
  assert.ok(!bot.enemies(enemy).some((q) => q.team === 'e'), 'ne cible pas un autre gardien');
  g.players[0].x = g.players[0].tx = enemy.x - 2; g.players[0].y = g.players[0].ty = enemy.y;
  play(g, [bot], 0.2);
  assert.equal(bot.awake, true);
});

test('combat : chaque joueur est dans sa propre équipe', () => {
  const g = make(3);
  assert.deepEqual(g.players.map((p) => p.team), [0, 1, 2]);
});
