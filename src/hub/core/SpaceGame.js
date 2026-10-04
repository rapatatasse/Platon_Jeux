import { Emitter } from '../../shared/events.js';
import { GAMES } from '../../shared/games.js';
import { stepShip, startUTurn } from '../../shared/ShipPhysics.js';

/**
 * Logique du hub : un vaisseau, des planètes (une par jeu), des astéroïdes et quelques vaisseaux ennemis.
 * AUCUNE dépendance à Three.js ni au DOM (testable avec node --test).
 *
 * Repère : x vers la droite, y vers le HAUT, unités = pixels monde.
 *
 * Évènements émis (le rendu / l'UI / les sons écoutent) :
 *   hp               { hp, max }
 *   score            { score }
 *   fire             { x, y }                 tir du joueur
 *   enemyFire        { x, y }
 *   asteroidHit      { x, y }
 *   asteroidDestroyed{ x, y, r }
 *   enemySpawn       { enemy }
 *   enemyHit         { x, y }
 *   enemyDestroyed   { x, y }
 *   shipHit          { cause: 'asteroid'|'enemy'|'bullet' }
 *   shipDestroyed    { x, y }
 *   respawn          {}
 *   orbitEnter       { planet }               le vaisseau entre dans la zone d'orbite (l'UI propose d'entrer dans le jeu)
 *   orbitLeave       { planet }
 *   launchGame       { planet }               le joueur a confirmé : on lance le jeu
 */
export const WORLD = { halfW: 900, halfH: 650 };
export const HOME = { id: 'home', name: 'Agora', x: 0, y: 0, radius: 56, status: 'home' };

export const CFG = {
  ship: { radius: 22, turnSpeed: 3.4, uturnSpeed: 9, accel: 720, maxSpeed: 340, drag: 1.7, maxHp: 5, invuln: 1.4, regenAfter: 14, regenEvery: 6 },
  bullet: { speed: 760, life: 1.1, cooldown: 0.24, radius: 5 },
  asteroids: { count: 24, minR: 18, maxR: 50, maxSpeed: 26, respawn: 6 },
  enemy: { max: 2, firstSpawn: 14, spawnEvery: 18, hp: 2, speed: 150, passSpeed: 210, sight: 560, fireEvery: 2.6, bulletSpeed: 230, aimError: 0.45, radius: 22, leaveAfter: 22, keepAway: 170 },
  takeoff: 1.6,
  respawnDelay: 2.2,
  points: { asteroid: 10, enemy: 50 },
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class SpaceGame {
  constructor({ rng = Math.random, startAt = null } = {}) {
    this.events = new Emitter();
    this.rng = rng;
    this.planets = GAMES.map((g) => ({ id: g.id, name: g.name, status: g.status, url: g.url, tagline: g.tagline, description: g.description, audience: g.audience, ...g.planet }));
    this.bodies = [HOME, ...this.planets];

    this.time = 0;
    this.score = 0;
    this.state = 'takeoff';       // takeoff | flying | respawn | launching
    this.stateTime = 0;
    this.input = { turn: 0, thrust: 0, fire: false };
    this.ship = { x: HOME.x, y: HOME.y, vx: 0, vy: 0, dir: Math.PI / 2, hp: CFG.ship.maxHp, invuln: 0, sinceHit: 99, regenTimer: 0, fireCd: 0, turnLeft: 0 };
    this.bullets = [];            // balles du joueur
    this.enemyBullets = [];
    this.asteroids = [];
    this.enemies = [];
    this.pendingAsteroids = [];   // temps restants avant réapparition
    this.enemyTimer = CFG.enemy.firstSpawn;
    this.currentOrbit = null;
    this.nextId = 1;

    const start = startAt && this.planets.find((p) => p.id === startAt);
    if (start) {
      this.ship.x = start.x + start.orbit + 60;
      this.ship.y = start.y;
      this.ship.dir = 0;
      this.state = 'flying';
    }
    for (let i = 0; i < CFG.asteroids.count; i++) this.asteroids.push(this.makeAsteroid());
  }

  get takeoffProgress() {
    return this.state === 'takeoff' ? Math.min(1, this.stateTime / CFG.takeoff) : 1;
  }

  setState(s) {
    this.state = s;
    this.stateTime = 0;
  }

  rand(a, b) {
    return a + this.rng() * (b - a);
  }

  /** Position libre : hors des orbites, loin du vaisseau. */
  freeSpot(margin, minFromShip = 260) {
    for (let i = 0; i < 60; i++) {
      const p = { x: this.rand(-WORLD.halfW + 40, WORLD.halfW - 40), y: this.rand(-WORLD.halfH + 40, WORLD.halfH - 40) };
      const ok = this.bodies.every((b) => dist(p, b) > (b.orbit ?? b.radius + 40) + margin) && dist(p, this.ship) > minFromShip;
      if (ok) return p;
    }
    return { x: WORLD.halfW - 60, y: WORLD.halfH - 60 };
  }

  makeAsteroid() {
    const { minR, maxR, maxSpeed } = CFG.asteroids;
    const r = this.rand(minR, maxR);
    const p = this.freeSpot(r);
    const a = this.rand(0, Math.PI * 2), s = this.rand(4, maxSpeed);
    return { id: this.nextId++, x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r, hp: Math.ceil(r / 20), maxHp: Math.ceil(r / 20), spin: this.rand(-0.6, 0.6), seed: Math.floor(this.rng() * 1e6) };
  }

  /** turn : +1 gauche (anti-horaire), -1 droite ; thrust : 1 = avancer. */
  setInput(turn, thrust, fire) {
    this.input.turn = turn; this.input.thrust = thrust; this.input.fire = !!fire;
  }

  /** Demi-tour rapide (flèche bas). */
  uturn() {
    if (this.state === 'flying') startUTurn(this.ship);
  }

  // ───────────────────────────── boucle ─────────────────────────────
  update(dt) {
    this.time += dt;
    this.stateTime += dt;

    if (this.state === 'takeoff') this.updateTakeoff();
    else if (this.state === 'respawn') { if (this.stateTime >= CFG.respawnDelay) this.respawn(); }
    else if (this.state === 'flying') this.updateShip(dt);

    this.updateBullets(dt);
    this.updateAsteroids(dt);
    this.updateEnemies(dt);
    if (this.state === 'flying') { this.updateOrbits(dt); this.updateRegen(dt); }
  }

  updateTakeoff() {
    const t = this.takeoffProgress;
    const s = this.ship;
    s.x = HOME.x;
    s.y = HOME.y + (HOME.radius + 70) * t * t;
    s.dir = Math.PI / 2;
    if (t >= 1) { s.vy = 120; this.setState('flying'); }
  }

  updateShip(dt) {
    const s = this.ship;
    stepShip(s, this.input, dt, CFG.ship, WORLD);
    const r = CFG.ship.radius;

    // les planètes sont solides
    for (const b of this.bodies) {
      const d = dist(s, b), min = b.radius + r;
      if (d < min && d > 0) {
        const nx = (s.x - b.x) / d, ny = (s.y - b.y) / d;
        s.x = b.x + nx * min; s.y = b.y + ny * min;
        const vn = s.vx * nx + s.vy * ny;
        if (vn < 0) { s.vx -= vn * nx * 1.4; s.vy -= vn * ny * 1.4; }
      }
    }

    s.invuln = Math.max(0, s.invuln - dt);
    s.sinceHit += dt;
    s.fireCd = Math.max(0, s.fireCd - dt);
    if (this.input.fire && s.fireCd <= 0) this.fire();
  }

  fire() {
    const s = this.ship;
    s.fireCd = CFG.bullet.cooldown;
    const dx = Math.cos(s.dir), dy = Math.sin(s.dir);
    this.bullets.push({ x: s.x + dx * (CFG.ship.radius + 8), y: s.y + dy * (CFG.ship.radius + 8), vx: dx * CFG.bullet.speed + s.vx * 0.3, vy: dy * CFG.bullet.speed + s.vy * 0.3, life: CFG.bullet.life });
    this.events.emit('fire', { x: s.x, y: s.y });
  }

  outOfWorld(p, margin = 0) {
    return Math.abs(p.x) > WORLD.halfW + margin || Math.abs(p.y) > WORLD.halfH + margin;
  }

  updateBullets(dt) {
    for (const b of this.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (this.outOfWorld(b) || this.bodies.some((p) => dist(b, p) < p.radius)) { b.life = 0; continue; }
      const ast = this.asteroids.find((a) => dist(a, b) < a.r + CFG.bullet.radius);
      if (ast) { b.life = 0; this.hitAsteroid(ast); continue; }
      const en = this.enemies.find((e) => dist(e, b) < CFG.enemy.radius + CFG.bullet.radius);
      if (en) { b.life = 0; this.hitEnemy(en); }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);

    for (const b of this.enemyBullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (this.outOfWorld(b) || this.bodies.some((p) => dist(b, p) < p.radius)) { b.life = 0; continue; }
      if (this.state === 'flying' && dist(b, this.ship) < CFG.ship.radius + 6) { b.life = 0; this.damageShip('bullet'); }
    }
    this.enemyBullets = this.enemyBullets.filter((b) => b.life > 0);
  }

  hitAsteroid(a) {
    a.hp--;
    if (a.hp > 0) { this.events.emit('asteroidHit', { x: a.x, y: a.y }); return; }
    this.asteroids = this.asteroids.filter((o) => o !== a);
    this.pendingAsteroids.push(CFG.asteroids.respawn);
    this.addScore(CFG.points.asteroid);
    this.events.emit('asteroidDestroyed', { x: a.x, y: a.y, r: a.r });
  }

  hitEnemy(e) {
    e.hp--;
    if (e.hp > 0) { this.events.emit('enemyHit', { x: e.x, y: e.y }); return; }
    this.enemies = this.enemies.filter((o) => o !== e);
    this.addScore(CFG.points.enemy);
    this.events.emit('enemyDestroyed', { x: e.x, y: e.y });
  }

  addScore(n) {
    this.score += n;
    this.events.emit('score', { score: this.score });
  }

  updateAsteroids(dt) {
    for (const a of this.asteroids) {
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.x < -WORLD.halfW + a.r || a.x > WORLD.halfW - a.r) a.vx *= -1;
      if (a.y < -WORLD.halfH + a.r || a.y > WORLD.halfH - a.r) a.vy *= -1;
      a.x = Math.max(-WORLD.halfW + a.r, Math.min(WORLD.halfW - a.r, a.x));
      a.y = Math.max(-WORLD.halfH + a.r, Math.min(WORLD.halfH - a.r, a.y));
      for (const b of this.bodies) {
        const d = dist(a, b), min = b.radius + a.r;
        if (d < min && d > 0) {
          const nx = (a.x - b.x) / d, ny = (a.y - b.y) / d;
          a.x = b.x + nx * min; a.y = b.y + ny * min;
          const vn = a.vx * nx + a.vy * ny;
          if (vn < 0) { a.vx -= 2 * vn * nx; a.vy -= 2 * vn * ny; }
        }
      }
      if (this.state === 'flying') {
        const d = dist(a, this.ship), min = a.r + CFG.ship.radius * 0.8;
        if (d < min && d > 0) {
          const nx = (this.ship.x - a.x) / d, ny = (this.ship.y - a.y) / d;
          this.ship.x = a.x + nx * min; this.ship.y = a.y + ny * min;
          this.ship.vx = nx * 240; this.ship.vy = ny * 240;
          a.vx -= nx * 20; a.vy -= ny * 20;
          this.damageShip('asteroid');
        }
      }
    }
    this.pendingAsteroids = this.pendingAsteroids.map((t) => t - dt).filter((t) => {
      if (t > 0) return true;
      this.asteroids.push(this.makeAsteroid());
      return false;
    });
  }

  // ─────────────────────────── ennemis ───────────────────────────
  spawnEnemy() {
    const side = Math.floor(this.rng() * 4);
    const x = side === 0 ? -WORLD.halfW : side === 1 ? WORLD.halfW : this.rand(-WORLD.halfW, WORLD.halfW);
    const y = side === 2 ? -WORLD.halfH : side === 3 ? WORLD.halfH : this.rand(-WORLD.halfH, WORLD.halfH);
    const toShip = Math.atan2(this.ship.y - y, this.ship.x - x) + this.rand(-0.5, 0.5);
    const e = { id: this.nextId++, x, y, dir: toShip, hp: CFG.enemy.hp, state: 'pass', age: 0, fireCd: this.rand(1.2, CFG.enemy.fireEvery), strafe: this.rng() < 0.5 ? 1 : -1 };
    this.enemies.push(e);
    this.events.emit('enemySpawn', { enemy: e });
  }

  updateEnemies(dt) {
    if (this.state === 'flying') {
      this.enemyTimer -= dt;
      if (this.enemyTimer <= 0) {
        this.enemyTimer = CFG.enemy.spawnEvery;
        if (this.enemies.length < CFG.enemy.max) this.spawnEnemy();
      }
    }
    const C = CFG.enemy;
    for (const e of this.enemies) {
      e.age += dt;
      const toShip = Math.atan2(this.ship.y - e.y, this.ship.x - e.x);
      const d = dist(e, this.ship);
      const targetable = this.state === 'flying';

      if (e.state === 'pass' && targetable && d < C.sight * 0.7) e.state = 'chase';
      if (e.state === 'chase' && (e.age > C.leaveAfter || !targetable)) e.state = 'leave';

      let speed = C.passSpeed;
      if (e.state === 'chase') {
        e.dir = this.turnToward(e.dir, toShip, 1.8 * dt);
        speed = d < C.keepAway ? C.speed * 0.4 : C.speed;
        if (d < C.keepAway * 0.8) e.dir = this.turnToward(e.dir, toShip + e.strafe * Math.PI / 2, 2.4 * dt);
        e.fireCd -= dt;
        if (e.fireCd <= 0 && d < C.sight) {
          e.fireCd = C.fireEvery;
          const a = toShip + this.rand(-C.aimError, C.aimError);
          this.enemyBullets.push({ x: e.x + Math.cos(e.dir) * 26, y: e.y + Math.sin(e.dir) * 26, vx: Math.cos(a) * C.bulletSpeed, vy: Math.sin(a) * C.bulletSpeed, life: 3.2 });
          this.events.emit('enemyFire', { x: e.x, y: e.y });
        }
      } else if (e.state === 'leave') {
        const away = Math.atan2(e.y, e.x);
        e.dir = this.turnToward(e.dir, away, 1.5 * dt);
        speed = C.speed * 1.3;
      }
      e.x += Math.cos(e.dir) * speed * dt;
      e.y += Math.sin(e.dir) * speed * dt;

      for (const b of this.bodies) {
        const dd = dist(e, b), min = b.radius + C.radius;
        if (dd < min && dd > 0) { e.x = b.x + ((e.x - b.x) / dd) * min; e.y = b.y + ((e.y - b.y) / dd) * min; }
      }
      if (targetable && d < C.radius + CFG.ship.radius * 0.8) {
        const nx = (this.ship.x - e.x) / (d || 1), ny = (this.ship.y - e.y) / (d || 1);
        this.ship.vx = nx * 260; this.ship.vy = ny * 260;
        this.damageShip('enemy');
      }
    }
    this.enemies = this.enemies.filter((e) => !(this.outOfWorld(e, 140) && e.age > 3));
  }

  turnToward(cur, target, maxStep) {
    let diff = ((target - cur + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    diff = Math.max(-maxStep, Math.min(maxStep, diff));
    return cur + diff;
  }

  // ─────────────────────────── dégâts / orbite ───────────────────────────
  damageShip(cause) {
    const s = this.ship;
    if (s.invuln > 0 || this.state !== 'flying') return;
    s.hp = Math.max(0, s.hp - 1);
    s.invuln = CFG.ship.invuln;
    s.sinceHit = 0;
    s.regenTimer = 0;
    this.events.emit('shipHit', { cause });
    this.events.emit('hp', { hp: s.hp, max: CFG.ship.maxHp });
    if (s.hp <= 0) {
      this.events.emit('shipDestroyed', { x: s.x, y: s.y });
      this.setState('respawn');
    }
  }

  updateRegen(dt) {
    const s = this.ship;
    if (s.hp >= CFG.ship.maxHp || s.sinceHit < CFG.ship.regenAfter) return;
    s.regenTimer += dt;
    if (s.regenTimer >= CFG.ship.regenEvery) {
      s.regenTimer = 0;
      s.hp++;
      this.events.emit('hp', { hp: s.hp, max: CFG.ship.maxHp });
    }
  }

  respawn() {
    const s = this.ship;
    Object.assign(s, { x: HOME.x, y: HOME.y, vx: 0, vy: 0, hp: CFG.ship.maxHp, invuln: 0, sinceHit: 99, regenTimer: 0, turnLeft: 0 });
    this.enemies = []; this.enemyBullets = [];
    this.events.emit('hp', { hp: s.hp, max: CFG.ship.maxHp });
    this.events.emit('respawn', {});
    this.setState('takeoff');
  }

  updateOrbits() {
    let inside = null;
    for (const p of this.planets) {
      if (dist(this.ship, p) < p.orbit) inside = p;
    }
    if (inside === this.currentOrbit) return;
    if (this.currentOrbit) this.events.emit('orbitLeave', { planet: this.currentOrbit });
    this.currentOrbit = inside;
    if (inside) this.events.emit('orbitEnter', { planet: inside });
  }

  /** Le joueur a choisi d'entrer dans le jeu de la planète en orbite. */
  enterGame(planet = this.currentOrbit) {
    if (!planet || planet.status !== 'open' || this.state !== 'flying') return;
    this.setState('launching');
    this.events.emit('launchGame', { planet });
  }
}
