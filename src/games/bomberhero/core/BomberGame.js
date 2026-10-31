import { Emitter } from '../../../shared/events.js';
import { FLOOR, WALL, CHEST, VOID, LAYOUT_IDS, generateMap, spawnPoints, spiralOrder } from './grid.js';
import { POWER_IDS } from '../config.js';

const BONUS_KINDS = ['bomb', 'range', 'speed'];

/**
 * Logique pure de Bomber Hero (aucun DOM, aucun rendu). Évènements émis :
 *  roundStart, bombPlaced {bomb, player}, explosion {bomb, cells}, blockDestroyed {x, y, kind},
 *  itemSpawned {item}, itemPicked {player, item}, itemDestroyed {item}, powerUsed {player, power, cells, hit},
 *  playerFrozen {player}, playerDied {player, x, y}, closing {x, y}, roundEnd {winner, wins}, matchEnd {winner}.
 * Repère : x vers la droite, y vers le bas, centre d'une case = coordonnées entières.
 */
export class BomberGame extends Emitter {
  constructor({ config, playerCount = 2, rng = Math.random }) {
    super();
    this.cfg = config;
    this.rng = rng;
    this.width = config.width;
    this.height = config.height;
    this.playerCount = playerCount;
    this.wins = new Array(playerCount).fill(0);
    this.matchWinner = null;
    this.round = 0;
    this.startRound();
  }

  // ───────────── Manche ─────────────
  startRound() {
    const c = this.cfg;
    this.round++;
    this.layoutId = c.layout === 'random' ? LAYOUT_IDS[Math.floor(this.rng() * LAYOUT_IDS.length)] : (c.layout ?? 'classique');
    this.cells = generateMap(c, this.rng, this.layoutId);
    this.bombs = [];
    this.flames = [];
    this.items = new Map();
    this.time = 0;
    this.state = 'playing';
    this.endTimer = 0;
    this.winner = null;
    this.closingQueue = spiralOrder(this.width, this.height);
    this.closingTimer = 0;
    this.nextBombId = 1;
    const spawns = spawnPoints(this.width, this.height, this.layoutId);
    this.players = Array.from({ length: this.playerCount }, (_, i) => {
      const s = spawns[i];
      return {
        id: i, x: s.x, y: s.y, tx: s.x, ty: s.y, prog: 0, dir: { dx: s.dx, dy: s.dy }, intent: { dx: 0, dy: 0 },
        alive: true, frozen: 0, slowT: 0, hasteT: 0, forced: null, power: null,
        bombsMax: c.player.bombs, range: c.player.range, speed: c.player.speed,
      };
    });
    this.emit('roundStart', { round: this.round, layout: this.layoutId });
  }

  // ───────────── Accès ─────────────
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  cell(x, y) { return this.inBounds(x, y) ? this.cells[y * this.width + x] : WALL; }
  setCell(x, y, t) { this.cells[y * this.width + x] = t; }
  cellOf(p) { return p.prog >= 0.5 ? { x: p.tx, y: p.ty } : { x: p.x, y: p.y }; }
  pos(p) { return { x: p.x + (p.tx - p.x) * p.prog, y: p.y + (p.ty - p.y) * p.prog }; }
  bombCell(b) { return b.prog >= 0.5 ? { x: b.tx, y: b.ty } : { x: b.x, y: b.y }; }
  bombAt(x, y) { return this.bombs.find((b) => (b.x === x && b.y === y) || (b.slide && b.tx === x && b.ty === y)); }
  /** Flamme sur la case ? `except` : joueur épargné par ses propres pouvoirs (rayon, flamme) ; son sortilège posé, lui, peut le tuer. */
  flameAt(x, y, except = null) { return this.flames.some((f) => f.x === x && f.y === y && !(f.delay > 0) && (f.kind === 'fire' || f.owner !== except)); }
  /** Case qui peut encore s'effondrer : ni déjà vide, ni mur de la forme de la carte (les piliers, eux, s'effondrent). */
  collapsible(x, y) {
    const t = this.cell(x, y);
    return t !== VOID && (t !== WALL || (x % 2 === 0 && y % 2 === 0));
  }

  /** Les `n` prochaines cases qui vont s'effondrer. */
  closingPreview(n) {
    const out = [];
    for (const [x, y] of this.closingQueue) {
      if (this.collapsible(x, y)) out.push([x, y]);
      if (out.length >= n) break;
    }
    return out;
  }

  get closingNext() { return this.time >= this.cfg.suddenDeathAt && this.cfg.suddenDeathAt ? this.closingPreview(3) : []; }
  playerAt(x, y, except = null) {
    return this.players.find((p) => {
      if (!p.alive || p === except) return false;
      const c = this.cellOf(p);
      return c.x === x && c.y === y;
    });
  }
  get alivePlayers() { return this.players.filter((p) => p.alive); }
  speedOf(p) {
    const pw = this.cfg.powers;
    if (p.forced) return pw.push.force;
    return p.speed * (p.speedScale ?? 1) * (p.hasteT > 0 ? pw.haste.factor : 1) * (p.slowT > 0 ? pw.slow.factor : 1);
  }

  // ───────────── Entrées ─────────────
  setInput(id, dx, dy) {
    const p = this.players[id];
    if (!p) return;
    if (dx !== 0) dy = 0;
    p.intent = { dx, dy };
    if ((dx || dy) && p.alive && !p.frozen) p.dir = { dx, dy };
  }

  placeBomb(id) {
    const p = this.players[id];
    if (!p?.alive || p.frozen > 0 || this.state !== 'playing') return false;
    const { x, y } = this.cellOf(p);
    if (this.bombAt(x, y) || this.bombs.filter((b) => b.owner === id).length >= p.bombsMax) return false;
    const walkers = new Set(this.players.filter((q) => {
      const c = this.cellOf(q);
      return q.alive && c.x === x && c.y === y;
    }).map((q) => q.id));
    const bomb = { id: this.nextBombId++, x, y, tx: x, ty: y, prog: 0, slide: null, owner: id, range: p.range, fuse: this.cfg.bomb.fuse, walkers };
    this.bombs.push(bomb);
    this.emit('bombPlaced', { bomb, player: id });
    return true;
  }

  usePower(id) {
    const p = this.players[id];
    if (!p?.alive || p.frozen > 0 || !p.power || this.state !== 'playing') return false;
    const power = p.power;
    const { x, y } = this.cellOf(p);
    const { dx, dy } = p.dir;
    const pw = this.cfg.powers;
    const cells = [];
    let hit = null;
    p.power = null;
    if (power === 'ice') {
      for (let i = 1; i <= pw.ice.range; i++) {
        const cx = x + dx * i, cy = y + dy * i;
        if (this.cell(cx, cy) !== FLOOR || this.bombAt(cx, cy)) break;
        cells.push({ x: cx, y: cy });
        const t = this.playerAt(cx, cy, p);
        if (t) {
          t.frozen = pw.ice.freeze; t.forced = null; hit = t.id;
          this.emit('playerFrozen', { player: t.id });
          break;
        }
      }
    } else if (power === 'push') {
      for (let i = 1; i <= pw.push.range; i++) {
        const cx = x + dx * i, cy = y + dy * i;
        if (this.cell(cx, cy) === WALL) break;
        cells.push({ x: cx, y: cy });
        const b = this.bombAt(cx, cy);
        if (b) { this.pushBomb(b, dx, dy); hit = { bomb: b.id }; break; }
        const t = this.playerAt(cx, cy, p);
        if (t) { t.forced = { dx, dy, left: pw.push.slide }; hit = t.id; break; }
        if (this.cell(cx, cy) !== FLOOR) break;
      }
    } else if (power === 'ray') {
      for (let i = 1; i < Math.max(this.width, this.height); i++) {
        const cx = x + dx * i, cy = y + dy * i;
        const t = this.cell(cx, cy);
        if (t === WALL) break;
        cells.push({ x: cx, y: cy });
        if (t === VOID) continue;
        this.flames.push({ x: cx, y: cy, t: pw.ray.flame, total: pw.ray.flame, kind: 'ray', owner: id });
        if (t !== FLOOR) { this.destroyBlock(cx, cy); break; }
      }
    } else if (power === 'fire') {
      for (let i = 1; i <= pw.fire.range; i++) {
        const cx = x + dx * i, cy = y + dy * i;
        if (this.cell(cx, cy) !== FLOOR) break;
        cells.push({ x: cx, y: cy });
        this.flames.push({ x: cx, y: cy, t: pw.fire.duration, total: pw.fire.duration, kind: 'blaze', owner: id, delay: i * pw.fire.delay });
      }
    } else if (power === 'slow') {
      this.players.forEach((q) => { if (q !== p && q.alive) q.slowT = pw.slow.duration; });
    } else if (power === 'haste') {
      p.hasteT = pw.haste.duration;
    }
    this.emit('powerUsed', { player: id, power, from: { x, y }, dir: { dx, dy }, cells, hit });
    return true;
  }

  pushBomb(b, dx, dy) {
    if (b.slide) return;
    const nx = b.x + dx, ny = b.y + dy;
    if (!this.bombCanEnter(nx, ny)) return;
    b.slide = { dx, dy };
    b.tx = nx; b.ty = ny; b.prog = 0;
    b.walkers.clear();
  }

  bombCanEnter(x, y) {
    return this.cell(x, y) === FLOOR && !this.bombAt(x, y) && !this.playerAt(x, y);
  }

  // ───────────── Boucle ─────────────
  update(dt) {
    if (this.state === 'over' || this.state === 'roundOver') return;
    if (this.state === 'playing') this.time += dt;
    this.players.forEach((p) => {
      if (!p.alive) return;
      p.frozen = Math.max(0, p.frozen - dt);
      p.slowT = Math.max(0, p.slowT - dt);
      p.hasteT = Math.max(0, p.hasteT - dt);
      this.movePlayer(p, dt);
    });
    this.updateBombs(dt);
    this.flames.forEach((f) => { if (f.delay > 0) f.delay -= dt; else f.t -= dt; });
    this.flames = this.flames.filter((f) => f.t > 0);
    this.bombs.forEach((b) => {
      const c = this.bombCell(b);
      if (this.flameAt(c.x, c.y)) b.fuse = Math.min(b.fuse, 0);
    });
    this.explodeDue();
    this.players.forEach((p) => {
      if (!p.alive) return;
      const c = this.cellOf(p);
      if (this.cell(c.x, c.y) === VOID) this.kill(p, 'fall');
      else if (this.flameAt(c.x, c.y, p.id)) this.kill(p);
      else this.pickUp(p, c);
    });
    if (this.state === 'playing') this.updateClosing(dt);
    this.checkEnd(dt);
  }

  movePlayer(p, dt) {
    let budget = dt * this.speedOf(p);
    const frozen = p.frozen > 0 && !p.forced;
    for (let guard = 0; budget > 1e-9 && guard < 8; guard++) {
      if (p.tx !== p.x || p.ty !== p.y) {
        const mdx = p.tx - p.x, mdy = p.ty - p.y;
        if (!p.forced && !frozen && p.intent.dx === -mdx && p.intent.dy === -mdy) {
          [p.x, p.tx, p.y, p.ty] = [p.tx, p.x, p.ty, p.y];
          p.prog = 1 - p.prog;
        }
        const step = Math.min(budget, 1 - p.prog);
        p.prog += step;
        budget -= step;
        if (p.prog < 1 - 1e-9) break;
        p.x = p.tx; p.y = p.ty; p.prog = 0;
        if (p.forced && --p.forced.left <= 0) p.forced = null;
      } else {
        const d = p.forced || (frozen ? null : p.intent);
        if (!d || (!d.dx && !d.dy)) break;
        const nx = p.x + d.dx, ny = p.y + d.dy;
        if (!this.canEnter(p, nx, ny)) { p.forced = null; break; }
        p.tx = nx; p.ty = ny; p.prog = 0;
        if (!p.forced) p.dir = { dx: d.dx, dy: d.dy };
      }
    }
    const c = this.cellOf(p);
    this.bombs.forEach((b) => {
      if (b.walkers.has(p.id) && (b.x !== c.x || b.y !== c.y)) b.walkers.delete(p.id);
    });
  }

  canEnter(p, x, y) {
    const t = this.cell(x, y);
    if (t !== FLOOR && t !== VOID) return false;
    const b = this.bombAt(x, y);
    return !b || b.walkers.has(p.id);
  }

  updateBombs(dt) {
    for (const b of this.bombs) {
      b.fuse -= dt;
      if (!b.slide) continue;
      b.prog += dt * this.cfg.bomb.slideSpeed;
      while (b.slide && b.prog >= 1) {
        b.x = b.tx; b.y = b.ty; b.prog -= 1;
        const nx = b.x + b.slide.dx, ny = b.y + b.slide.dy;
        if (this.bombCanEnter(nx, ny)) { b.tx = nx; b.ty = ny; } else { b.slide = null; b.tx = b.x; b.ty = b.y; b.prog = 0; }
      }
    }
  }

  explodeDue() {
    for (let guard = 0; guard < 64; guard++) {
      const b = this.bombs.find((q) => q.fuse <= 0);
      if (!b) return;
      this.explode(b);
    }
  }

  explode(b) {
    this.bombs = this.bombs.filter((q) => q !== b);
    const origin = this.bombCell(b);
    const total = this.cfg.flame.duration;
    const cells = [{ x: origin.x, y: origin.y, arm: 'center', dx: 0, dy: 0 }];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let i = 1; i <= b.range; i++) {
        const x = origin.x + dx * i, y = origin.y + dy * i;
        const t = this.cell(x, y);
        if (t === WALL) break;
        if (t === VOID) continue;
        const cut = t !== FLOOR || this.bombAt(x, y);
        cells.push({ x, y, arm: i === b.range || cut ? 'end' : 'mid', dx, dy });
        if (t !== FLOOR) { this.destroyBlock(x, y); break; }
        if (cut) break;
      }
    }
    cells.forEach((c) => {
      this.flames.push({ x: c.x, y: c.y, t: total, total, kind: 'fire', owner: b.owner });
      const item = this.items.get(`${c.x},${c.y}`);
      if (item && !item.fresh) {
        this.items.delete(`${c.x},${c.y}`);
        this.emit('itemDestroyed', { item });
      }
    });
    this.items.forEach((it) => { it.fresh = false; });
    this.emit('explosion', { bomb: b, cells });
  }

  destroyBlock(x, y) {
    const kind = this.cell(x, y);
    this.setCell(x, y, FLOOR);
    this.emit('blockDestroyed', { x, y, kind });
    let item = null;
    if (kind === CHEST) item = { x, y, kind: 'power', power: POWER_IDS[Math.floor(this.rng() * POWER_IDS.length)] };
    else if (this.rng() < this.cfg.bonusChance) item = { x, y, kind: BONUS_KINDS[Math.floor(this.rng() * BONUS_KINDS.length)] };
    if (!item) return;
    item.fresh = true;
    this.items.set(`${x},${y}`, item);
    this.emit('itemSpawned', { item });
  }

  pickUp(p, c) {
    const key = `${c.x},${c.y}`;
    const item = this.items.get(key);
    if (!item) return;
    this.items.delete(key);
    const pl = this.cfg.player;
    if (item.kind === 'bomb') p.bombsMax = Math.min(pl.maxBombs, p.bombsMax + 1);
    else if (item.kind === 'range') p.range = Math.min(pl.maxRange, p.range + 1);
    else if (item.kind === 'speed') p.speed = Math.min(pl.maxSpeed, p.speed + pl.speedBonus);
    else if (item.kind === 'power') p.power = item.power;
    this.emit('itemPicked', { player: p.id, item });
  }

  kill(p, cause = 'fire') {
    if (!p.alive) return;
    p.alive = false;
    p.forced = null;
    const pos = this.pos(p);
    this.emit('playerDied', { player: p.id, x: pos.x, y: pos.y, cause });
  }

  updateClosing(dt) {
    const at = this.cfg.suddenDeathAt;
    if (!at || this.time < at) return;
    this.closingTimer += dt;
    while (this.closingTimer >= this.cfg.suddenDeathStep && this.closingQueue.length) {
      const [x, y] = this.closingQueue.shift();
      if (!this.collapsible(x, y)) continue;
      this.closingTimer -= this.cfg.suddenDeathStep;
      this.setCell(x, y, VOID);
      this.bombs = this.bombs.filter((b) => !(b.x === x && b.y === y && !b.slide));
      this.flames = this.flames.filter((f) => !(f.x === x && f.y === y));
      this.items.delete(`${x},${y}`);
      this.players.forEach((p) => {
        const c = this.cellOf(p);
        if (p.alive && c.x === x && c.y === y) this.kill(p, 'fall');
      });
      this.emit('closing', { x, y });
    }
  }

  checkEnd(dt) {
    if (this.state === 'playing') {
      if (this.alivePlayers.length > (this.playerCount > 1 ? 1 : 0)) return;
      this.state = 'ending';
      this.endTimer = this.cfg.roundEndDelay;
      this.winner = this.alivePlayers[0]?.id ?? null;
    } else if (this.state === 'ending') {
      this.endTimer -= dt;
      if (this.endTimer > 0) return;
      this.state = 'roundOver';
      this.winner = this.alivePlayers.length === 1 ? this.alivePlayers[0].id : null;
      if (this.winner !== null) this.wins[this.winner]++;
      this.emit('roundEnd', { winner: this.winner, wins: [...this.wins] });
      if (this.winner !== null && this.wins[this.winner] >= this.cfg.roundsToWin) {
        this.matchWinner = this.winner;
        this.state = 'over';
        this.emit('matchEnd', { winner: this.winner });
      }
    }
  }
}
