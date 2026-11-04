import { buildLevel } from '../../src/games/bomberhero/core/adventure.js';
import { BomberGame } from '../../src/games/bomberhero/core/BomberGame.js';
import { GAME } from '../../src/games/bomberhero/config.js';
import { solve } from './levelSolver.js';
const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const CFG = { ...GAME, bonusChance: 0, suddenDeathAt: 0 };

/** Joue l'étage avec un héros scripté dans le vrai moteur (sans gardiens) : bombes posées selon le plan du solveur. */
export function autopilot(def, i) {
  const L = buildLevel(def, i);
  const plan = solve(L);
  if (!plan.ok) return { ok: false, why: 'solveur' };
  const level = { ...L, enemies: [], name: def.name };
  const g = new BomberGame({ config: CFG, level, heroCount: 1, rng: () => 0.9 });
  const p = g.players[0];
  const cellP = () => g.cellOf(p);
  const step = (n = 1) => { for (let k = 0; k < n; k++) g.update(1 / 60); };
  const free = (x, y) => g.cell(x, y) === 'floor' && !g.bombAt(x, y);
  const bfs = (from, goal) => {
    const q = [{ x: from.x, y: from.y, path: [] }], seen = new Set([`${from.x},${from.y}`]);
    while (q.length) { const n = q.shift(); if (goal(n)) return n.path; for (const [dx, dy] of D) { const nx = n.x + dx, ny = n.y + dy, k = `${nx},${ny}`; if (seen.has(k) || !free(nx, ny)) continue; seen.add(k); q.push({ x: nx, y: ny, path: [...n.path, [dx, dy]] }); } }
    return null;
  };
  const walk = (path) => {
    for (const [dx, dy] of path) {
      while (p.tx !== p.x || p.ty !== p.y) step();
      const tx = p.x + dx, ty = p.y + dy;
      g.setInput(0, dx, dy);
      for (let k = 0; k < 240 && !(p.x === tx && p.y === ty && p.prog === 0); k++) {
        if (p.prog > 0.7) g.setInput(0, 0, 0);
        step();
        if (p.x === tx && p.y === ty) g.setInput(0, 0, 0);
      }
      g.setInput(0, 0, 0);
      while (p.tx !== p.x || p.ty !== p.y) step();
    }
    g.setInput(0, 0, 0);
  };
  const log = [];
  for (const [bx, by] of plan.plan) {
    const route = bfs(cellP(), (n) => n.x === bx && n.y === by);
    if (!route) return { ok: false, why: `chemin vers (${bx},${by})` };
    walk(route);
    const before = g.bombs.length;
    g.placeBomb(0);
    if (g.bombs.length === before) return { ok: false, why: `pose impossible en (${bx},${by})` };
    const bomb = g.bombs.at(-1);
    // fuite : plus court chemin vers une case hors de la zone de souffle
    const reach = new Set();
    const blast = (x, y, r) => { const s2 = new Set([`${x},${y}`]); for (const [dx, dy] of D) for (let k = 1; k <= r; k++) { const t = g.cell(x + dx * k, y + dy * k); if (t === 'wall') break; s2.add(`${x + dx * k},${y + dy * k}`); if (t !== 'floor') break; } return s2; };
    const zone = blast(bomb.x, bomb.y, bomb.range);
    const esc = bfs(cellP(), (n) => !zone.has(`${n.x},${n.y}`));
    if (!esc) return { ok: false, why: `aucune fuite en (${bx},${by})` };
    walk(esc);
    for (let k = 0; k < 60 * 5 && (g.bombs.length || g.flames.length); k++) step();
    if (!p.alive) return { ok: false, why: `mort en (${bx},${by})` };
    log.push([bx, by]);
  }
  const route = bfs(cellP(), (n) => n.x === g.exit.x && n.y === g.exit.y);
  if (!route) return { ok: false, why: 'porte inaccessible après les bombes' };
  walk(route); step(5);
  return { ok: g.state === 'cleared', bombs: plan.plan.length, state: g.state };
}
