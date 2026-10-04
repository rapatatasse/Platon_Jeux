import { Emitter } from '../../../shared/events.js';
import { createShipState, startUTurn, stepShip } from '../../../shared/ShipPhysics.js';
import { countryContains } from './world.js';

/**
 * Logique du jeu « Les Inventeurs » : livrer des inventions en volant vers le bon pays, dans le temps imparti.
 * AUCUNE dépendance à Three.js ni au DOM (testable avec node --test).
 *
 * États : intro -> choosing -> flying -> delivering -> (choosing ...) -> won | lost
 *
 * Évènements émis :
 *   proposals   { proposals: [{ country, invention }] }       choix des pays à livrer
 *   target      { country, invention }                         pays choisi : on décolle
 *   delivered   { country, invention, count }                  arrivée dans la zone du pays
 *   tick        { timeLeft }                                   (chaque update en vol)
 *   won         { count, timeUsed }
 *   lost        { count }                                       temps écoulé
 */
export class DeliveryGame {
  /**
   * @param config { deliveriesToWin, timeLimit, choicesPerRound, pauseTimerWhileReading, arrivalRadius, arrivalDwell, ship }
   * @param world  résultat de buildWorld()
   */
  constructor({ config, world, rng = Math.random }) {
    this.config = config;
    this.world = world;
    this.rng = rng;
    this.events = new Emitter();
    this.state = 'intro';
    this.ship = createShipState(config.startX ?? 0, config.startY ?? 0, 0);
    this.timeLeft = config.timeLimit;
    this.delivered = [];
    this.proposals = [];
    this.target = null;      // { country, invention }
    this.dwell = 0;
    // inventions restantes par pays (copie mélangée)
    this.pool = new Map(world.countries.map((c) => [c.iso, this.shuffle([...c.inventions])]));
  }

  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  get deliveredCount() {
    return this.delivered.length;
  }

  get timeUsed() {
    return this.config.timeLimit - this.timeLeft;
  }

  /** Quitte l'intro : première série de pays proposés. */
  start() {
    if (this.state === 'intro') this.newRound();
  }

  newRound() {
    const available = this.world.countries.filter((c) => this.pool.get(c.iso).length > 0);
    if (available.length === 0) { this.finish(true); return; }
    this.proposals = this.shuffle([...available]).slice(0, this.config.choicesPerRound)
      .map((country) => ({ country, invention: this.pool.get(country.iso)[0] }));
    this.state = 'choosing';
    this.events.emit('proposals', { proposals: this.proposals });
  }

  /** Le joueur choisit l'un des pays proposés (index dans `proposals`) : le vol commence. */
  choose(index) {
    if (this.state !== 'choosing' || !this.proposals[index]) return;
    this.target = this.proposals[index];
    this.dwell = 0;
    this.state = 'flying';
    this.events.emit('target', this.target);
  }

  uturn() {
    if (this.state === 'flying') startUTurn(this.ship);
  }

  /** Infos pour la boussole : direction (rad, repère monde) et distance jusqu'au pays visé. */
  compass() {
    if (!this.target) return null;
    const { x, y } = this.target.country.centroid;
    return { angle: Math.atan2(y - this.ship.y, x - this.ship.x), distance: Math.hypot(x - this.ship.x, y - this.ship.y), country: this.target.country };
  }

  update(dt, input = {}) {
    const reading = this.state === 'choosing' || this.state === 'delivering';
    if (this.state === 'flying') {
      stepShip(this.ship, input, dt, this.config.ship, this.world);
      this.timeLeft -= dt;
      this.checkArrival(dt);
    } else if (reading && !this.config.pauseTimerWhileReading) {
      this.timeLeft -= dt;
    }
    if (this.timeLeft <= 0 && (this.state === 'flying' || reading)) {
      this.timeLeft = 0;
      this.state = 'lost';
      this.events.emit('lost', { count: this.deliveredCount });
      return;
    }
    if (this.state === 'flying') this.events.emit('tick', { timeLeft: this.timeLeft });
  }

  checkArrival(dt) {
    const { country } = this.target;
    const s = this.ship;
    const inZone = countryContains(country, s.x, s.y)
      || Math.hypot(s.x - country.centroid.x, s.y - country.centroid.y) < this.config.arrivalRadius;
    this.dwell = inZone ? this.dwell + dt : 0;
    if (this.dwell < this.config.arrivalDwell) return;

    const { invention } = this.target;
    this.pool.get(country.iso).shift();
    this.delivered.push({ iso: country.iso, invention });
    this.state = 'delivering';
    this.events.emit('delivered', { country, invention, count: this.deliveredCount });
  }

  /** Après la lecture de la livraison : victoire, ou nouvelle série de pays. */
  continue() {
    if (this.state !== 'delivering') return;
    if (this.deliveredCount >= this.config.deliveriesToWin) this.finish(true);
    else this.newRound();
  }

  finish(won) {
    this.state = won ? 'won' : 'lost';
    this.events.emit(won ? 'won' : 'lost', { count: this.deliveredCount, timeUsed: this.timeUsed });
  }
}
