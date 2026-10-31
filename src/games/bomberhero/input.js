const DEAD = 0.5;
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'NumpadDecimal', 'Numpad3', 'Numpad0']);
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/**
 * Entrées des joueurs : clavier (touches propres à chaque joueur) et manettes (la manette n°i pilote le joueur i,
 * en plus de son clavier). `read(i)` donne la direction voulue ; `onAction(i, 'bomb'|'power')` est appelé sur front montant.
 */
export class Input {
  constructor(players, { onAction, onConfirm } = {}) {
    this.players = players;
    this.onAction = onAction;
    this.onConfirm = onConfirm;
    this.enabled = false;
    this.count = players.length;
    this.down = new Map();
    this.pads = new Map();
    window.addEventListener('keydown', (e) => this.keydown(e));
    window.addEventListener('keyup', (e) => this.names(e).forEach((n) => this.down.delete(n)));
    window.addEventListener('blur', () => this.down.clear());
  }

  names(e) {
    return [e.code, e.key?.length === 1 ? e.key.toLowerCase() : e.key];
  }

  keydown(e) {
    if (e.target instanceof HTMLInputElement) return;
    const names = this.names(e);
    if (this.enabled && names.some((n) => GAME_KEYS.has(n))) e.preventDefault();
    if (e.repeat) return;
    const now = performance.now();
    names.forEach((n) => this.down.set(n, now));
    if (!this.enabled) return;
    for (let i = 0; i < this.count; i++) {
      const k = this.players[i].keys;
      if (names.some((n) => k.bomb.includes(n))) this.onAction?.(i, 'bomb');
      if (names.some((n) => k.power.includes(n))) this.onAction?.(i, 'power');
    }
  }

  /** Direction demandée (la dernière touche pressée l'emporte). */
  read(i) {
    let best = null, bestT = -1;
    const k = this.players[i].keys;
    for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
      for (const n of k[dir]) {
        const t = this.down.get(n);
        if (t !== undefined && t > bestT) { best = [dx, dy]; bestT = t; }
      }
    }
    const pad = this.padOf(i);
    if (pad && !best) {
      const [ax, ay] = [pad.axes[0] ?? 0, pad.axes[1] ?? 0];
      const b = (n) => pad.buttons[n]?.pressed;
      if (b(14) || ax < -DEAD && Math.abs(ax) >= Math.abs(ay)) best = [-1, 0];
      else if (b(15) || ax > DEAD && Math.abs(ax) >= Math.abs(ay)) best = [1, 0];
      else if (b(12) || ay < -DEAD) best = [0, -1];
      else if (b(13) || ay > DEAD) best = [0, 1];
    }
    return best ?? [0, 0];
  }

  connectedPads() {
    return (navigator.getGamepads?.() ?? []).filter(Boolean);
  }

  padOf(i) {
    return this.connectedPads()[i] ?? null;
  }

  /** À appeler à chaque image : boutons des manettes (front montant). */
  poll() {
    this.connectedPads().forEach((pad, i) => {
      const prev = this.pads.get(pad.index) ?? [];
      const now = pad.buttons.map((b) => b.pressed);
      const edge = (n) => now[n] && !prev[n];
      if (this.enabled && i < this.count) {
        if (edge(0) || edge(5)) this.onAction?.(i, 'bomb');
        if (edge(1) || edge(2) || edge(4)) this.onAction?.(i, 'power');
      }
      if (edge(0) || edge(9)) this.onConfirm?.();
      this.pads.set(pad.index, now);
    });
  }
}
