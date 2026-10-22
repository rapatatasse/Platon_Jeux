import { START_BULLETS, TICK_MS, MAX_QUEUE, LEVEL_TRANSITION_TICKS, CELL } from './constants.js';
import { Emitter } from '../../../shared/events.js';
import { Player } from './Player.js';
import { parseCommand } from './commands.js';
import { getLevelDef, buildLevel, goalLabel } from './levels/index.js';
import * as Rules from './Rules.js';
import { scan } from './scan.js';

/**
 * État complet d'une partie + boucle de tick.
 * Le monde avance à intervalle fixe (tickMs). Les commandes sont mises en file
 * et consommées UNE par tick : une boucle `for` de 10 `move(1, 0)` = 10 pas.
 *
 * États : 'playing' | 'levelcomplete' (animation) | 'won' | 'gameover'
 */
export class Game {
  constructor({ level = 1, seed = 1, test = 0 } = {}) {
    this.events = new Emitter();
    this.seed = seed;
    this.testIndex = test;
    this.player = new Player();
    this.bullets = START_BULLETS;
    this.projectiles = [];
    this.queue = [];
    this.tickMs = TICK_MS;
    this.tickCount = 0;
    this.score = 0;
    this.purplesDestroyed = 0;
    this.state = 'playing';
    this.testMode = false;
    this.autoAdvance = true;
    this._bulletId = 0;
    this._bindProgress();
    this.loadLevel(level);
  }

  // ------------------------------------------------------------ Niveaux

  loadLevel(n) {
    const def = getLevelDef(n, this.testIndex);
    if (!def) {
      this.state = 'won';
      this.events.emit('won', { score: this.score });
      return;
    }
    const built = buildLevel(def, this.seed);
    this.level = { ...def, n, bounds: built.bounds };
    this.world = built.world;
    this.gates = built.gates;
    this.projectiles = [];
    this.queue = [];
    this.purpleDirs = new Map(built.bouncers.map((b) => [`${b.x},0,${b.z}`, b.dx]));
    this.progress = { collect: 0, shoot: 0, gates: 0, purples: 0 };
    this.player.x = built.start.x;
    this.player.z = built.start.z;
    this.player.setOffsets(def.offsets ?? []);
    for (const c of this.player.cells()) this.world.remove(c.x, c.y, c.z);   // jamais de chevauchement
    this.addBullets((def.bullets ?? 0) - this.bullets);
    this.player.alive = true;
    this.state = 'playing';
    this.events.emit('levelLoaded', { level: this.level });
  }

  /** Recommence le niveau courant (même après une défaite). */
  resetLevel() {
    this.loadLevel(this.level.n);
  }

  /** Saut direct à un niveau (test / debug). Retourne false si le niveau n'existe pas. */
  jumpToLevel(n, test = 0, { testMode = false } = {}) {
    if (!getLevelDef(n, test)) return false;
    this.testIndex = test;
    this.testMode = testMode;
    this.loadLevel(n);          // remet aussi state = 'playing' (même après une défaite)
    this.events.emit('levelUp', { from: this.level.n, to: n, jump: true });
    return true;
  }

  /** Compteurs d'objectif alimentés par les évènements des règles. */
  _bindProgress() {
    this.events.on('yellowAttached', () => { this.progress.collect++; });
    this.events.on('cubeDestroyed', (d) => {
      if (d.type !== CELL.PURPLE) return;
      this.progress.purples++;
      if (d.cause === 'bullet') this.progress.shoot++;
    });
    this.events.on('playerMoved', ({ x, z }) => {
      const gate = this.gates.find((g) => !g.passed && g.x === x && g.z === z);
      if (gate) {
        gate.passed = true;
        this.progress.gates++;
        this.events.emit('gatePassed', { gate, done: this.progress.gates, total: this.gates.length });
      }
    });
  }

  get goalProgress() {
    const { goal } = this.level;
    if (goal.type === 'shape') return this.matchesShape(goal.pattern) ? 1 : 0;
    return this.progress[goal.type] ?? 0;
  }

  /** La formation des cubes jaunes (offsets) est-elle exactement celle demandée ? */
  matchesShape(pattern) {
    const k = (o) => `${o.x},${o.y},${o.z}`;
    const want = new Set(pattern.map(k));
    return this.player.size === want.size && this.player.offsets.every((o) => want.has(k(o)));
  }

  checkLevelComplete() {
    if (this.state !== 'playing' || this.goalProgress < this.level.goal.count) return;
    this.state = 'levelcomplete';
    this.queue = [];
    this._transition = LEVEL_TRANSITION_TICKS;
    if (!this.testMode) this.score += 20;
    this.events.emit('levelComplete', { level: this.level.n, next: getLevelDef(this.level.n + 1) });
  }

  // ------------------------------------------------------------ Commandes

  /** Valide et met en file une commande brute [x, z, fire, moveyellow]. */
  enqueue(raw, { onDone = null } = {}) {
    const r = parseCommand(raw);
    if (!r.ok) {
      this.events.emit('error', r.error);
      return false;
    }
    if (this.isQueueFull()) {
      this.events.emit('error', `File pleine (${MAX_QUEUE} commandes). Ta boucle tourne peut-être trop longtemps.`);
      return false;
    }
    this.queue.push(onDone ? { ...r.cmd, onDone } : r.cmd);
    this.events.emit('queueChanged', { length: this.queue.length });
    return true;
  }

  isQueueFull() {
    return this.queue.length >= MAX_QUEUE;
  }

  clearQueue() {
    this.queue = [];
    this.events.emit('queueChanged', { length: 0 });
  }

  applyCommand(cmd) {
    if (cmd.dx || cmd.dz) Rules.tryMove(this, cmd.dx, cmd.dz);
    if (this.state !== 'playing') return;
    if (cmd.fire) Rules.fire(this, cmd.fire);
    if (cmd.moves.length) Rules.applyMoveYellow(this, cmd.moves);
    cmd.onDone?.(true);
  }

  // ------------------------------------------------------------ Boucle

  /** Un pas du monde. À appeler toutes les tickMs millisecondes. */
  tick() {
    if (this.state === 'levelcomplete') {
      if (this.autoAdvance && !this.testMode && --this._transition <= 0) {
        const from = this.level.n;
        this.loadLevel(from + 1);
        if (this.state === 'playing') this.events.emit('levelUp', { from, to: this.level.n });
      }
      this.events.emit('tick', { tick: this.tickCount });
      return;
    }
    if (this.state !== 'playing') return;
    this.tickCount++;
    const cmd = this.queue.shift();
    if (cmd) {
      this.applyCommand(cmd);
      this.events.emit('queueChanged', { length: this.queue.length });
    }
    if (this.state === 'playing') Rules.stepProjectiles(this);
    if (this.state === 'playing') Rules.stepEnemies(this);
    if (this.state === 'playing') Rules.settle(this);     // gravité + cohérence du groupe, à chaque tick
    this.checkLevelComplete();
    this.events.emit('tick', { tick: this.tickCount });
  }

  // ------------------------------------------------------------ Divers

  addBullets(n) {
    this.bullets = Math.max(0, this.bullets + n);
    this.events.emit('bulletsChanged', { count: this.bullets });
  }

  /** Copie des offsets (pour le terminal : la variable CubesOffsets). */
  get scanner() {
    return scan(this);
  }

  get cubesOffsets() {
    return this.player.offsets.map((o) => ({ ...o }));
  }

  snapshot() {
    return {
      state: this.state,
      level: this.level.n,
      levelName: this.level.name,
      goal: this.level.goal,
      goalLabel: goalLabel(this.level.goal),
      goalProgress: this.goalProgress,
      score: this.score,
      bullets: this.bullets,
      cubes: this.player.size,
      queue: this.queue.length,
      tickMs: this.tickMs,
      position: this.player.position,
    };
  }
}
