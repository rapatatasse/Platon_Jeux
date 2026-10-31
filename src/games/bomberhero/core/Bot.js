import { FLOOR, WALL, VOID, BLOCK, CHEST, DIRS } from './grid.js';

const key = (x, y) => `${x},${y}`;
const MARGIN_BEFORE = 0.2;
const MARGIN_AFTER = 0.3;
const RISKY_WITHIN = 3.5;
const MAX_STEPS = 40;
const POWER_RANGE = { ice: 7, push: 5, fire: 5, ray: 30 };

/**
 * Joueur contrôlé par l'ordinateur (logique pure, aucun DOM). Il joue comme un humain : il appelle
 * `game.setInput / placeBomb / usePower` à intervalles réguliers.
 * Priorités : fuir le danger (sortilèges, flammes, sol qui s'effondre) > utiliser son pouvoir >
 * lancer un sortilège utile et sûr (il doit pouvoir s'échapper) > ramasser > chercher un adversaire ou un mur à briser.
 */
export class Bot {
  /**
   * Niveau (voir BOT_LEVELS) : think = délai de réaction (s), speed = vitesse relative, blunder = chance par seconde de
   * partir au hasard, bombDelay / powerDelay = temps d'attente avant de relancer un sortilège / d'utiliser un pouvoir.
   * Par défaut : le niveau le plus fort.
   */
  constructor(game, id, { think = 0.05, speed = 1, blunder = 0, bombDelay = 0, powerDelay = 0 } = {}) {
    this.game = game;
    this.id = id;
    this.think = think;
    this.opts = { speed, blunder, bombDelay, powerDelay };
    this.timer = game.rng() * think;
    this.danger = new Map();
    this.bombReady = 0;
    this.powerSince = 0;
    this.wanderUntil = 0;
    this.wanderDir = null;
  }

  /**
   * Le robot décide à chaque arrivée sur une case (jamais avec une consigne périmée, ce qui le faisait dépasser sa
   * cible puis revenir) et au rythme de son délai de réaction le reste du temps.
   */
  update(dt) {
    const g = this.game, p = g.players[this.id];
    p.speedScale = this.opts.speed;
    const moving = p.tx !== p.x || p.ty !== p.y;
    if (this.wasMoving && !moving) this.timer = 0;
    this.wasMoving = moving;
    if (moving && !p.forced && (p.intent.dx || p.intent.dy) && this.issued) g.setInput(this.id, 0, 0);
    this.issued = false;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.think * (0.7 + g.rng() * 0.6);
    this.decide();
    this.issued = true;
  }

  // ───────────── Danger ─────────────
  blast(x, y, range) {
    const g = this.game, cells = [{ x, y }];
    for (const { dx, dy } of DIRS) {
      for (let i = 1; i <= range; i++) {
        const cx = x + dx * i, cy = y + dy * i, t = g.cell(cx, cy);
        if (t === WALL) break;
        if (t === VOID) continue;
        cells.push({ x: cx, y: cy, solid: t !== FLOOR });
        if (t !== FLOOR || g.bombAt(cx, cy)) break;
      }
    }
    return cells;
  }

  buildDanger() {
    const g = this.game, danger = new Map(), flame = g.cfg.flame.duration;
    const add = (c, a, b) => {
      const k = key(c.x, c.y);
      if (!danger.has(k)) danger.set(k, []);
      danger.get(k).push([a, b]);
    };
    const blasts = g.bombs.map((b) => ({ b, cell: g.bombCell(b), time: b.fuse }));
    blasts.forEach((o) => { o.cells = this.blast(o.cell.x, o.cell.y, o.b.range); });
    for (let pass = 0; pass < blasts.length; pass++) {
      blasts.forEach((a) => blasts.forEach((o) => {
        if (o !== a && a.cells.some((c) => c.x === o.cell.x && c.y === o.cell.y)) o.time = Math.min(o.time, a.time);
      }));
    }
    blasts.forEach((o) => o.cells.forEach((c) => add(c, Math.max(0, o.time), Math.max(0, o.time) + flame)));
    g.flames.forEach((f) => add(f, Math.max(0, f.delay || 0), Math.max(0, f.delay || 0) + f.t));
    const at = g.cfg.suddenDeathAt, lead = Math.max(0, at - g.time);
    if (at && lead < 5) g.closingPreview(14).forEach(([x, y], i) => add({ x, y }, lead + i * g.cfg.suddenDeathStep, 999));
    return danger;
  }

  unsafe(x, y, at, extra = null) {
    const hit = (list) => list?.some(([a, b]) => at + MARGIN_AFTER > a && at - MARGIN_BEFORE < b);
    return hit(this.danger.get(key(x, y))) || hit(extra?.get(key(x, y)));
  }

  risky(x, y, extra = null) {
    const near = (list) => list?.some(([a]) => a < RISKY_WITHIN);
    return near(this.danger.get(key(x, y))) || near(extra?.get(key(x, y)));
  }

  // ───────────── Recherche de chemin ─────────────
  /** Parcours en largeur ; `goal(cell)` → premier but atteint, sinon (avec `rank`) la case la mieux classée. */
  search(start, t0, speed, { goal = null, rank = null, extra = null, maxSteps = MAX_STEPS, avoidRisky = false }) {
    const g = this.game;
    const seen = new Set([key(start.x, start.y)]);
    let queue = [{ x: start.x, y: start.y, steps: 0, dir: null }];
    let best = rank ? { r: rank({ x: start.x, y: start.y, steps: 0 }), dir: null, steps: 0, cell: start } : null;
    if (goal?.(start)) return { dir: null, steps: 0, cell: start };
    while (queue.length) {
      const next = [];
      for (const n of queue) {
        for (const d of DIRS) {
          const x = n.x + d.dx, y = n.y + d.dy, k = key(x, y);
          if (seen.has(k) || g.cell(x, y) !== FLOOR || g.bombAt(x, y)) continue;
          seen.add(k);
          if (avoidRisky && this.risky(x, y)) continue;
          if (this.unsafe(x, y, t0 + (n.steps + 1) / speed, extra)) continue;
          const node = { x, y, steps: n.steps + 1, dir: n.dir ?? d };
          if (goal?.(node)) return { dir: node.dir, steps: node.steps, cell: node };
          if (rank) {
            const r = rank(node);
            if (!best || r < best.r) best = { r, dir: node.dir, steps: node.steps, cell: node };
          }
          if (node.steps < maxSteps) next.push(node);
        }
      }
      queue = next;
    }
    return best;
  }

  // ───────────── Décision ─────────────
  go(dir) {
    this.game.setInput(this.id, dir?.dx ?? 0, dir?.dy ?? 0);
  }

  enemies(p) {
    return this.game.players.filter((q) => q.alive && q !== p);
  }

  decide() {
    const g = this.game, p = g.players[this.id];
    if (!p.alive || g.state !== 'playing') return this.go(null);
    if (p.forced || p.frozen > 0) return undefined;
    this.danger = this.buildDanger();
    const speed = g.speedOf(p);
    const moving = p.tx !== p.x || p.ty !== p.y;
    const here = moving ? { x: p.tx, y: p.ty } : { x: p.x, y: p.y };
    const t0 = moving ? (1 - p.prog) / speed : 0;

    if (moving && this.unsafe(here.x, here.y, t0) && !this.unsafe(p.x, p.y, p.prog / speed)) {
      return this.go({ dx: p.x - p.tx, dy: p.y - p.ty });
    }
    if (this.risky(here.x, here.y)) return this.flee(p, here, t0, speed);
    if (g.time < this.wanderUntil) return this.go(this.wanderDir);
    if (!moving && this.tryPower(p, here)) return undefined;
    if (!moving && this.tryBomb(p, here, speed)) return undefined;
    if (this.opts.blunder && !moving && g.rng() < this.opts.blunder * this.think) return this.startWander(here, speed);
    return this.go(this.explore(p, here, t0, speed, moving)?.dir);
  }

  /** Étourderie : part au hasard dans une direction sans danger pendant un court instant. */
  startWander(here, speed) {
    const g = this.game;
    const options = DIRS.filter((d) => g.cell(here.x + d.dx, here.y + d.dy) === FLOOR && !g.bombAt(here.x + d.dx, here.y + d.dy) && !this.risky(here.x + d.dx, here.y + d.dy) && !this.unsafe(here.x + d.dx, here.y + d.dy, 1 / speed));
    if (!options.length) return undefined;
    this.wanderDir = options[Math.floor(g.rng() * options.length)];
    this.wanderUntil = g.time + 0.4 + g.rng() * 0.6;
    return this.go(this.wanderDir);
  }

  flee(p, here, t0, speed) {
    if (p.power === 'haste') this.game.usePower(this.id);
    const route = this.search(here, t0, speed, { goal: (c) => !this.risky(c.x, c.y) });
    if (route) return this.go(route.dir);
    const g = this.game;
    const options = DIRS.filter((d) => g.cell(here.x + d.dx, here.y + d.dy) === FLOOR && !g.bombAt(here.x + d.dx, here.y + d.dy) && !this.unsafe(here.x + d.dx, here.y + d.dy, t0 + 1 / speed));
    return this.go(options[0] ?? null);
  }

  lineClear(a, b) {
    const g = this.game, dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
    for (let x = a.x + dx, y = a.y + dy; x !== b.x || y !== b.y; x += dx, y += dy) {
      if (g.cell(x, y) !== FLOOR || g.bombAt(x, y)) return false;
    }
    return true;
  }

  tryPower(p, here) {
    const g = this.game, power = p.power;
    if (!power) { this.powerSince = 0; return false; }
    this.powerSince ||= g.time;
    if (g.time - this.powerSince < this.opts.powerDelay) return false;
    const foes = this.enemies(p).map((q) => g.cellOf(q));
    if (power === 'haste') return g.usePower(this.id);
    if (power === 'slow') return foes.some((c) => Math.abs(c.x - here.x) + Math.abs(c.y - here.y) <= 8) && g.usePower(this.id);
    for (const c of foes) {
      const dist = Math.abs(c.x - here.x) + Math.abs(c.y - here.y);
      if ((c.x !== here.x && c.y !== here.y) || dist === 0 || dist > POWER_RANGE[power] || !this.lineClear(here, c)) continue;
      g.setInput(this.id, Math.sign(c.x - here.x), Math.sign(c.y - here.y));
      return g.usePower(this.id);
    }
    return false;
  }

  hits(cell, p) {
    const cells = this.blast(cell.x, cell.y, p.range);
    const foes = this.enemies(p).map((q) => this.game.cellOf(q));
    return {
      enemy: cells.some((c) => foes.some((f) => f.x === c.x && f.y === c.y)),
      block: cells.some((c) => c.solid),
      cells,
    };
  }

  /** Peut-on lancer un sortilège ici puis s'échapper de sa zone avant qu'il n'explose ? */
  escapable(cell, p, speed, hits = this.hits(cell, p)) {
    const g = this.game, fuse = g.cfg.bomb.fuse;
    const extra = new Map();
    hits.cells.forEach((c) => extra.set(key(c.x, c.y), [[fuse, fuse + g.cfg.flame.duration]]));
    const out = this.search(cell, 0, speed, { goal: (c) => !extra.has(key(c.x, c.y)) && !this.risky(c.x, c.y), extra, maxSteps: 12 });
    return !!out && out.steps / speed + 0.25 + this.think * 2 <= fuse;
  }

  /** Case d'où un sortilège toucherait un adversaire (kind = 'enemy') ou un mur à briser ('block'), avec une retraite possible. */
  spot(c, p, speed, kind, allowStart) {
    if (!(c.steps > 0 || allowStart)) return false;
    const h = this.hits(c, p);
    return h[kind] && this.escapable(c, p, speed, h);
  }

  tryBomb(p, here, speed) {
    const g = this.game;
    if (g.time < this.bombReady || g.bombs.filter((b) => b.owner === this.id).length >= p.bombsMax || g.bombAt(here.x, here.y)) return false;
    const h = this.hits(here, p);
    if ((!h.enemy && !h.block) || !this.escapable(here, p, speed, h)) return false;
    const placed = g.placeBomb(this.id);
    if (placed) this.bombReady = g.time + this.opts.bombDelay * (0.7 + g.rng() * 0.6);
    return placed;
  }

  /** `moving` : on planifie depuis la case d'arrivée, qui peut donc déjà être le but (sinon demi-tours incessants). */
  explore(p, here, t0, speed, moving) {
    const g = this.game;
    const foes = this.enemies(p).map((q) => g.cellOf(q));
    const dist = (c, o) => Math.abs(c.x - o.x) + Math.abs(c.y - o.y);
    const at = g.cfg.suddenDeathAt;
    if (at && g.time >= at - 4) {
      const mid = { x: (g.width - 1) / 2, y: (g.height - 1) / 2 };
      return this.search(here, t0, speed, { rank: (c) => dist(c, mid), avoidRisky: true });
    }
    const item = this.search(here, t0, speed, { goal: (c) => g.items.has(key(c.x, c.y)), maxSteps: 8, avoidRisky: true });
    if (item) return item;
    const stay = moving || g.time < this.bombReady;   // déjà au bon endroit et en attente : on ne bouge pas
    const canBomb = g.bombs.filter((b) => b.owner === this.id).length < p.bombsMax;
    if (canBomb) {
      const foe = this.search(here, t0, speed, { goal: (c) => this.spot(c, p, speed, 'enemy', stay), avoidRisky: true });
      if (foe) return foe;
      const wall = this.search(here, t0, speed, { goal: (c) => this.spot(c, p, speed, 'block', stay), avoidRisky: true });
      if (wall) return wall;
    }
    if (!foes.length) return null;
    const nearest = foes.reduce((a, b) => (dist(a, here) <= dist(b, here) ? a : b));
    return this.search(here, t0, speed, { rank: (c) => dist(c, nearest), avoidRisky: true });
  }
}
