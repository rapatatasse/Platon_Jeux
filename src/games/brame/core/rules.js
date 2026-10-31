// Règles de BRAME (2 joueurs). Aucune dépendance au DOM ni à Three.js : le rendu écoute `change` / `log`.
// Joueur 0 = noir (part du bas), joueur 1 = rouge (part du haut).
import { Emitter } from '../../../shared/events.js';
import { BASE, EXIT, NEIGHBORS, RESERVE, forwardNeighbors, isGoal, startCells } from './board.js';

export const PLAYER_NAMES = ['Noir', 'Rouge'];
export const PIONS_PER_PLAYER = 15;
/** Dé pyramide : faces 1, 1, 2, 2, 3 (à ajuster ici si le dé physique diffère). */
export const PYRAMID_DIE = [1, 1, 2, 2, 3];

const subsets = (list) => list.reduce((acc, x) => acc.concat(acc.map((s) => [...s, x])), [[]]).filter((s) => s.length);

export class Game extends Emitter {
  constructor({ rng = Math.random } = {}) {
    super();
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.cells = {};
    this.reserve = [PIONS_PER_PLAYER, PIONS_PER_PLAYER];
    this.pyramids = [null, null];
    this.saved = [0, 0];
    this.lost = [0, 0];
    this.current = 0;
    this.phase = 'idle';
    this.dice = [];
    this.moveLimit = Infinity;
    this.pyr = null;
    this.attack = null;
    this.winner = null;
    this.lastAttack = null;
    this.emit('log', 'Nouvelle partie : Noir commence.');
    this.emit('change');
  }

  /** État complet de la partie (JSON), pour la sauvegarde. */
  serialize() {
    const { cells, reserve, pyramids, saved, lost, current, phase, dice, moveLimit, pyr, attack, winner, lastAttack } = this;
    return JSON.parse(JSON.stringify({ cells, reserve, pyramids, saved, lost, current, phase, dice, moveLimit: Number.isFinite(moveLimit) ? moveLimit : null, pyr, attack, winner, lastAttack }));
  }

  load(data) {
    Object.assign(this, data, { moveLimit: data.moveLimit ?? Infinity });
    this._change();
  }

  die() { return 1 + Math.floor(this.rng() * 6); }
  pyramidDie() { return PYRAMID_DIE[Math.floor(this.rng() * PYRAMID_DIE.length)]; }
  name(p = this.current) { return PLAYER_NAMES[p]; }
  get over() { return this.phase === 'over'; }

  pionsOnBoard(p) {
    return Object.values(this.cells).reduce((n, c) => n + (c.owner === p ? c.count : 0), 0);
  }

  /** Pions encore à jouer : sur le plateau + dans le camp (hors plateau). */
  pionsLeft(p) { return this.pionsOnBoard(p) + this.reserve[p]; }

  isBlocked(id, player = this.current) {
    return this.pyramids.includes(id) || (this.cells[id] && this.cells[id].owner !== player);
  }

  _log(msg) { this.emit('log', msg); }
  _change() { this.emit('change'); }

  _take(id, n = 1) {
    if (id === RESERVE) { this.reserve[this.current] -= n; return; }
    const c = this.cells[id];
    c.count -= n;
    if (c.count <= 0) delete this.cells[id];
  }

  _put(id, owner, n = 1) {
    if (this.cells[id]) this.cells[id].count += n;
    else this.cells[id] = { owner, count: n };
  }

  _checkOver() {
    if (this.over) return true;
    const out = [0, 1].find((p) => this.pionsLeft(p) === 0);
    if (out === undefined) return false;
    this.phase = 'over';
    this.winner = this.saved[0] === this.saved[1] ? null : this.saved[0] > this.saved[1] ? 0 : 1;
    this._log(`${this.name(out)} n'a plus de pions : fin de partie (${this.saved[0]} - ${this.saved[1]}).`);
    this.emit('over', { winner: this.winner, saved: [...this.saved] });
    this._change();
    return true;
  }

  endTurn() {
    if (this._checkOver()) return;
    this.current = 1 - this.current;
    this.phase = 'idle';
    this.dice = [];
    this.moveLimit = Infinity;
    this.pyr = null;
    this.attack = null;
    this._log(`Au tour de ${this.name()}.`);
    this._change();
  }

  /* ---------- Lancer des dés et déplacement des pions ---------- */

  roll() {
    if (this.phase !== 'idle') return false;
    const v = [this.die(), this.die(), this.die()];
    this.dice = v.map((x) => ({ v: x, used: false }));
    this.moveLimit = Infinity;
    this.lastAttack = null;
    const [a] = v;
    const kinds = new Set(v).size;
    if (kinds === 1) {
      this.dice[0].used = this.dice[1].used = true;
      this.moveLimit = 1;
      const values = [this.pyramidDie(), this.pyramidDie()];
      this.pyr = { steps: 0, values, triple: true };
      this.phase = 'pyrChoose';
      this._log(`${this.name()} fait un TRIPLE ${a} ! Dé pyramide : ${values[0]} et ${values[1]}.`);
      this._change();
      return true;
    }
    if (kinds === 2) {
      const odd = v.findIndex((x) => v.filter((y) => y === x).length === 1);
      this.dice.forEach((d, i) => { d.used = i !== odd; });
      this.moveLimit = 1;
      const steps = this.pyramidDie();
      this.pyr = { steps, values: [steps], triple: false };
      this.phase = 'pyramid';
      this._log(`${this.name()} fait un DOUBLE ! La pyramide avance de ${steps}.`);
      this._change();
      return true;
    }
    this._log(`${this.name()} lance les dés : ${v.join(', ')}.`);
    this._startMove();
    return true;
  }

  freeDice() { return this.dice.map((d, i) => (d.used ? -1 : i)).filter((i) => i >= 0); }

  /** Cases atteignables par un pion de `player` partant de `from` en exactement `n` pas. */
  destinations(from, n, player = this.current) {
    const layers = this._layers(from, n, player);
    return [...layers[n]];
  }

  _next(id, k, n, player) {
    const out = (id === RESERVE ? startCells(player) : [...NEIGHBORS[id]]).filter((m) => !this.isBlocked(m, player));
    if (k === n - 1 && isGoal(id, player)) out.push(EXIT);
    return out;
  }

  _layers(from, n, player) {
    const layers = [new Set([from])];
    for (let k = 0; k < n; k++) {
      const next = new Set();
      layers[k].forEach((id) => this._next(id, k, n, player).forEach((m) => next.add(m)));
      layers.push(next);
    }
    return layers;
  }

  /** Un chemin de exactement `n` pas de `from` à `to` (pour animer le déplacement), départ et arrivée inclus. */
  path(from, to, n, player = this.current) {
    const layers = this._layers(from, n, player);
    const path = [to];
    for (let k = n - 1; k >= 0; k--) {
      const target = path[0];
      path.unshift([...layers[k]].find((id) => this._next(id, k, n, player).includes(target)));
    }
    return path;
  }

  ownCells(player = this.current) {
    return Object.keys(this.cells).filter((id) => this.cells[id].owner === player);
  }

  /** Pions déplaçables : les cases occupées, plus le camp (hors plateau) s'il reste des pions à entrer. */
  sources(player = this.current) {
    return this.reserve[player] > 0 ? [RESERVE, ...this.ownCells(player)] : this.ownCells(player);
  }

  movesPossible() {
    const sums = new Set(subsets(this.freeDice()).filter((s) => this.moveLimit > 1 || s.length === 1).map((s) => s.reduce((t, i) => t + this.dice[i].v, 0)));
    return this.sources().some((id) => [...sums].some((n) => this.destinations(id, n).length));
  }

  _startMove() {
    if (this._checkOver()) return;
    if (!this.movesPossible()) {
      this._log(`${this.name()} ne peut effectuer aucun déplacement.`);
      this.endTurn();
      return;
    }
    this.phase = 'move';
    this._change();
  }

  move(from, to, idxs) {
    if (this.phase !== 'move' || !idxs.length || new Set(idxs).size !== idxs.length) return false;
    if (idxs.some((i) => !this.dice[i] || this.dice[i].used) || (this.moveLimit === 1 && idxs.length > 1)) return false;
    if (!this.sources().includes(from)) return false;
    const n = idxs.reduce((t, i) => t + this.dice[i].v, 0);
    if (!this.destinations(from, n).includes(to)) return false;
    this.emit('moved', { player: this.current, from, to, path: this.path(from, to, n) });
    this._take(from);
    idxs.forEach((i) => { this.dice[i].used = true; });
    this.moveLimit -= 1;
    if (to === EXIT) {
      this.saved[this.current] += 1;
      this._log(`${this.name()} sort du plateau et sauve un pion ! (${this.saved[this.current]})`);
      this.emit('saved', { player: this.current, at: to });
    } else this._put(to, this.current);
    if (this._checkOver()) return true;
    if (!this.freeDice().length || this.moveLimit <= 0 || !this.movesPossible()) this.endTurn();
    else this._change();
    return true;
  }

  /* ---------- Pyramide ---------- */

  choosePyramid(value) {
    if (this.phase !== 'pyrChoose' || !this.pyr.values.includes(value)) return false;
    this.pyr.steps = value;
    this.phase = 'pyramid';
    this._log(`${this.name()} choisit ${value} pour la pyramide.`);
    this._change();
    return true;
  }

  pyramidOptions() {
    if (this.phase !== 'pyramid') return [];
    return forwardNeighbors(this.pyramids[this.current] ?? BASE, this.current);
  }

  pyramidStep(node) {
    if (!this.pyramidOptions().includes(node)) return false;
    const me = this.current;
    const cell = this.cells[node];
    if (cell) {
      this.lost[cell.owner] += cell.count;
      this._log(`La pyramide écrase ${cell.count} pion${cell.count > 1 ? 's' : ''} ${this.name(cell.owner).toLowerCase()}${cell.count > 1 ? 's' : ''}.`);
      this.emit('crush', { at: node, owner: cell.owner, count: cell.count });
      delete this.cells[node];
    }
    const other = this.pyramids.findIndex((p, i) => i !== me && p === node);
    if (other >= 0) {
      this.pyramids[other] = null;
      this._log(`La pyramide ${this.name(other).toLowerCase()} est renvoyée dans son camp.`);
    }
    this.pyramids[me] = node;
    this.pyr.steps -= 1;
    if (isGoal(node, me)) {
      this.pyramids[me] = null;
      this.pyr.steps = 0;
      this._log('La pyramide atteint le camp adverse et retourne dans sa base.');
    }
    if (this._checkOver()) return true;
    if (this.pyr.steps <= 0) this._afterPyramid();
    else this._change();
    return true;
  }

  _afterPyramid() {
    if (this.pyr.triple && this.pionsOnBoard(1 - this.current) > 0) {
      this.phase = 'tripleKill';
      this._log(`${this.name()} peut supprimer un pion adverse au choix.`);
      this._change();
    } else this._startMove();
  }

  removeEnemy(node) {
    if (this.phase !== 'tripleKill' || this.cells[node]?.owner !== 1 - this.current) return false;
    this.lost[1 - this.current] += 1;
    this._take(node);
    this._log(`${this.name()} supprime un pion ${this.name(1 - this.current).toLowerCase()}.`);
    this.emit('crush', { at: node, owner: 1 - this.current, count: 1 });
    if (this._checkOver()) return true;
    this._startMove();
    return true;
  }

  /* ---------- Attaque ---------- */

  attackOptions() {
    const froms = this.phase === 'attackFollow' ? [this.attack.to] : this.ownCells();
    const out = [];
    froms.forEach((from) => NEIGHBORS[from].forEach((to) => {
      if (this.cells[to]?.owner === 1 - this.current) out.push({ from, to });
    }));
    return out;
  }

  beginAttack() {
    if (this.phase !== 'idle' || !this.attackOptions().length) return false;
    this.phase = 'attackSelect';
    this._change();
    return true;
  }

  cancelAttack() {
    if (this.phase !== 'attackSelect') return false;
    this.phase = 'idle';
    this._change();
    return true;
  }

  attackBattalion(from, to) {
    if (!['attackSelect', 'attackFollow'].includes(this.phase)) return false;
    if (!this.attackOptions().some((o) => o.from === from && o.to === to)) return false;
    this.attack = { from, to, first: this.phase === 'attackSelect' };
    this.phase = 'attack';
    this._log(`${this.name()} déclare l'attaque !`);
    this._change();
    return true;
  }

  attackRound() {
    if (this.phase !== 'attack') return null;
    const { from, to, first } = this.attack;
    const me = this.current;
    const att = this.cells[from];
    const def = this.cells[to];
    const attDie = this.die();
    const defDie = this.die();
    const attScore = attDie + att.count;
    const defScore = defDie + def.count;
    const attackerLoses = attScore <= defScore;
    const loser = attackerLoses ? me : 1 - me;
    const result = { attDie, defDie, attScore, defScore, attackerLoses, attackerCount: att.count, defenderCount: def.count };
    this.lost[loser] += 1;
    this._take(attackerLoses ? from : to);
    this.lastAttack = result;
    this._log(`Attaque : ${attScore} (dé ${attDie} + ${result.attackerCount}) contre ${defScore} (dé ${defDie} + ${result.defenderCount}) : ${this.name(loser)} perd un pion.`);
    this.emit('attackRound', result);
    if (this._checkOver()) return result;
    const attAlive = this.cells[from];
    const defAlive = this.cells[to];
    if (attAlive && defAlive) { this._change(); return result; }
    if (!attAlive) {
      this.cells[from] = defAlive;
      delete this.cells[to];
      this._log(`${this.name(1 - me)} prend la place de ${this.name(me).toLowerCase()}.`);
      this.endTurn();
      return result;
    }
    this.cells[to] = attAlive;
    delete this.cells[from];
    this._log(`${this.name(me)} prend la place de ${this.name(1 - me).toLowerCase()}.`);
    this.attack = { from: to, to, first };
    if (first && this._hasFollowUp(to)) {
      this.phase = 'attackFollow';
      this._change();
    } else this.endTurn();
    return result;
  }

  _hasFollowUp(at) {
    return [...NEIGHBORS[at]].some((n) => this.cells[n]?.owner === 1 - this.current);
  }

  endAttackTurn() {
    if (this.phase !== 'attackFollow') return false;
    this.endTurn();
    return true;
  }
}
