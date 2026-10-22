import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/games/pixel/core/Game.js';
import { CELL } from '../src/games/pixel/core/constants.js';
import { World } from '../src/games/pixel/core/World.js';
import { scan, scanRange } from '../src/games/pixel/core/scan.js';
import { shortestSteps } from '../src/games/pixel/core/path.js';
import { buildLevel, levelTests, LEVELS, getLevelDef } from '../src/games/pixel/core/levels/index.js';
import { runLevelTest, runAllLevelTests, tickBudget, loadProgress, recordResults, passedCount } from '../src/games/pixel/api/levelTests.js';

const memoryStorage = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
};

/** Partie vide pour tester le scanner. */
function emptyGame() {
  const g = new Game();
  g.world = new World(() => {});
  g.gates = [];
  return g;
}

// ---------------------------------------------------------------- Scanner

test('scanner : portée 1 sans jaune, +1 par jaune empilé sur le rouge', () => {
  const g = emptyGame();
  assert.equal(scanRange(g.player), 1);
  g.player.setOffsets([{ x: 0, y: 1, z: 0 }, { x: 0, y: 2, z: 0 }, { x: 1, y: 0, z: 0 }]);
  assert.equal(scanRange(g.player), 3, 'seule la colonne continue au-dessus du rouge compte');
  g.player.setOffsets([{ x: 0, y: 2, z: 0 }]);
  assert.equal(scanRange(g.player), 1, 'un cube flottant ne compte pas');
});

test('scanner : renvoie violets et jaunes relatifs au rouge, dans la portée seulement', () => {
  const g = emptyGame();
  g.world.set(0, 0, 1, CELL.PURPLE);
  g.world.set(1, 0, -1, CELL.PURPLE);
  g.world.set(3, 0, 0, CELL.YELLOW);
  g.world.set(1, 0, 0, CELL.WHITE);
  assert.deepEqual(scan(g), [
    { type: 'violet', coordinates: [[0, 1], [1, -1]] },
    { type: 'mur', coordinates: [[1, 0]] },
  ], 'jaune hors portée, mur affiché');
  g.player.setOffsets([{ x: 0, y: 1, z: 0 }, { x: 0, y: 2, z: 0 }]);
  assert.deepEqual(scan(g), [
    { type: 'violet', coordinates: [[0, 1], [1, -1]] },
    { type: 'jaune', coordinates: [[3, 0]] },
    { type: 'mur', coordinates: [[1, 0]] },
  ]);
  g.player.x = 10;
  assert.deepEqual(scan(g), [], 'coordonnées relatives : plus rien autour');
});

test('le déplacement se fait uniquement avec move(x, z) : run() n\'existe plus', async () => {
  const { createTerminalApi } = await import('../src/games/pixel/api/terminalApi.js');
  const api = createTerminalApi(emptyGame(), () => {});
  assert.equal(typeof api.move, 'function');
  assert.equal(api.run, undefined);
});

test('commande asynchrone : la promesse de move() est résolue à l\'exécution du pas', async () => {
  const { createTerminalApi } = await import('../src/games/pixel/api/terminalApi.js');
  const g = emptyGame();
  const api = createTerminalApi(g, () => {});
  let done = false;
  api.move(1, 0).then(() => { done = true; });
  await Promise.resolve();
  assert.equal(done, false);
  g.tick();
  await Promise.resolve();
  assert.equal(done, true);
  assert.equal(g.player.x, 1);
  assert.deepEqual(api.Scanner, []);
});

test('Gates tient compte des murs : un pas bloqué ne change pas la position prévue', async () => {
  const { createTerminalApi } = await import('../src/games/pixel/api/terminalApi.js');
  const g = emptyGame();
  g.gates = [{ x: 5, z: 0, passed: false }];
  g.world.set(1, 0, 0, CELL.WHITE);
  const api = createTerminalApi(g, () => {});
  api.move(1, 0);
  assert.deepEqual(api.Gates[0], { x: 5, z: 0, passed: false });
  api.move(0, 1);
  assert.deepEqual(api.Gates[0], { x: 5, z: -1, passed: false });
});

// ---------------------------------------------------------------- Niveaux

test('10 niveaux, chacun avec au moins un test, cartes bien formées', () => {
  assert.equal(LEVELS.length, 10);
  for (const [i, def] of LEVELS.entries()) {
    const n = i + 1;
    assert.ok(levelTests(n).length >= 1);
    for (const t of levelTests(n)) {
      const d = getLevelDef(n, t.index);
      const { world, gates, bounds } = buildLevel(d);
      assert.equal(world.has(0, 0, 0), false, `${def.name}/${t.name} : départ libre`);
      if (d.goal.type === 'gates') assert.equal(gates.length, d.goal.count, `${def.name}/${t.name} : portes`);
      for (const g of gates) {
        assert.notEqual(shortestSteps(world, bounds, { x: 0, z: 0 }, g, [CELL.WHITE]), null, `${def.name}/${t.name} : porte accessible`);
      }
    }
  }
});

test('niveau scanner : tous les jaunes sont accessibles (variantes avec murs comprises)', () => {
  for (const t of levelTests(4)) {
    const d = getLevelDef(4, t.index);
    const { world, bounds } = buildLevel(d);
    const yellows = [...world.cellsOfType(CELL.YELLOW)];
    assert.equal(yellows.length, 8);
    for (const y of yellows) assert.notEqual(shortestSteps(world, bounds, { x: 0, z: 0 }, y), null, `${t.name}`);
  }
});

/** Solveur du niveau scanner : ne connaît que le Scanner (ramasse le jaune visible le plus proche) + le chemin le plus court. */
function playScannerLevel(testIndex) {
  const g = new Game({ level: 4, test: testIndex });
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const nextStep = (target) => {
    const prev = new Map([[`${g.player.x},${g.player.z}`, null]]);
    const q = [[g.player.x, g.player.z]];
    for (let i = 0; i < q.length; i++) {
      const [x, z] = q[i];
      if (x === target.x && z === target.z) {
        let k = `${x},${z}`;
        while (prev.get(k) && prev.get(prev.get(k)) !== null) k = prev.get(k);
        const [px, pz] = k.split(',').map(Number);
        return [px - g.player.x, pz - g.player.z];
      }
      for (const [dx, dz] of dirs) {
        const k = `${x + dx},${z + dz}`;
        const t = g.world.get(x + dx, 0, z + dz);
        if (prev.has(k) || t === CELL.WHITE || t === CELL.PURPLE) continue;
        prev.set(k, `${x},${z}`);
        q.push([x + dx, z + dz]);
      }
    }
    return null;
  };
  let target = null;   // mémorisé : un détour peut faire sortir la cible de la portée du scanner
  for (let i = 0; i < 400 && g.state === 'playing'; i++) {
    if (!target || g.world.get(target.x, 0, target.z) !== CELL.YELLOW) {
      const yellow = scan(g).find((e) => e.type === 'jaune');
      assert.ok(yellow, `test ${testIndex} : le scanner doit montrer un jaune (${g.progress.collect}/8 ramassés en ${g.player.x},${g.player.z})`);
      const [dx, dz] = yellow.coordinates[0];
      target = { x: g.player.x + dx, z: g.player.z + dz };
    }
    const step = nextStep(target);
    g.enqueue(step);
    g.tick();
  }
  return g;
}

test('niveau scanner : jouable en ne se fiant qu\'au Scanner, dans les 3 versions', () => {
  for (const t of levelTests(4)) {
    const g = playScannerLevel(t.index);
    assert.equal(g.state, 'levelcomplete', t.name);
    assert.equal(g.progress.collect, 8);
  }
});

// ---------------------------------------------------------------- Solutions de référence (mode test)

const SOLUTIONS = {
  1: `function solve() {
    let dx = Gates[0].x, dz = Gates[0].z;
    while (dx !== 0 || dz !== 0) {
      const sx = Math.sign(dx), sz = Math.sign(dz);
      move(sx, sz);
      dx -= sx; dz -= sz;
    }
  }`,
  // Navigation réactive : on garde la direction tant que ça avance, sinon on essaie d'autres directions.
  nav: `async function solve() {
    const key = (d) => d[0] + ',' + d[1];
    const tried = new Set();
    let heading = null, guard = 0;
    while (!Gates[0].passed && guard++ < 400) {
      const g = Gates[0];
      const sx = Math.sign(g.x), sz = Math.sign(g.z);
      const here = Gates[0].x + ',' + Gates[0].z;
      let cands = [];
      if (heading && !(heading[0] !== 0 && g.x === 0) && !(heading[1] !== 0 && g.z === 0)) cands.push(heading);
      cands.push([sx, sz], [sx, 0], [0, sz], [1, 0], [-1, 0], [0, 1], [0, -1]);
      cands = cands.filter((d) => (d[0] || d[1]) && !tried.has(here + '|' + key(d)) && !(heading && d[0] === -heading[0] && d[1] === -heading[1]));
      const d = cands[0];
      await move(d[0], d[1]);
      if ((Gates[0].x + ',' + Gates[0].z) !== here) heading = d; else tried.add(here + '|' + key(d));
    }
  }`,
  5: `function solve() {
    const g = Gates[0];
    fire(1, 0, 0);
    let dx = g.x, dz = g.z;
    for (let i = 0; i < 6; i++) { move(1, 0); dx--; }
    while (dx !== 0 || dz !== 0) {
      const sx = Math.sign(dx), sz = Math.sign(dz);
      move(sx, sz);
      dx -= sx; dz -= sz;
    }
  }`,
  6: `function solve() {
    const n = BulletsCount;
    for (let i = 0; i < n; i++) fire(1, 0, 0);
    for (let i = 0; i < 12; i++) move(1, 0);
  }`,
  7: `function solve() {
    const cible = [[1,0,0],[2,0,0],[-1,0,0],[-2,0,0],[0,0,1],[0,0,2],[0,0,-1],[0,0,-2]];
    const paires = [];
    CubesOffsets.forEach((c, i) => paires.push(i, cible[i]));
    moveYellow(...paires);
  }`,
  8: `async function solve() {
    let p = Scanner.find((e) => e.type === 'violet').coordinates[0];
    const sz = Math.sign(p[1]);
    for (let i = 0; i < Math.abs(p[1]); i++) await move(0, sz);
    p = Scanner.find((e) => e.type === 'violet').coordinates[0];
    const sx = Math.sign(p[0]);
    moveYellow(0, [sx, 0, 0], 1, [sx, 1, 0]);
    move(sx, 0);
  }`,
};

for (const [level, key] of [[1, 1], [2, 'nav'], [3, 'nav'], [5, 5], [6, 6], [7, 7], [8, 8]]) {
  test(`mode test : la solution de référence réussit tous les tests du niveau ${level}`, async () => {
    const results = await runAllLevelTests(level, SOLUTIONS[key]);
    for (const r of results) assert.equal(r.ok, true, `niveau ${level} / ${r.name} : ${r.reason} (${r.ticks} ticks)`);
  });
}

test('niveau 9 : une séquence de tirs bien chronométrée détruit tous les violets', () => {
  for (const t of levelTests(9)) {
    const replay = (cmds) => {
      const g = new Game({ level: 9, test: t.index });
      for (const c of cmds) { g.enqueue(c); g.tick(); }
      return g;
    };
    const FIRE = [0, 0, [0, 0, 1]], WAIT = [0, 0];
    const cmds = [];
    let g = replay(cmds);
    for (let i = 0; i < 300 && g.state === 'playing'; i++) {
      const base = g.progress.purples;
      const tryFire = replay([...cmds, FIRE, WAIT, WAIT, WAIT]);
      cmds.push(tryFire.progress.purples > base ? FIRE : WAIT);
      g = replay(cmds);
    }
    assert.equal(g.state, 'levelcomplete', `${t.name} : ${g.progress.purples} violets détruits en ${cmds.length} ticks`);
  }
});

test('niveau 9 : les violets rebondissent sur les murs', () => {
  const g = new Game({ level: 9 });
  const xs = [];
  for (let i = 0; i < 30; i++) {
    g.enqueue([0, 0]);
    g.tick();
    xs.push([...g.world.cellsOfType(CELL.PURPLE)].find((c) => c.z === 5)?.x);
  }
  assert.ok(Math.min(...xs) >= -6 && Math.max(...xs) <= 6, 'ne traverse jamais les murs');
  assert.ok(xs.some((x, i) => i > 1 && x > xs[i - 1]), 'repart vers la droite après le rebond');
});

test('niveau 10 : 4 portes, seuls les violets marqués rebondissent, tirage fixe par graine', () => {
  const layout = (t) => {
    const g = new Game({ level: 10, test: t, seed: 999 });
    return JSON.stringify([...g.world.cellsOfType(CELL.PURPLE), ...g.world.cellsOfType(CELL.YELLOW)].map((c) => [c.x, c.z]).sort());
  };
  assert.equal(layout(0), layout(0));
  assert.notEqual(layout(0), layout(1));
  const g = new Game({ level: 10 });
  assert.equal(g.gates.length, 4);
  assert.equal(g.purpleDirs.size, 2);
  const before = [...g.world.cellsOfType(CELL.PURPLE)].filter((c) => !(c.z === 1 && c.x >= 14)).map((c) => `${c.x},${c.z}`).sort().join('|');
  for (let i = 0; i < 40; i++) { g.enqueue([0, 0]); g.tick(); }
  const after = [...g.world.cellsOfType(CELL.PURPLE)].filter((c) => !(c.z === 1 && c.x >= 14)).map((c) => `${c.x},${c.z}`).sort().join('|');
  assert.equal(before, after, 'les violets non marqués ne bougent pas');
  const lane = [...g.world.cellsOfType(CELL.PURPLE)].filter((c) => c.z === 1 && c.x >= 14);
  assert.equal(lane.length, 2);
  assert.ok(lane.every((c) => c.x >= 14 && c.x <= 20), 'les rebondissants restent dans leur allée');
});

test('mode test en direct : réussir un niveau ne passe pas au suivant', () => {
  const g = new Game({ level: 1 });
  g.jumpToLevel(1, 0, { testMode: true });
  g.progress.gates = 99;
  g.tick();
  assert.equal(g.state, 'levelcomplete');
  for (let i = 0; i < 20; i++) g.tick();
  assert.equal(g.level.n, 1);
  assert.equal(g.state, 'levelcomplete');
});

test('mode test : une fonction qui ne fait rien échoue, une erreur est signalée', async () => {
  const r = await runLevelTest(1, 0, 'function solve() {}');
  assert.equal(r.ok, false);
  const e = await runLevelTest(1, 0, 'function solve() { inconnu(); }');
  assert.equal(e.ok, false);
  assert.match(e.reason, /Erreur dans ta fonction/);
  const s = await runLevelTest(1, 0, 'oups');
  assert.match(s.reason, /Fonction invalide/);
});

test('mode test : le budget de pas impose le chemin le plus court', async () => {
  const slow = `function solve() {
    let dx = Gates[0].x, dz = Gates[0].z;
    while (dx !== 0) { const s = Math.sign(dx); move(s, 0); dx -= s; }
    while (dz !== 0) { const s = Math.sign(dz); move(0, s); dz -= s; }
  }`;
  const idx = levelTests(1).find((t) => /minimal/.test(t.name)).index;
  assert.ok(tickBudget(1, idx) < 20);
  assert.equal((await runLevelTest(1, idx, slow)).ok, false);
  assert.equal((await runLevelTest(1, idx, SOLUTIONS[1])).ok, true);
  assert.equal((await runLevelTest(1, 0, slow)).ok, true, 'sans budget, le trajet lent passe');
});

test('mode test : les réussites sont sauvegardées et jamais effacées', () => {
  const storage = memoryStorage();
  recordResults(2, [{ index: 0, ok: true }, { index: 1, ok: false }], storage);
  recordResults(2, [{ index: 1, ok: true }, { index: 0, ok: false }], storage);
  const p = loadProgress(storage);
  assert.equal(passedCount(p, 2), 2);
  assert.equal(passedCount(p, 3), 0);
  assert.deepEqual(loadProgress(null), {});
});
