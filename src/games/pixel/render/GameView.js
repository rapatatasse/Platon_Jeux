import { SceneView } from './Scene.js';
import { WorldRenderer } from './WorldRenderer.js';
import { PlayerRenderer } from './PlayerRenderer.js';
import { BulletRenderer } from './BulletRenderer.js';
import { GateRenderer } from './GateRenderer.js';
import { Effects } from './Effects.js';
import { Sounds } from './Sounds.js';
import { COLORS, LEVEL_TRANSITION_TICKS } from '../core/constants.js';

/**
 * Relie la logique (Game + évènements) au rendu Three.js, aux effets et aux sons.
 * C'est le SEUL endroit où le rendu écoute la logique.
 */
export class GameView {
  constructor(container, game) {
    this.game = game;
    this.view = new SceneView(container);
    this.world = new WorldRenderer(this.view.scene);
    this.player = new PlayerRenderer(this.view.scene, game.player);
    this.bullets = new BulletRenderer(this.view.scene, game);
    this.gates = new GateRenderer(this.view.scene);
    this.effects = new Effects(this.view.scene);
    this.sounds = new Sounds();
    this.time = 0;
    this.onLevelLoaded();
    this.bind();
  }

  onLevelLoaded() {
    this.world.setWorld(this.game.world);
    this.gates.setGates(this.game.gates);
    this.view.setBoard(this.game.level.bounds);
    this.bullets.clear();
    this.player.markDirty();
    this.player.group.position.set(this.game.player.x, 0, this.game.player.z);
    this.view.target.set(this.game.player.x, 0, this.game.player.z);
  }

  bind() {
    const { events } = this.game;
    events.on('levelLoaded', () => this.onLevelLoaded());
    events.on('playerMoved', () => this.player.markDirty());
    events.on('playerReshaped', () => this.player.markDirty());
    events.on('yellowAttached', (w) => {
      this.player.markDirty();
      this.player.pop(this.game.player.toLocal(w.x, w.y, w.z));
      this.effects.ring(w, COLORS.yellow);
      this.sounds.attach();
    });
    events.on('cubeDestroyed', (d) => {
      this.player.markDirty();
      this.effects.burst(d);
      this.sounds.destroy();
    });
    events.on('cubeMoved', ({ to }) => { this.player.markDirty(); this.effects.ring(to, COLORS.yellow); });
    events.on('blocked', (p) => { this.effects.ring(p, COLORS.white); this.sounds.blocked(); });
    events.on('bulletFired', () => this.sounds.fire());
    events.on('error', () => this.sounds.error());
    events.on('gatePassed', ({ gate }) => { this.effects.ring({ x: gate.x, y: 0, z: gate.z }, COLORS.gatePassed); this.sounds.attach(); });
    events.on('levelComplete', () => {
      this.effects.celebrate(this.game.player.position, (LEVEL_TRANSITION_TICKS * this.game.tickMs) / 1000);
      this.sounds.levelUp();
    });
    events.on('won', () => { this.effects.celebrate(this.game.player.position, 6); this.sounds.levelUp(); });
    events.on('gameOver', () => this.sounds.gameOver());

    // Zoom à la molette (seule interaction directe avec la scène)
    this.view.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.view.setZoom(this.view.zoom * (e.deltaY > 0 ? 1.1 : 0.9));
    }, { passive: false });
  }

  update(dt) {
    this.time += dt;
    const p = this.game.player;
    this.view.follow(p.x, p.z, dt);
    this.world.update(p.x, p.z);
    this.player.update(dt, this.time);
    this.bullets.update(dt);
    this.gates.update(this.time);
    this.effects.update(dt);
    this.view.render();
  }
}
