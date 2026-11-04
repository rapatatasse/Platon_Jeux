import { WALL, BLOCK, CHEST, VOID } from '../core/grid.js';
import { POWERS, PLAYERS } from '../config.js';

const T = 48;
const LIFT = 28;
const WALL_H = 26;
const BLOCK_H = 20;
const CHEST_H = 15;
const TAU = Math.PI * 2;

const hash = (x, y, k = 0) => (((x + 7) * 73856093) ^ ((y + 3) * 19349663) ^ (k * 83492791)) >>> 0;
const rand01 = (n) => (n % 1000) / 1000;
const px = (x) => x * T;
const py = (y) => LIFT + y * T;

const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

const BONUS = {
  bomb: { label: 'Bombe +1', color: '#d9d9e6' },
  range: { label: 'Portée +1', color: '#ff9a4a' },
  speed: { label: 'Vitesse +', color: '#9be8b4' },
};

/**
 * Rendu 2D (canvas) de l'arène : château vu de trois quarts, particules, lumières de torches.
 * Ne contient aucune règle : il lit l'état de `game` et écoute ses évènements.
 */
export class Renderer {
  constructor(canvas, { heroes, width, height }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.heroes = heroes;
    this.picks = [];
    this.colors = [];
    this.fx = [];
    this.shake = 0;
    this.now = 0;
    this.face = [];
    this.scratch = document.createElement('canvas');
    this.layout(width, height);
    window.addEventListener('resize', () => this.resize());
  }

  /** Dimensions de l'arène (en cases) : refait le sol, les torches et le cadrage. */
  layout(width, height) {
    this.cols = width;
    this.rows = height;
    this.lw = width * T;
    this.lh = height * T + LIFT;
    this.motes = Array.from({ length: 26 }, (_, i) => ({ x: rand01(hash(i, 1)) * this.lw, y: rand01(hash(i, 2)) * this.lh, s: 0.6 + rand01(hash(i, 3)) * 1.6, v: 4 + rand01(hash(i, 4)) * 8 }));
    this.floor = this.buildFloor();
    const every = (start) => Array.from({ length: Math.ceil(width / 4) }, (_, i) => start + i * 4).filter((x) => x < width - 1);
    this.torches = every(3).flatMap((x) => [[x, 0], [x, height - 1]]);
    this.banners = every(5).filter((x) => x % 8 !== 3).map((x) => [x, 0]);
    this.resize();
  }

  // ───────────── Mise en place ─────────────
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.cw = r.width; this.ch = r.height; this.dpr = dpr;
    this.scale = Math.min(r.width / this.lw, r.height / this.lh) * 0.97;
    this.ox = (r.width - this.lw * this.scale) / 2;
    this.oy = (r.height - this.lh * this.scale) / 2;
  }

  /** Redonne l'état d'une nouvelle manche et branche les effets sur les évènements du jeu. */
  attach(game) {
    if (game.width !== this.cols || game.height !== this.rows) this.layout(game.width, game.height);
    this.game = game;
    this.fx = [];
    this.shake = 0;
    this.face = [];
    game.on('roundStart', () => { this.fx = []; });
    game.on('explosion', ({ cells, bomb }) => this.onExplosion(cells, bomb.owner));
    game.on('blockDestroyed', ({ x, y, kind }) => this.onBlock(x, y, kind));
    game.on('bombPlaced', ({ bomb }) => {
      const c = this.colorOf(bomb.owner), x = px(bomb.x) + T / 2, y = py(bomb.y) + T * 0.75;
      this.burst(x, y, 12, c, 90);
      this.add({ type: 'ring', x, y, life: 0.4, max: 0.4, size: 6, color: c });
    });
    game.on('itemPicked', ({ player, item }) => this.onPick(player, item));
    game.on('itemDestroyed', ({ item }) => this.burst(px(item.x) + T / 2, py(item.y) + T / 2, 8, '#ffb070', 90));
    game.on('powerUsed', (e) => this.onPower(e));
    game.on('playerFrozen', ({ player }) => { const p = game.players[player]; const c = game.pos(p); this.burst(px(c.x) + T / 2, py(c.y) + T / 2, 18, '#bfeaff', 120); });
    game.on('playerDied', ({ player, x, y, cause }) => this.onDeath(player, x, y, cause));
    game.on('closing', ({ x, y }) => {
      this.add({ type: 'tile', x: px(x), y: py(y), life: 0.9, max: 0.9 });
      this.puff(px(x) + T / 2, py(y) + T / 2, 6, '#8a90a2');
      this.shake = Math.max(this.shake, 2);
    });
  }

  buildFloor() {
    const c = document.createElement('canvas');
    c.width = this.lw; c.height = this.lh;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, this.lh);
    bg.addColorStop(0, '#1b1e27'); bg.addColorStop(1, '#14161d');
    g.fillStyle = bg; g.fillRect(0, 0, this.lw, this.lh);
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const n = rand01(hash(x, y));
      const base = (x + y) % 2 ? 44 : 49;
      const v = base + Math.round(n * 7);
      g.fillStyle = `rgb(${v},${v + 4},${v + 14})`;
      g.fillRect(px(x), py(y), T, T);
      g.strokeStyle = 'rgba(10,12,18,0.55)';
      g.lineWidth = 1.2;
      g.strokeRect(px(x) + 0.6, py(y) + 0.6, T - 1.2, T - 1.2);
      g.strokeStyle = 'rgba(255,255,255,0.045)';
      g.beginPath(); g.moveTo(px(x) + 2, py(y) + 2); g.lineTo(px(x) + T - 2, py(y) + 2); g.stroke();
      if (n > 0.72) {
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        const sx = px(x) + 8 + n * 20, sy = py(y) + 6 + rand01(hash(x, y, 5)) * 20;
        g.moveTo(sx, sy); g.lineTo(sx + 8, sy + 5); g.lineTo(sx + 6, sy + 13);
        g.stroke();
      }
    }
    return c;
  }

  // ───────────── Évènements → effets ─────────────
  add(p) { this.fx.push({ vx: 0, vy: 0, g: 0, drag: 0, life: 1, max: 1, size: 3, color: '#fff', type: 'spark', ...p }); }

  burst(x, y, n, color, speed = 140, type = 'spark') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = speed * (0.3 + Math.random() * 0.8);
      const life = 0.35 + Math.random() * 0.5;
      this.add({ type, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: 1.5 + Math.random() * 2.5, color, drag: 2.2 });
    }
  }

  puff(x, y, n, color = '#8a90a2') {
    for (let i = 0; i < n; i++) {
      const life = 0.6 + Math.random() * 0.6;
      this.add({ type: 'smoke', x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 22, vy: -12 - Math.random() * 22, life, max: life, size: 7 + Math.random() * 7, color });
    }
  }

  onExplosion(cells, owner) {
    const c = this.colorOf(owner);
    this.shake = Math.max(this.shake, 6);
    cells.forEach((cell, i) => {
      const x = px(cell.x) + T / 2, y = py(cell.y) + T / 2;
      this.burst(x, y, 7, i % 2 ? c : '#ffffff', 190);
      if (i % 2 === 0) this.puff(x, y, 2, c);
    });
    const o = cells[0];
    this.add({ type: 'ring', x: px(o.x) + T / 2, y: py(o.y) + T / 2, life: 0.4, max: 0.4, size: 10, color: c });
    this.add({ type: 'ring', x: px(o.x) + T / 2, y: py(o.y) + T / 2, life: 0.55, max: 0.55, size: 4, color: '#ffffff' });
  }

  onBlock(x, y, kind) {
    const cx = px(x) + T / 2, cy = py(y) + T / 2;
    const colors = kind === CHEST ? ['#6b4426', '#c9a24a', '#8a5a32'] : ['#b3a285', '#8a7a62', '#6b5d49'];
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * TAU, s = 60 + Math.random() * 130, life = 0.6 + Math.random() * 0.5;
      this.add({ type: 'debris', x: cx, y: cy - 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90, g: 420, life, max: life, size: 3 + Math.random() * 4, color: colors[i % 3], rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12 });
    }
    this.puff(cx, cy, 3, '#b9b2a0');
    if (kind === CHEST) {
      this.burst(cx, cy, 24, '#ffe08a', 170);
      this.add({ type: 'column', x: cx, y: cy, life: 0.9, max: 0.9, size: 18, color: '#ffe08a' });
    }
  }

  onPick(player, item) {
    const p = this.game.players[player];
    const c = this.game.pos(p);
    const x = px(c.x) + T / 2, y = py(c.y);
    const info = item.kind === 'power' ? { label: POWERS[item.power].name, color: POWERS[item.power].color } : BONUS[item.kind];
    this.add({ type: 'text', x, y: y - 6, vy: -34, life: 1.1, max: 1.1, color: info.color, text: info.label, size: 15 });
    this.burst(x, y + 20, 14, info.color, 110);
    this.add({ type: 'ring', x, y: y + 30, life: 0.45, max: 0.45, size: 6, color: info.color });
  }

  onPower({ player, power, from, dir, cells, hit }) {
    const color = POWERS[power].color;
    const cx = (c) => px(c.x) + T / 2, cy = (c) => py(c.y) + T / 2;
    const p = this.game.players[player];
    const pos = this.game.pos(p);
    const ox = px(pos.x) + T / 2, oy = py(pos.y) + T / 2;
    this.add({ type: 'text', x: ox, y: oy - T * 0.9, vy: -26, life: 1, max: 1, color, text: POWERS[power].name, size: 17 });
    this.add({ type: 'column', x: ox, y: oy + 16, life: 0.8, max: 0.8, size: 30, color });
    if (power === 'haste' || power === 'slow') {
      for (let i = 0; i < 3; i++) this.add({ type: 'ring', x: ox, y: oy + 10, life: 0.5 + i * 0.12, max: 0.5 + i * 0.12, size: 8 + i * 8, color });
      this.burst(ox, oy, 16, color, 120);
      return;
    }
    if (!cells.length) return;
    const last = cells[cells.length - 1];
    if (power === 'ray') {
      this.shake = Math.max(this.shake, 4);
      this.add({ type: 'beam', x: ox, y: oy, x2: cx(last), y2: cy(last), life: 0.32, max: 0.32, size: 9, color: '#ff8fa0' });
      cells.forEach((c) => this.burst(cx(c), cy(c), 3, '#ffd0d8', 100));
    } else if (power === 'ice') {
      this.add({ type: 'beam', x: ox, y: oy, x2: cx(last), y2: cy(last), life: 0.4, max: 0.4, size: 5, color });
      cells.forEach((c) => this.burst(cx(c), cy(c), 3, '#e6f7ff', 70));
    } else if (power === 'fire') {
      this.shake = Math.max(this.shake, 3);
      this.add({ type: 'ring', x: ox, y: oy + 10, life: 0.4, max: 0.4, size: 10, color });
      this.burst(ox, oy, 14, '#ffb347', 150);
    } else if (power === 'push') {
      cells.forEach((c, i) => {
        for (let k = 0; k < 3; k++) this.add({ type: 'streak', x: cx(c) - dir.dx * 10, y: cy(c) + (k - 1) * 11 - dir.dy * 10, vx: dir.dx * 330, vy: dir.dy * 330, life: 0.22 + i * 0.03, max: 0.22 + i * 0.03, size: 16, color });
      });
      this.add({ type: 'ring', x: cx(last), y: cy(last), life: 0.3, max: 0.3, size: 8, color });
    }
  }

  colorOf(i) { return this.colors[i] ?? PLAYERS[i]?.color ?? '#9b59d0'; }

  onDeath(player, x, y, cause) {
    const c = this.colorOf(player);
    const cx = px(x) + T / 2, cy = py(y) + T / 2;
    if (cause === 'fall') {
      this.add({ type: 'ghost', fall: true, x: cx, y: cy, life: 0.9, max: 0.9, player, face: this.face[player] || 'droite' });
      this.puff(cx, cy, 4, '#05060a');
      return;
    }
    this.add({ type: 'ghost', x: cx, y: cy, life: 1.3, max: 1.3, player, face: this.face[player] || 'droite' });
    this.burst(cx, cy, 22, c, 150);
    this.puff(cx, cy, 6, '#6a6f80');
    this.shake = Math.max(this.shake, 3);
  }

  // ───────────── Dessin ─────────────
  frame(dt, now) {
    this.now = now / 1000;
    const game = this.game;
    if (!game) return;
    this.updateFx(dt);
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cw, this.ch);
    this.drawHall(ctx);
    ctx.save();
    this.shake = this.shake < 0.05 ? 0 : this.shake * Math.exp(-dt * 9);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    ctx.translate(this.ox + sx, this.oy + sy);
    ctx.scale(this.scale, this.scale);
    ctx.drawImage(this.floor, 0, 0);
    this.drawVoid(ctx);
    if (game.exit) this.drawExit(ctx, game.exit);
    this.drawFlames(ctx);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const t = game.cell(x, y);
        if (t === WALL) this.drawWall(ctx, x, y);
        else if (t === BLOCK) this.drawBlock(ctx, x, y);
        else if (t === CHEST) this.drawChest(ctx, x, y);
      }
      game.items.forEach((it) => { if (it.y === y) this.drawItem(ctx, it); });
      game.bombs.forEach((b) => { if (Math.round(b.y + (b.ty - b.y) * b.prog) === y) this.drawBomb(ctx, b); });
      game.players.forEach((p) => { if (p.alive && Math.round(game.pos(p).y) === y) this.drawPlayer(ctx, p); });
    }
    this.drawBlaze(ctx);
    this.drawTorches(ctx);
    this.drawFx(ctx);
    this.drawMotes(ctx, dt);
    ctx.restore();
    this.drawVignette(ctx);
  }

  drawHall(ctx) {
    const g = ctx.createRadialGradient(this.cw / 2, this.ch * 0.45, 20, this.cw / 2, this.ch / 2, Math.max(this.cw, this.ch) * 0.75);
    g.addColorStop(0, '#2a2d3a'); g.addColorStop(1, '#0c0d12');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.cw, this.ch);
  }

  drawVignette(ctx) {
    const g = ctx.createRadialGradient(this.cw / 2, this.ch / 2, Math.min(this.cw, this.ch) * 0.35, this.cw / 2, this.ch / 2, Math.max(this.cw, this.ch) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.cw, this.ch);
  }

  shadow(ctx, x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(px(x), py(y) + T, T, 7);
  }

  drawWall(ctx, x, y) {
    const X = px(x), Y = py(y);
    const border = x === 0 || y === 0 || x === this.cols - 1 || y === this.rows - 1;
    const h = border ? WALL_H + 4 : WALL_H;
    this.shadow(ctx, x, y);
    const f = ctx.createLinearGradient(0, Y + T - h, 0, Y + T);
    f.addColorStop(0, '#4d5365'); f.addColorStop(1, '#2f3341');
    ctx.fillStyle = f; ctx.fillRect(X, Y + T - h, T, h);
    ctx.strokeStyle = 'rgba(10,12,20,0.55)'; ctx.lineWidth = 1;
    for (let r = 1; r * 9 < h; r++) {
      const yy = Y + T - h + r * 9;
      ctx.beginPath(); ctx.moveTo(X, yy); ctx.lineTo(X + T, yy); ctx.stroke();
      const off = r % 2 ? 12 : 24;
      for (let bx = off; bx < T; bx += 24) { ctx.beginPath(); ctx.moveTo(X + bx, yy - 9); ctx.lineTo(X + bx, yy); ctx.stroke(); }
    }
    const t = ctx.createLinearGradient(X, Y - h, X + T, Y - h + T);
    t.addColorStop(0, '#7b8398'); t.addColorStop(1, '#5e6578');
    ctx.fillStyle = t; ctx.fillRect(X, Y - h, T, T);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.strokeRect(X + 0.5, Y - h + 0.5, T - 1, T - 1);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(X + 6, Y - h + 6, T - 12, T - 12);
    if (border && y === 0 && x > 0 && x < this.cols - 1) {
      ctx.fillStyle = '#8b93a8';
      for (let m = 0; m < 3; m++) ctx.fillRect(X + 4 + m * 15, Y - h - 5, 9, 6);
    }
  }

  drawBlock(ctx, x, y) {
    const X = px(x), Y = py(y), h = BLOCK_H;
    this.shadow(ctx, x, y);
    const f = ctx.createLinearGradient(0, Y + T - h, 0, Y + T);
    f.addColorStop(0, '#8d7e66'); f.addColorStop(1, '#5f523f');
    ctx.fillStyle = f; ctx.fillRect(X + 1, Y + T - h, T - 2, h);
    ctx.fillStyle = '#b8a789'; ctx.fillRect(X + 1, Y - h + 2, T - 2, T - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(X + 1, Y - h + 2, T - 2, 3);
    ctx.strokeStyle = 'rgba(40,30,18,0.55)'; ctx.lineWidth = 1.2;
    const n = hash(x, y, 9);
    ctx.beginPath();
    const cx = X + 10 + (n % 20), cy = Y - h + 8;
    ctx.moveTo(cx, cy); ctx.lineTo(cx + 5, cy + 9); ctx.lineTo(cx - 3, cy + 17); ctx.lineTo(cx + 4, cy + 28);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X + 2, Y - h + 26); ctx.lineTo(X + T - 3, Y - h + 26); ctx.stroke();
    ctx.strokeRect(X + 1.5, Y - h + 2.5, T - 3, T - 3);
  }

  drawChest(ctx, x, y) {
    const X = px(x), Y = py(y), h = CHEST_H;
    this.shadow(ctx, x, y);
    const pulse = 0.5 + 0.5 * Math.sin(this.now * 2.4 + x);
    this.glow(ctx, X + T / 2, Y + T * 0.5, 34, `rgba(255,214,120,${0.12 + pulse * 0.16})`);
    const bx = X + 5, bw = T - 10, top = Y - h + 10;
    const f = ctx.createLinearGradient(0, Y + T - h - 4, 0, Y + T - 3);
    f.addColorStop(0, '#7a4e2b'); f.addColorStop(1, '#4e301a');
    ctx.fillStyle = f; ctx.fillRect(bx, Y + T - h - 4, bw, h + 1);
    ctx.fillStyle = '#9a6a3c'; ctx.fillRect(bx, top, bw, T - 22);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(bx, top, bw, 3);
    ctx.fillStyle = '#d3ad55';
    ctx.fillRect(bx + 6, top, 4, T - 22); ctx.fillRect(bx + bw - 10, top, 4, T - 22);
    ctx.fillRect(bx, Y + T - h - 5, bw, 3);
    ctx.fillStyle = '#f0d27a'; ctx.fillRect(X + T / 2 - 4, Y + T - h - 9, 8, 9);
    ctx.fillStyle = '#4e301a'; ctx.fillRect(X + T / 2 - 1, Y + T - h - 6, 2, 4);
    ctx.strokeStyle = 'rgba(20,10,0,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, top + 0.5, bw - 1, T - 22);
    if (Math.random() < 0.02) this.add({ type: 'spark', x: X + 8 + Math.random() * 32, y: top + Math.random() * 14, vy: -14, life: 0.8, max: 0.8, size: 1.6, color: '#ffe9a8' });
  }

  glow(ctx, x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  /** Le « sort » posé par un joueur : orbe magique de sa couleur, cercle de runes au sol, qui s'emballe avant d'exploser. */
  drawBomb(ctx, b) {
    const color = this.colorOf(b.owner);
    const f = Math.max(0, b.fuse), urgency = 1 - f / this.game.cfg.bomb.fuse;
    const bx = b.x + (b.tx - b.x) * b.prog, by = b.y + (b.ty - b.y) * b.prog;
    const cx = px(bx) + T / 2, ground = py(by) + T * 0.78;
    const pulse = Math.sin(this.now * (6 + urgency * 22));
    const r = T * 0.19 * (1 + 0.13 * pulse * (0.4 + urgency));
    const cy = py(by) + T * 0.5 + Math.sin(this.now * 3 + b.id) * 2;

    ctx.save();
    ctx.translate(cx, ground); ctx.scale(1, 0.4);
    ctx.strokeStyle = rgba(color, 0.55 + 0.3 * pulse * urgency); ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, 0, T * 0.38, 0, TAU); ctx.stroke();
    ctx.rotate(this.now * (1.2 + urgency * 3));
    ctx.lineWidth = 1.6; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.arc(0, 0, T * 0.28, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = rgba(color, 0.8);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.fillRect(Math.cos(a) * T * 0.38 - 2, Math.sin(a) * T * 0.38 - 2, 4, 4); }
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = (i * 2 / 5) * TAU - Math.PI / 2; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * T * 0.25, Math.sin(a) * T * 0.25); }
    ctx.closePath(); ctx.stroke();
    ctx.restore();

    this.glow(ctx, cx, cy, 34 + urgency * 18, rgba(color, 0.35 + urgency * 0.25));
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 1, cx, cy, r * 1.15);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, color); g.addColorStop(1, rgba(color, 0.25));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    if (f < 0.8 && pulse > 0.3) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); }

    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = color;
    for (let i = 0; i < 3; i++) {
      const a = this.now * (2.5 + urgency * 6) + (i * TAU) / 3;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (r + 9), cy + Math.sin(a) * (r + 9) * 0.55, 2.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (Math.random() < 0.35) this.add({ type: 'spark', x: cx + (Math.random() - 0.5) * 14, y: cy, vx: (Math.random() - 0.5) * 18, vy: -22 - Math.random() * 26, life: 0.5, max: 0.5, size: 1.6, color });
  }

  drawItem(ctx, it) {
    it.t0 ??= this.now;
    const age = Math.min(1, (this.now - it.t0) * 4);
    const cx = px(it.x) + T / 2, cy = py(it.y) + T / 2 + Math.sin(this.now * 3 + it.x) * 2.5;
    const s = 0.4 + 0.6 * age;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.globalAlpha = age;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 15, 11, 4, 0, 0, TAU); ctx.fill();
    if (it.kind === 'power') {
      const pw = POWERS[it.power];
      this.glow(ctx, 0, 0, 30, pw.color + '66');
      const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, 14);
      g.addColorStop(0, '#fff'); g.addColorStop(0.35, pw.color); g.addColorStop(1, '#20222c');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#16181f'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pw.icon, 0, 1);
      if (Math.random() < 0.05) this.add({ type: 'spark', x: cx + (Math.random() - 0.5) * 24, y: cy, vy: -24, life: 0.7, max: 0.7, size: 1.6, color: pw.color });
    } else {
      const col = BONUS[it.kind].color;
      ctx.fillStyle = '#1b1d26'; ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col;
      if (it.kind === 'bomb') { ctx.beginPath(); ctx.arc(0, 2, 5.5, 0, TAU); ctx.fill(); ctx.fillRect(2, -7, 2, 4); }
      else if (it.kind === 'range') { ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(8, 0, 4, 7); ctx.lineTo(-4, 7); ctx.quadraticCurveTo(-8, 0, 0, -8); ctx.fill(); }
      else { ctx.font = 'bold 16px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('»', 0, 0); }
    }
    ctx.restore();
  }

  tinted(sprite, color, alpha) {
    const s = this.scratch;
    s.width = sprite.width; s.height = sprite.height;
    const g = s.getContext('2d');
    g.clearRect(0, 0, s.width, s.height);
    g.drawImage(sprite, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = alpha; g.fillStyle = color;
    g.fillRect(0, 0, s.width, s.height);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    return s;
  }

  spriteFor(i, dir) {
    if (dir.dx > 0) this.face[i] = 'droite';
    else if (dir.dx < 0) this.face[i] = 'gauche';
    return this.heroes[this.picks[i] ?? i % this.heroes.length][this.face[i] || 'droite'];
  }

  drawPlayer(ctx, p) {
    const pos = this.game.pos(p);
    const cx = px(pos.x) + T / 2, feet = py(pos.y) + T * 0.88;
    const moving = p.prog > 0;
    const bob = moving ? -Math.abs(Math.sin(this.now * 15)) * 3 : Math.sin(this.now * 2 + p.id) * 0.8;
    const sprite = this.spriteFor(p.id, p.dir);
    const h = T * 1.6, w = h * (sprite.width / sprite.height);
    const color = this.colorOf(p.id);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, feet, 15, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.ellipse(cx, feet, 17, 7, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    if (p.hasteT > 0) {
      ctx.globalAlpha = 0.2;
      for (let k = 2; k >= 1; k--) ctx.drawImage(sprite, cx - w / 2 - p.dir.dx * k * 9, feet - h + 4 + bob - p.dir.dy * k * 5, w, h);
      ctx.globalAlpha = 1;
      if (moving && Math.random() < 0.3) this.add({ type: 'streak', x: cx, y: feet - 10, vx: -p.dir.dx * 60, vy: -p.dir.dy * 60, life: 0.2, max: 0.2, size: 10, color: '#8cf0b0' });
    }
    ctx.imageSmoothingQuality = 'high';
    let img = sprite;
    if (p.frozen > 0) img = this.tinted(sprite, '#9fdcff', 0.55);
    else if (p.slowT > 0) img = this.tinted(sprite, '#9f84ff', 0.28);
    ctx.drawImage(img, cx - w / 2, feet - h + 4 + bob, w, h);
    if (p.frozen > 0) {
      ctx.fillStyle = 'rgba(190,235,255,0.28)'; ctx.strokeStyle = 'rgba(235,250,255,0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 18, feet + 4); ctx.lineTo(cx - 22, feet - h * 0.55); ctx.lineTo(cx - 8, feet - h * 0.9); ctx.lineTo(cx + 10, feet - h * 0.85);
      ctx.lineTo(cx + 22, feet - h * 0.5); ctx.lineTo(cx + 18, feet + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    const pulse = (Math.sin(this.now * 6 + p.id) + 1) / 2;
    ctx.save();
    ctx.translate(cx + p.dir.dx * (27 + pulse * 4), feet - 2 + p.dir.dy * (21 + pulse * 3));
    ctx.rotate(Math.atan2(p.dir.dy, p.dir.dx)); ctx.scale(1, 0.85);
    ctx.globalAlpha = 0.6 + pulse * 0.4; ctx.fillStyle = color; ctx.strokeStyle = 'rgba(8,9,14,0.85)'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-4, -8); ctx.lineTo(-1, 0); ctx.lineTo(-4, 8); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = color;
    const my = feet - h - 2 + bob;
    ctx.beginPath(); ctx.moveTo(cx, my + 7); ctx.lineTo(cx - 5, my); ctx.lineTo(cx + 5, my); ctx.closePath(); ctx.fill();
    if (p.power) {
      const pw = POWERS[p.power];
      this.glow(ctx, cx + 20, feet - h * 0.7 + bob, 14, pw.color + '77');
      ctx.fillStyle = pw.color; ctx.beginPath(); ctx.arc(cx + 20, feet - h * 0.7 + bob, 5, 0, TAU); ctx.fill();
    }
  }

  /** Porte de sortie du mode Aventure : escalier lumineux qui monte à l'étage suivant. */
  drawExit(ctx, { x, y }) {
    const X = px(x), Y = py(y), cx = X + T / 2, cy = Y + T / 2;
    const pulse = 0.5 + 0.5 * Math.sin(this.now * 3);
    this.glow(ctx, cx, cy, 70 + pulse * 14, `rgba(255,214,120,${0.28 + pulse * 0.2})`);
    ctx.fillStyle = 'rgba(20,16,10,0.85)'; ctx.fillRect(X + 3, Y + 3, T - 6, T - 6);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = `rgba(${200 + i * 15},${160 + i * 18},${80 + i * 20},0.9)`;
      ctx.fillRect(X + 6 + i * 2, Y + T - 12 - i * 8, T - 12 - i * 4, 6);
    }
    ctx.strokeStyle = '#e6cc86'; ctx.lineWidth = 2.5; ctx.strokeRect(X + 2, Y + 2, T - 4, T - 4);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const p = (this.now * 0.9 + k / 3) % 1, yy = Y + T - 8 - p * (T - 14);
      ctx.globalAlpha = Math.sin(p * Math.PI) * 0.9;
      ctx.beginPath(); ctx.moveTo(cx - 8, yy + 5); ctx.lineTo(cx, yy - 3); ctx.lineTo(cx + 8, yy + 5); ctx.stroke();
    }
    ctx.restore();
    if (Math.random() < 0.15) this.add({ type: 'spark', x: cx + (Math.random() - 0.5) * 28, y: cy + 10, vy: -40 - Math.random() * 30, life: 0.9, max: 0.9, size: 1.8, color: '#ffe9a8' });
  }

  drawVoid(ctx) {
    const game = this.game, pulse = 0.5 + 0.5 * Math.sin(this.now * 9);
    for (let y = 1; y < this.rows - 1; y++) for (let x = 1; x < this.cols - 1; x++) {
      if (game.cell(x, y) !== VOID) continue;
      const X = px(x), Y = py(y);
      const g = ctx.createLinearGradient(0, Y, 0, Y + T);
      g.addColorStop(0, '#000'); g.addColorStop(1, '#0a0b11');
      ctx.fillStyle = g; ctx.fillRect(X, Y, T, T);
      if (game.cell(x, y - 1) !== VOID) {
        ctx.fillStyle = '#2d313d'; ctx.fillRect(X, Y, T, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(X, Y, T, 1.5);
      }
      if (game.cell(x - 1, y) !== VOID) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(X, Y, 3, T); }
    }
    for (const [x, y] of game.closingNext) {
      const X = px(x), Y = py(y);
      ctx.fillStyle = `rgba(255,80,50,${0.14 + pulse * 0.2})`; ctx.fillRect(X, Y, T, T);
      ctx.strokeStyle = `rgba(255,140,100,${0.4 + pulse * 0.4})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X + 8, Y + 6); ctx.lineTo(X + 22, Y + 24); ctx.lineTo(X + 14, Y + 34); ctx.lineTo(X + 34, Y + T - 4); ctx.stroke();
      if (Math.random() < 0.08) this.puff(X + T / 2, Y + T / 2, 1, '#8a90a2');
    }
  }

  /** Flammes hautes du sort « Flamme » : langues de feu bien visibles au-dessus des personnages. */
  drawBlaze(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.game.flames) {
      if (f.kind !== 'blaze' || f.delay > 0) continue;
      const age = 1 - f.t / f.total;
      const grow = Math.min(1, age * 7) * Math.min(1, f.t / 0.35);
      const cx = px(f.x) + T / 2, base = py(f.y) + T * 0.82;
      for (let j = -1; j <= 1; j++) {
        const hh = T * 1.7 * grow * (0.72 + 0.28 * Math.sin(this.now * 15 + f.x * 2 + j * 2.1 + f.y));
        const bx = cx + j * 13, bw = j === 0 ? 14 : 10;
        const g = ctx.createLinearGradient(0, base, 0, base - hh);
        g.addColorStop(0, 'rgba(255,230,150,0.95)'); g.addColorStop(0.35, 'rgba(255,150,40,0.85)'); g.addColorStop(1, 'rgba(255,50,10,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(bx - bw, base);
        ctx.quadraticCurveTo(bx - bw * 0.9, base - hh * 0.55, bx + Math.sin(this.now * 9 + j) * 5, base - hh);
        ctx.quadraticCurveTo(bx + bw * 0.9, base - hh * 0.55, bx + bw, base);
        ctx.closePath(); ctx.fill();
      }
      this.glow(ctx, cx, base - T * 0.5 * grow, 56, `rgba(255,150,60,${0.28 * grow})`);
      if (Math.random() < 0.35) this.add({ type: 'spark', x: cx + (Math.random() - 0.5) * 30, y: base - T * 0.4, vx: (Math.random() - 0.5) * 20, vy: -70 - Math.random() * 80, life: 0.7, max: 0.7, size: 1.8, color: '#ffc36a' });
    }
    ctx.restore();
  }

  drawFlames(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.game.flames) {
      const k = Math.max(0, f.t / f.total), cx = px(f.x) + T / 2, cy = py(f.y) + T / 2;
      if (f.delay > 0) continue;
      const flick = 0.85 + Math.random() * 0.3;
      const ray = f.kind === 'ray', blaze = f.kind === 'blaze', mine = f.kind === 'fire' ? this.colorOf(f.owner) : null;
      const r = T * (ray ? 0.62 : 0.78) * flick * (0.55 + k * 0.45);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, mine || ray ? 'rgba(255,255,255,0.95)' : 'rgba(255,240,200,0.95)');
      g.addColorStop(0.35, mine ? rgba(mine, 0.85) : ray ? 'rgba(255,120,150,0.8)' : blaze ? 'rgba(255,140,40,0.6)' : 'rgba(255,170,70,0.75)');
      g.addColorStop(1, mine ? rgba(mine, 0) : 'rgba(255,60,20,0)');
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  drawTorches(ctx) {
    for (const [x, y] of this.torches) {
      const cx = px(x) + T / 2, cy = py(y) + (y === 0 ? T - 12 : T - 22);
      const fl = 0.8 + 0.2 * Math.sin(this.now * 11 + x * 3) + Math.sin(this.now * 23 + x) * 0.08;
      this.glow(ctx, cx, cy - (y === 0 ? 0 : 0), 78 * fl, 'rgba(255,170,80,0.2)');
      ctx.fillStyle = '#3a2f26'; ctx.fillRect(cx - 2, cy - 2, 4, 12);
      ctx.fillStyle = '#ffb04a';
      ctx.beginPath(); ctx.moveTo(cx, cy - 12 * fl); ctx.quadraticCurveTo(cx + 6, cy - 3, cx + 2, cy); ctx.lineTo(cx - 2, cy); ctx.quadraticCurveTo(cx - 6, cy - 3, cx, cy - 12 * fl); ctx.fill();
      ctx.fillStyle = '#fff1b8';
      ctx.beginPath(); ctx.ellipse(cx, cy - 3, 1.8, 4 * fl, 0, 0, TAU); ctx.fill();
    }
    for (const [x, y] of this.banners) {
      const X = px(x) + T / 2 - 9, Y = py(y) + T - WALL_H - 2;
      ctx.fillStyle = '#7e2230';
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + 18, Y); ctx.lineTo(X + 18, Y + 30); ctx.lineTo(X + 9, Y + 23); ctx.lineTo(X, Y + 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9a24a'; ctx.fillRect(X, Y, 18, 3);
      ctx.beginPath(); ctx.arc(X + 9, Y + 12, 3.2, 0, TAU); ctx.fill();
    }
  }

  drawMotes(ctx, dt) {
    ctx.fillStyle = 'rgba(255,230,190,0.35)';
    for (const m of this.motes) {
      m.y -= m.v * dt; m.x += Math.sin(this.now + m.v) * 4 * dt;
      if (m.y < 0) { m.y = this.lh; m.x = Math.random() * this.lw; }
      ctx.beginPath(); ctx.arc(m.x, m.y, m.s, 0, TAU); ctx.fill();
    }
  }

  // ───────────── Particules ─────────────
  updateFx(dt) {
    for (const f of this.fx) {
      f.life -= dt;
      f.vy += f.g * dt;
      if (f.drag) { const d = Math.exp(-f.drag * dt); f.vx *= d; f.vy *= d; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.rot !== undefined) f.rot += f.vr * dt;
    }
    this.fx = this.fx.filter((f) => f.life > 0);
    if (this.fx.length > 900) this.fx.splice(0, this.fx.length - 900);
  }

  drawFx(ctx) {
    for (const f of this.fx) {
      const k = f.life / f.max;
      ctx.save();
      switch (f.type) {
        case 'spark':
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.fillStyle = f.color;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.size * (0.4 + k * 0.6), 0, TAU); ctx.fill(); break;
        case 'smoke':
          ctx.globalAlpha = k * 0.35; ctx.fillStyle = f.color;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.size * (1.8 - k), 0, TAU); ctx.fill(); break;
        case 'debris':
          ctx.globalAlpha = Math.min(1, k * 2); ctx.fillStyle = f.color; ctx.translate(f.x, f.y); ctx.rotate(f.rot);
          ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size * 0.8); break;
        case 'ring':
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.strokeStyle = f.color; ctx.lineWidth = 2.5 * k + 0.5;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.size + (1 - k) * 46, 0, TAU); ctx.stroke(); break;
        case 'column': {
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k * 0.7;
          const g = ctx.createLinearGradient(0, f.y - 110 * (1 - k * 0.3), 0, f.y);
          g.addColorStop(0, 'rgba(255,224,138,0)'); g.addColorStop(1, f.color);
          ctx.fillStyle = g; ctx.fillRect(f.x - f.size / 2 * k, f.y - 110, f.size * k, 110); break;
        }
        case 'text':
          ctx.globalAlpha = Math.min(1, k * 2); ctx.font = `${f.size}px 'IM Fell English', Georgia, serif`; ctx.textAlign = 'center';
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,10,16,0.85)'; ctx.strokeText(f.text, f.x, f.y);
          ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); break;
        case 'beam': {
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k;
          ctx.lineCap = 'round'; ctx.strokeStyle = f.color; ctx.lineWidth = f.size * (0.5 + k);
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = f.size * 0.35 * k + 1;
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke(); break;
        }
        case 'streak': {
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k * 0.8; ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.lineCap = 'round';
          const n = Math.hypot(f.vx, f.vy) || 1;
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - (f.vx / n) * f.size, f.y - (f.vy / n) * f.size); ctx.stroke(); break;
        }
        case 'tile': {
          const e = 1 - k, s = 1 - e * 0.45;
          ctx.globalAlpha = Math.min(1, k * 1.5);
          ctx.translate(f.x + T / 2, f.y + T / 2 + e * e * 70); ctx.rotate(e * 0.35); ctx.scale(s, s);
          ctx.fillStyle = '#3b404d'; ctx.fillRect(-T / 2, -T / 2, T, T);
          ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.strokeRect(-T / 2 + 0.5, -T / 2 + 0.5, T - 1, T - 1);
          ctx.fillStyle = '#242832'; ctx.fillRect(-T / 2, T / 2 - 8, T, 8);
          break;
        }
        case 'ghost': {
          if (f.fall) {
            const hero = this.heroes[this.picks[f.player] ?? f.player % this.heroes.length];
            const sprite = hero[f.face] || hero.droite, e = 1 - k;
            const h = T * 1.6 * (1 - e * 0.7), w = h * (sprite.width / sprite.height);
            ctx.globalAlpha = k;
            ctx.translate(f.x, f.y + T * 0.4 + e * 60); ctx.rotate(e * 2.2);
            ctx.drawImage(sprite, -w / 2, -h, w, h);
            break;
          }
          const hero = this.heroes[this.picks[f.player] ?? f.player % this.heroes.length];
          const sprite = hero[f.face] || hero.droite;
          const h = T * 1.6, w = h * (sprite.width / sprite.height), rise = (1 - k) * 46;
          ctx.globalAlpha = k * 0.65;
          ctx.drawImage(this.tinted(sprite, '#c8d0ff', 0.6), f.x - w / 2, f.y + T * 0.38 - h - rise, w, h * (0.6 + k * 0.4));
          break;
        }
        default: break;
      }
      ctx.restore();
    }
  }
}
