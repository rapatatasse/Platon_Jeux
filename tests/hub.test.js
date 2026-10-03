import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpaceGame, CFG, HOME } from '../src/hub/core/SpaceGame.js';

function rng(seed = 7) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Partie en vol, sans astéroïde ni ennemi, vaisseau placé en (x, y). */
function flying(x = 0, y = 400) {
  const g = new SpaceGame({ rng: rng() });
  g.asteroids = [];
  g.enemyTimer = 1e9;
  g.state = 'flying';
  Object.assign(g.ship, { x, y, vx: 0, vy: 0 });
  return g;
}
const run = (g, seconds, dt = 1 / 60) => { for (let t = 0; t < seconds; t += dt) g.update(dt); };

test('décollage : la partie commence au sol de la planète de départ puis passe en vol', () => {
  const g = new SpaceGame({ rng: rng() });
  assert.equal(g.state, 'takeoff');
  assert.deepEqual([g.ship.x, g.ship.y], [HOME.x, HOME.y]);
  run(g, CFG.takeoff + 0.1);
  assert.equal(g.state, 'flying');
  assert.ok(g.ship.y > HOME.radius, 'le vaisseau a quitté la surface');
});

test('les planètes sont solides : le vaisseau ne pénètre pas dans Agora', () => {
  const g = flying(0, HOME.radius + 40);
  g.ship.dir = -Math.PI / 2;
  g.setInput(0, 1, false);
  run(g, 2);
  assert.ok(Math.hypot(g.ship.x, g.ship.y) >= HOME.radius + CFG.ship.radius - 0.5);
});

test('commandes : haut avance, gauche/droite tournent, bas fait demi-tour', () => {
  const g = flying(0, 400);
  g.ship.dir = 0;
  g.setInput(0, 1, false);
  run(g, 0.5);
  assert.ok(g.ship.x > 20 && Math.abs(g.ship.y - 400) < 1, 'avance dans la direction du nez');
  g.setInput(1, 0, false);
  run(g, 0.3);
  assert.ok(g.ship.dir > 0.5, 'gauche = anti-horaire');
  g.setInput(-1, 0, false);
  run(g, 0.6);
  assert.ok(g.ship.dir < 0.5, 'droite = horaire');
  const before = g.ship.dir;
  g.setInput(0, 0, false);
  g.uturn();
  run(g, 0.6);
  assert.ok(Math.abs(g.ship.dir - before - Math.PI) < 1e-6, 'demi-tour de 180°');
});

test("entrer dans l'orbite d'une planète ouverte propose le jeu, sans le lancer", () => {
  const g = flying();
  const p = g.planets.find((q) => q.id === 'pixel');
  Object.assign(g.ship, { x: p.x + p.orbit - 10, y: p.y });
  const seen = [];
  g.events.on('orbitEnter', ({ planet }) => seen.push('enter:' + planet.id));
  g.events.on('launchGame', () => seen.push('LAUNCH'));
  run(g, 3);
  assert.deepEqual(seen, ['enter:pixel']);
  assert.equal(g.state, 'flying');
  assert.ok(p.description && p.audience, 'la planète porte la description du jeu pour la modale');
});

test('enterGame lance le jeu de la planète en orbite', () => {
  const g = flying();
  const p = g.planets.find((q) => q.id === 'pirates');
  Object.assign(g.ship, { x: p.x + p.orbit - 10, y: p.y });
  run(g, 0.1);
  let launched = null;
  g.events.on('launchGame', ({ planet }) => { launched = planet; });
  g.enterGame();
  assert.equal(launched?.id, 'pirates');
  assert.equal(g.state, 'launching');
});

test('enterGame est sans effet hors orbite ou sur une planète en téraformation', () => {
  const g = flying();
  g.enterGame();
  assert.equal(g.state, 'flying');
  const p = g.planets.find((q) => q.status === 'building');
  Object.assign(g.ship, { x: p.x + p.orbit - 5, y: p.y });
  run(g, 0.1);
  g.enterGame();
  assert.equal(g.state, 'flying');
});

test('une planète en téraformation ne lance rien mais signale son orbite', () => {
  const g = flying();
  const p = g.planets.find((q) => q.status === 'building');
  Object.assign(g.ship, { x: p.x + p.orbit - 5, y: p.y });
  const seen = [];
  g.events.on('orbitEnter', ({ planet }) => seen.push(planet.id));
  g.events.on('launchGame', () => seen.push('LAUNCH'));
  run(g, 3);
  assert.deepEqual(seen, [p.id]);
  assert.equal(g.state, 'flying');
});

test('un tir détruit un astéroïde fragile et rapporte des points', () => {
  const g = flying(0, 400);
  g.ship.dir = 0;
  g.asteroids = [{ id: 99, x: 200, y: 400, vx: 0, vy: 0, r: 18, hp: 1, maxHp: 1, spin: 0, seed: 1 }];
  const destroyed = [];
  g.events.on('asteroidDestroyed', (d) => destroyed.push(d));
  g.setInput(0, 0, true);
  run(g, 0.6);
  assert.equal(destroyed.length, 1);
  assert.equal(g.score, CFG.points.asteroid);
  assert.equal(g.pendingAsteroids.length, 1, 'un nouvel astéroïde réapparaîtra');
});

test('un astéroïde solide encaisse plusieurs tirs', () => {
  const g = flying(0, 400);
  g.ship.dir = 0;
  g.asteroids = [{ id: 99, x: 300, y: 400, vx: 0, vy: 0, r: 50, hp: 3, maxHp: 3, spin: 0, seed: 1 }];
  g.setInput(0, 0, true);
  run(g, 0.5);
  assert.ok(g.asteroids[0] && g.asteroids[0].hp < 3);
});

test('choc sur un astéroïde : -1 PV puis invulnérabilité courte', () => {
  const g = flying(0, 400);
  g.asteroids = [{ id: 1, x: 30, y: 400, vx: 0, vy: 0, r: 40, hp: 2, maxHp: 2, spin: 0, seed: 1 }];
  g.update(1 / 60);
  assert.equal(g.ship.hp, CFG.ship.maxHp - 1);
  assert.ok(g.ship.invuln > 0);
  g.asteroids[0].x = g.ship.x + 10; g.asteroids[0].y = g.ship.y;
  g.update(1 / 60);
  assert.equal(g.ship.hp, CFG.ship.maxHp - 1, 'pas de double dégât pendant l\'invulnérabilité');
});

test('PV à zéro : le vaisseau repart d\'Agora avec tous ses PV (pas de game over punitif)', () => {
  const g = flying(0, 400);
  g.ship.hp = 1;
  g.asteroids = [{ id: 1, x: 30, y: 400, vx: 0, vy: 0, r: 40, hp: 2, maxHp: 2, spin: 0, seed: 1 }];
  const evts = [];
  g.events.on('shipDestroyed', () => evts.push('destroyed'));
  g.events.on('respawn', () => evts.push('respawn'));
  g.update(1 / 60);
  assert.equal(g.state, 'respawn');
  run(g, CFG.respawnDelay + 0.1);
  assert.deepEqual(evts, ['destroyed', 'respawn']);
  assert.equal(g.ship.hp, CFG.ship.maxHp);
  assert.equal(g.state, 'takeoff');
});

test('les PV se régénèrent lentement quand on n\'est plus touché', () => {
  const g = flying();
  g.ship.hp = 2;
  g.ship.sinceHit = 0;
  run(g, CFG.ship.regenAfter + CFG.ship.regenEvery + 1);
  assert.equal(g.ship.hp, 3);
});

test('un vaisseau ennemi prend en chasse le joueur et lui tire dessus', () => {
  const g = flying(0, 400);
  g.spawnEnemy();
  const e = g.enemies[0];
  Object.assign(e, { x: 380, y: 400, dir: Math.PI, state: 'pass' });
  let fired = 0;
  g.events.on('enemyFire', () => fired++);
  run(g, 8);
  assert.equal(e.state === 'pass', false, 'l\'ennemi est passé en chasse');
  assert.ok(fired > 0, 'l\'ennemi a tiré');
});

test('un tir du joueur détruit un ennemi en 2 coups', () => {
  const g = flying(0, 400);
  g.spawnEnemy();
  Object.assign(g.enemies[0], { x: 260, y: 400, dir: 0, state: 'leave', age: 0 });
  g.enemies[0].dir = 0;
  g.ship.dir = 0;
  const killed = [];
  g.events.on('enemyDestroyed', () => killed.push(1));
  g.enemies[0].state = 'pass';
  g.setInput(0, 0, true);
  // ennemi immobilisé en pratique : on le replace pendant le test
  for (let i = 0; i < 90; i++) { g.update(1 / 60); if (g.enemies[0]) { g.enemies[0].x = 260; g.enemies[0].y = 400; } }
  assert.equal(killed.length, 1);
  assert.equal(g.score, CFG.points.enemy);
});
