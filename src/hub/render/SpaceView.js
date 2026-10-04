import * as THREE from 'three';
import { createRenderer } from '../../shared/createRenderer.js';
import { canvasTexture } from '../../shared/canvasTexture.js';
import { WORLD, HOME } from '../core/SpaceGame.js';
import {
  planetTexture, labelTexture, orbitTexture, asteroidTexture, enemyTexture,
  bulletTexture, shockwaveTexture, debrisTexture, inkDotTexture, worldTexture, makeRng,
} from '../../shared/sketch.js';

const Z = { world: -5, orbit: -4, planet: -3, label: -2.9, asteroid: -2, bullet: -1, enemy: 0, ship: 1, fx: 2 };
const VIEW_HEIGHT = 620;   // unités monde visibles en hauteur

const unitPlane = new THREE.PlaneGeometry(1, 1);

function sprite(texture, w, h, z, { opacity = 1 } = {}) {
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false, opacity, side: THREE.DoubleSide });
  const m = new THREE.Mesh(unitPlane, mat);
  m.scale.set(w, h, 1);
  m.position.z = z;
  m.renderOrder = z;
  return m;
}

/** Rendu Three.js du hub : décor dessiné à la main, vaisseau (image fournie), astéroïdes, ennemis, tirs, effets. */
export class SpaceView {
  constructor(container, game, { shipTexture }) {
    this.game = game;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    this.renderer = createRenderer(container, { alpha: true, onResize: (w, h) => this.resize(w, h) });
    this.scene = new THREE.Scene();
    this.camPos = new THREE.Vector2(0, 0);
    this.time = 0;

    this.textures = { enemy: canvasTexture(enemyTexture()), bullet: canvasTexture(bulletTexture()), eBullet: canvasTexture(bulletTexture({ enemy: true })), shock: canvasTexture(shockwaveTexture()), debris: canvasTexture(debrisTexture()), dot: canvasTexture(inkDotTexture()) };
    this.asteroidMeshes = new Map();
    this.enemyMeshes = new Map();
    this.bulletMeshes = [];
    this.enemyBulletMeshes = [];
    this.effects = [];
    this.orbitRings = new Map();

    this.buildWorld();
    this.buildShip(shipTexture);
    this.resize(container.clientWidth, container.clientHeight);
    this.snapCamera();
  }

  resize(w, h) {
    this.aspect = w / h;
    const vh = VIEW_HEIGHT / 2, vw = vh * this.aspect;
    Object.assign(this.camera, { left: -vw, right: vw, top: vh, bottom: -vh });
    this.camera.updateProjectionMatrix();
  }

  buildWorld() {
    const { planets } = this.game;
    const bg = sprite(canvasTexture(worldTexture({ halfW: WORLD.halfW, halfH: WORLD.halfH, planets, home: HOME })), WORLD.halfW * 2, WORLD.halfH * 2, Z.world);
    this.scene.add(bg);

    const addBody = (b, i, opts) => {
      const side = b.radius * 2 + 24;
      const mesh = sprite(canvasTexture(planetTexture({ radius: b.radius, hue: b.hue, seed: 100 + i, ...opts })), side, side, Z.planet);
      mesh.position.set(b.x, b.y, Z.planet);
      this.scene.add(mesh);
      const label = sprite(canvasTexture(labelTexture(b.name, opts.sub)), 230, 35, Z.label);
      label.position.set(b.x, b.y - b.radius - 26, Z.label);
      this.scene.add(label);
      return mesh;
    };
    addBody(HOME, 0, { home: true, sub: 'point de départ' });
    planets.forEach((p, i) => {
      const building = p.status === 'building';
      addBody(p, i + 1, { building, sub: building ? 'en téraformation' : 'entre en orbite pour jouer' });
      const size = p.orbit * 2 + 20;
      const ring = sprite(canvasTexture(orbitTexture({ radius: p.orbit, seed: 30 + i, dashed: building })), size, size, Z.orbit, { opacity: building ? 0.55 : 0.8 });
      ring.position.set(p.x, p.y, Z.orbit);
      this.scene.add(ring);
      this.orbitRings.set(p.id, { ring });
    });
  }

  buildShip(texture) {
    this.shipAspect = texture?.image ? texture.image.height / texture.image.width : 0.58;
    this.shipW = 96;
    this.ship = sprite(texture, this.shipW, this.shipW * this.shipAspect, Z.ship);
    this.shipAngle = Math.PI / 2;
    this.shipFlip = false;
    this.scene.add(this.ship);
  }

  snapCamera() {
    this.camPos.set(this.game.ship.x, this.game.ship.y);
    this.applyCamera();
  }

  applyCamera() {
    const vh = VIEW_HEIGHT / 2, vw = vh * this.aspect;
    const x = vw >= WORLD.halfW ? 0 : Math.max(-WORLD.halfW + vw, Math.min(WORLD.halfW - vw, this.camPos.x));
    const y = Math.max(-WORLD.halfH + vh, Math.min(WORLD.halfH - vh, this.camPos.y));
    this.camera.position.set(x, y, 5);
  }

  // ─────────────────────────── effets ───────────────────────────
  burst(x, y, { count = 7, size = 14, speed = 150 } = {}) {
    const rng = makeRng(Math.floor(this.time * 1000) + count);
    this.effects.push(this.makeFx(this.textures.shock, x, y, 12, 12, { life: 0.5, grow: 140, fade: true }));
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2, s = speed * (0.4 + rng());
      this.effects.push(this.makeFx(this.textures.debris, x, y, size, size, { life: 0.8, vx: Math.cos(a) * s, vy: Math.sin(a) * s, spin: (rng() - 0.5) * 12, fade: true }));
    }
  }

  puff(x, y) {
    this.effects.push(this.makeFx(this.textures.dot, x, y, 16, 16, { life: 0.5, grow: 30, fade: true }));
  }

  makeFx(tex, x, y, w, h, { life = 0.5, vx = 0, vy = 0, spin = 0, grow = 0, fade = false }) {
    const m = sprite(tex, w, h, Z.fx);
    m.position.set(x, y, Z.fx);
    this.scene.add(m);
    return { m, life, max: life, vx, vy, spin, grow, w, h, fade };
  }

  updateEffects(dt) {
    for (const f of this.effects) {
      f.life -= dt;
      f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt;
      f.m.rotation.z += f.spin * dt;
      const k = 1 - f.life / f.max;
      f.m.scale.set(f.w + f.grow * k, f.h + f.grow * k, 1);
      if (f.fade) f.m.material.opacity = Math.max(0, f.life / f.max);
    }
    this.effects = this.effects.filter((f) => {
      if (f.life > 0) return true;
      this.scene.remove(f.m); f.m.material.dispose();
      return false;
    });
  }

  // ─────────────────────────── synchronisation ───────────────────────────
  syncMap(map, items, create, update, ownTexture = true) {
    const alive = new Set();
    for (const it of items) {
      alive.add(it.id);
      let m = map.get(it.id);
      if (!m) { m = create(it); map.set(it.id, m); this.scene.add(m); }
      update(m, it);
    }
    for (const [id, m] of map) {
      if (!alive.has(id)) {
        this.scene.remove(m);
        if (ownTexture) m.material.map?.dispose();
        m.material.dispose();
        map.delete(id);
      }
    }
  }

  syncPool(pool, items, tex, size) {
    while (pool.length < items.length) { const m = sprite(tex, size, size, Z.bullet); this.scene.add(m); pool.push(m); }
    pool.forEach((m, i) => {
      m.visible = i < items.length;
      if (m.visible) m.position.set(items[i].x, items[i].y, Z.bullet);
    });
  }

  update(dt) {
    this.time += dt;
    const g = this.game, s = g.ship;

    // vaisseau : face à sa direction (retourné quand il va vers la gauche)
    const flip = Math.cos(s.dir) < 0;
    const target = flip ? s.dir - Math.PI : s.dir;
    if (flip !== this.shipFlip) { this.shipFlip = flip; this.shipAngle = target; }
    let d = target - this.shipAngle;
    d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    this.shipAngle += d * Math.min(1, dt * 10);
    const sc = 0.45 + 0.55 * g.takeoffProgress;
    this.ship.position.set(s.x, s.y, Z.ship);
    this.ship.rotation.z = this.shipAngle;
    this.ship.scale.set((flip ? -1 : 1) * this.shipW * sc, this.shipW * sc * this.shipAspect, 1);
    this.ship.visible = g.state !== 'respawn';
    this.ship.material.opacity = s.invuln > 0 ? 0.45 + 0.4 * Math.abs(Math.sin(this.time * 18)) : 1;
    if (g.state === 'flying' && g.input.fire === false && g.input.thrust > 0 && Math.floor(this.time * 30) % 2 === 0) {
      this.puff(s.x - Math.cos(s.dir) * 40, s.y - Math.sin(s.dir) * 40);
    }

    this.syncMap(this.asteroidMeshes, g.asteroids,
      (a) => { const side = a.r * 2 + 12; const m = sprite(canvasTexture(asteroidTexture({ r: a.r, seed: a.seed })), side, side, Z.asteroid); return m; },
      (m, a) => {
        m.position.set(a.x, a.y, Z.asteroid);
        m.rotation.z += a.spin * (1 / 60);
        const k = a.hp < a.maxHp ? 1 - 0.07 * (a.maxHp - a.hp) : 1;
        m.scale.set((a.r * 2 + 12) * k, (a.r * 2 + 12) * k, 1);
      });

    this.syncMap(this.enemyMeshes, g.enemies,
      () => sprite(this.textures.enemy, 90, 75, Z.enemy),
      (m, e) => { m.position.set(e.x, e.y, Z.enemy); m.rotation.z = e.dir; m.scale.y = Math.cos(e.dir) < 0 ? -75 : 75; },
      false);

    this.syncPool(this.bulletMeshes, g.bullets, this.textures.bullet, 20);
    this.syncPool(this.enemyBulletMeshes, g.enemyBullets, this.textures.eBullet, 26);

    // anneaux d'orbite
    for (const p of g.planets) {
      const o = this.orbitRings.get(p.id);
      const active = g.currentOrbit === p;
      o.ring.material.opacity += ((active ? 1 : p.status === 'building' ? 0.55 : 0.8) - o.ring.material.opacity) * Math.min(1, dt * 8);
    }

    this.updateEffects(dt);

    // caméra lissée
    this.camPos.x += (s.x - this.camPos.x) * Math.min(1, dt * 4);
    this.camPos.y += (s.y - this.camPos.y) * Math.min(1, dt * 4);
    this.applyCamera();
    this.renderer.render(this.scene, this.camera);
  }
}
