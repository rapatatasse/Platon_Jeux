import * as THREE from 'three';
import { createRenderer } from '../../../shared/createRenderer.js';
import { canvasTexture } from '../../../shared/canvasTexture.js';
import { shockwaveTexture, inkDotTexture } from '../../../shared/sketch.js';
import { mapTexture } from './mapTexture.js';

const Z = { map: -5, delivered: -4, target: -3, fx: 1, ship: 2 };
const unitPlane = new THREE.PlaneGeometry(1, 1);

function sprite(texture, w, h, z, opacity = 1) {
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false, opacity, side: THREE.DoubleSide });
  const m = new THREE.Mesh(unitPlane, mat);
  m.scale.set(w, h, 1);
  m.position.z = z;
  m.renderOrder = z;
  return m;
}

/** Rendu Three.js de la mappemonde : carte dessinée, vaisseau vu de dessus, pays livrés et pays visé. */
export class MapView {
  constructor(container, game, { geo, mapSize, shipTexture, viewHeight, showNames = true, showTarget = true }) {
    this.showTarget = showTarget;
    this.game = game;
    this.viewHeight = viewHeight;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    this.renderer = createRenderer(container, { alpha: true, onResize: (w, h) => this.resize(w, h) });
    this.scene = new THREE.Scene();
    this.time = 0;
    this.camPos = new THREE.Vector2(game.ship.x, game.ship.y);
    this.delivered = new Map();
    this.dot = canvasTexture(inkDotTexture());
    this.puffs = [];

    const { world } = game;
    const map = sprite(canvasTexture(mapTexture({ geo, mapSize, world, playable: world.countries, showNames })), world.halfW * 2, world.halfH * 2, Z.map);
    this.scene.add(map);

    const aspect = shipTexture?.image ? shipTexture.image.height / shipTexture.image.width : 0.75;
    this.shipW = 96;
    this.ship = sprite(shipTexture, this.shipW, this.shipW * aspect, Z.ship);
    this.scene.add(this.ship);

    this.ring = sprite(canvasTexture(shockwaveTexture()), 100, 100, Z.target);
    this.ring.visible = false;
    this.scene.add(this.ring);
    this.outline = null;

    this.resize(container.clientWidth, container.clientHeight);
    this.applyCamera();
  }

  resize(w, h) {
    this.aspect = w / h;
    const vh = this.viewHeight / 2, vw = vh * this.aspect;
    Object.assign(this.camera, { left: -vw, right: vw, top: vh, bottom: -vh });
    this.camera.updateProjectionMatrix();
  }

  applyCamera() {
    const { halfW, halfH } = this.game.world;
    const vh = this.viewHeight / 2, vw = vh * this.aspect;
    const x = vw >= halfW ? 0 : Math.max(-halfW + vw, Math.min(halfW - vw, this.camPos.x));
    const y = vh >= halfH ? 0 : Math.max(-halfH + vh, Math.min(halfH - vh, this.camPos.y));
    this.camera.position.set(x, y, 5);
  }

  /** Surligne le pays visé (contour qui respire + anneau sur son centre). */
  setTarget(country) {
    if (this.outline) { this.scene.remove(this.outline); this.outline.geometry.dispose(); this.outline.material.dispose(); this.outline = null; }
    this.ring.visible = !!country && this.showTarget;
    if (!country || !this.showTarget) return;
    const pts = [];
    for (let i = 0; i < country.mainRing.length; i += 2) pts.push(new THREE.Vector3(country.mainRing[i], country.mainRing[i + 1], Z.target));
    this.outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8c3b1f, transparent: true, depthTest: false }));
    this.outline.renderOrder = Z.target;
    this.scene.add(this.outline);
    this.ring.position.set(country.centroid.x, country.centroid.y, Z.target);
  }

  /** Colore un pays livré. */
  markDelivered(country) {
    if (this.delivered.has(country.iso)) return;
    const group = new THREE.Group();
    for (const ring of country.rings) {
      const shape = new THREE.Shape();
      for (let i = 0; i < ring.length; i += 2) (i ? shape.lineTo : shape.moveTo).call(shape, ring[i], ring[i + 1]);
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0x8c3b1f, transparent: true, opacity: 0.38, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
      mesh.renderOrder = Z.delivered;
      group.add(mesh);
    }
    this.scene.add(group);
    this.delivered.set(country.iso, group);
  }

  puff(x, y) {
    const m = sprite(this.dot, 18, 18, Z.fx);
    m.position.set(x, y, Z.fx);
    this.scene.add(m);
    this.puffs.push({ m, life: 0.5 });
  }

  update(dt, thrusting) {
    this.time += dt;
    const s = this.game.ship;
    this.ship.position.set(s.x, s.y, Z.ship);
    this.ship.rotation.z = s.dir;

    if (thrusting && Math.floor(this.time * 30) % 2 === 0) this.puff(s.x - Math.cos(s.dir) * 44, s.y - Math.sin(s.dir) * 44);
    for (const p of this.puffs) {
      p.life -= dt;
      p.m.material.opacity = Math.max(0, p.life / 0.5);
      p.m.scale.setScalar(18 + (0.5 - p.life) * 60);
    }
    this.puffs = this.puffs.filter((p) => {
      if (p.life > 0) return true;
      this.scene.remove(p.m); p.m.material.dispose();
      return false;
    });

    if (this.outline) this.outline.material.opacity = 0.55 + 0.45 * Math.sin(this.time * 4);
    if (this.ring.visible) {
      const k = 1 + 0.18 * Math.sin(this.time * 3);
      this.ring.scale.set(110 * k, 110 * k, 1);
    }

    this.camPos.x += (s.x - this.camPos.x) * Math.min(1, dt * 4);
    this.camPos.y += (s.y - this.camPos.y) * Math.min(1, dt * 4);
    this.applyCamera();
    this.renderer.render(this.scene, this.camera);
  }
}
