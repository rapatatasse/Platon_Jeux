import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeliveryGame } from '../src/games/inventeurs/core/DeliveryGame.js';
import { buildWorld, pointInRing, countryContains } from '../src/games/inventeurs/core/world.js';
import { COUNTRIES, whenPhrase } from '../src/games/inventeurs/inventions.js';
import { GEO, MAP_SIZE } from '../src/games/inventeurs/worldGeo.js';

const SHIP = { radius: 20, turnSpeed: 3.4, uturnSpeed: 9, accel: 800, maxSpeed: 400, drag: 1.7 };
const CONFIG = { deliveriesToWin: 3, timeLimit: 60, choicesPerRound: 5, pauseTimerWhileReading: true, arrivalRadius: 20, arrivalDwell: 0.1, ship: SHIP };

/** Mini-monde : 6 carrés de pays alignés (coordonnées SVG, convertis par buildWorld). */
function tinyWorld() {
  const geo = {}, countries = [];
  for (let i = 0; i < 6; i++) {
    const x = 100 + i * 150;
    geo[`C${i}`] = { name: `Pays ${i}`, rings: [[x, 100, x + 100, 100, x + 100, 200, x, 200]] };
    countries.push({ iso: `C${i}`, name: `Pays ${i}`, locative: `en Pays ${i}`, inventions: [{ inventor: `Inv ${i}`, invention: `l'objet ${i}`, year: 1800 + i, description: 'd' }, { inventor: `Bis ${i}`, invention: `le truc ${i}`, year: 1900 + i, description: 'd' }] });
  }
  return buildWorld({ countries, geo, mapSize: { width: 1100, height: 300 }, scale: 1 });
}

const make = () => new DeliveryGame({ config: CONFIG, world: tinyWorld(), rng: (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })() });
const run = (g, sec, input = {}, dt = 1 / 60) => { for (let t = 0; t < sec; t += dt) g.update(dt, input); };

test('données : chaque pays de inventions.js existe sur la carte et a au moins une invention', () => {
  const world = buildWorld({ countries: COUNTRIES, geo: GEO, mapSize: MAP_SIZE, scale: 2 });
  assert.equal(new Set(COUNTRIES.map((c) => c.iso)).size, COUNTRIES.length, 'codes pays uniques');
  const total = COUNTRIES.reduce((n, c) => n + c.inventions.length, 0);
  assert.ok(total >= 25, `assez d'inventions pour 20 livraisons (${total})`);
  for (const c of world.countries) {
    assert.ok(c.inventions.length > 0, c.name);
    assert.ok(c.locative && c.name, c.name);
    for (const i of c.inventions) assert.ok(i.inventor && i.invention && Number.isInteger(i.year) && i.description, `${c.name} : fiche complète`);
    assert.ok(c.rings.length > 0 && c.mainRing.length >= 6, `${c.name} : géométrie`);
  }
});

test('données : la zone d\'arrivée de chaque pays est atteignable (centre dans le pays ou rayon d\'arrivée)', () => {
  const world = buildWorld({ countries: COUNTRIES, geo: GEO, mapSize: MAP_SIZE, scale: 2 });
  const inside = world.countries.filter((c) => countryContains(c, c.centroid.x, c.centroid.y));
  assert.ok(inside.length >= world.countries.length * 0.8, 'la plupart des centres sont à l\'intérieur du pays');
});

test('whenPhrase formate les dates (avant J.-C., approximatives)', () => {
  assert.equal(whenPhrase({ year: 1895 }), 'en 1895');
  assert.equal(whenPhrase({ year: 1450, circa: true }), 'vers 1450');
  assert.equal(whenPhrase({ year: -2650, circa: true }), 'vers 2650 av. J.-C.');
});

test('pointInRing', () => {
  const sq = [0, 0, 10, 0, 10, 10, 0, 10];
  assert.equal(pointInRing(5, 5, sq), true);
  assert.equal(pointInRing(15, 5, sq), false);
});

test('début : 5 pays distincts sont proposés, le temps ne s\'écoule pas pendant le choix', () => {
  const g = make();
  assert.equal(g.state, 'intro');
  g.start();
  assert.equal(g.state, 'choosing');
  assert.equal(g.proposals.length, 5);
  assert.equal(new Set(g.proposals.map((p) => p.country.iso)).size, 5);
  run(g, 5);
  assert.equal(g.timeLeft, CONFIG.timeLimit);
});

test('choisir un pays lance le vol ; le chrono tourne seulement en vol', () => {
  const g = make();
  g.start(); g.choose(0);
  assert.equal(g.state, 'flying');
  assert.equal(g.target.country.iso, g.proposals[0].country.iso);
  run(g, 2);
  assert.ok(Math.abs(g.timeLeft - (CONFIG.timeLimit - 2)) < 0.05);
});

test('arriver dans la zone du pays visé livre l\'invention', () => {
  const g = make();
  g.start(); g.choose(0);
  const { centroid } = g.target.country;
  Object.assign(g.ship, { x: centroid.x, y: centroid.y });
  const got = [];
  g.events.on('delivered', (d) => got.push(d));
  run(g, 0.5);
  assert.equal(g.state, 'delivering');
  assert.equal(got.length, 1);
  assert.equal(got[0].invention, g.target.invention);
  assert.equal(g.deliveredCount, 1);
});

test('survoler un autre pays ne livre rien', () => {
  const g = make();
  g.start(); g.choose(0);
  const other = g.proposals[1].country.centroid;
  Object.assign(g.ship, { x: other.x, y: other.y });
  run(g, 1);
  assert.equal(g.state, 'flying');
});

test('après une livraison, de nouveaux pays sont proposés et l\'invention livrée ne revient pas', () => {
  const g = make();
  g.start(); g.choose(0);
  const first = g.target;
  Object.assign(g.ship, { x: first.country.centroid.x, y: first.country.centroid.y });
  run(g, 0.5);
  g.continue();
  assert.equal(g.state, 'choosing');
  const again = g.proposals.find((p) => p.country.iso === first.country.iso);
  if (again) assert.notEqual(again.invention, first.invention);
});

test('victoire : objectif de livraisons atteint avant la fin du temps', () => {
  const g = make();
  let won = null;
  g.events.on('won', (e) => { won = e; });
  g.start();
  for (let i = 0; i < CONFIG.deliveriesToWin; i++) {
    g.choose(0);
    Object.assign(g.ship, { x: g.target.country.centroid.x, y: g.target.country.centroid.y });
    run(g, 0.5);
    g.continue();
  }
  assert.equal(g.state, 'won');
  assert.equal(won.count, CONFIG.deliveriesToWin);
});

test('défaite : le temps est écoulé avant l\'objectif', () => {
  const g = make();
  let lost = null;
  g.events.on('lost', (e) => { lost = e; });
  g.start(); g.choose(0);
  g.ship.vx = g.ship.vy = 0;
  run(g, CONFIG.timeLimit + 1);
  assert.equal(g.state, 'lost');
  assert.equal(lost.count, 0);
});

test('boussole : pointe vers le pays visé', () => {
  const g = make();
  g.start(); g.choose(0);
  const c = g.target.country.centroid;
  Object.assign(g.ship, { x: c.x - 100, y: c.y });
  const k = g.compass();
  assert.ok(Math.abs(k.angle) < 1e-9);
  assert.ok(Math.abs(k.distance - 100) < 1e-6);
});

test('mêmes commandes que le hub : haut avance, gauche/droite tournent, bas = demi-tour', () => {
  const g = make();
  g.start(); g.choose(0);
  Object.assign(g.ship, { x: -9999, y: -9999, dir: 0 });
  g.ship.x = 0; g.ship.y = 0;
  run(g, 0.4, { thrust: 1 });
  assert.ok(g.ship.x > 10);
  const d0 = g.ship.dir;
  run(g, 0.2, { turn: 1 });
  assert.ok(g.ship.dir > d0);
  const d1 = g.ship.dir;
  g.uturn();
  run(g, 0.5, {});
  assert.ok(Math.abs(g.ship.dir - d1 - Math.PI) < 1e-6);
});
