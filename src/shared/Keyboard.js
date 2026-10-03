const BLOCKED = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

/**
 * Suivi clavier partagé. `isDown('ArrowUp')` ; `onPress(code, fn)` pour les actions ponctuelles.
 * Les touches de jeu (flèches, espace) n'agissent plus sur la page tant que `capture` est vrai.
 */
export class Keyboard {
  constructor({ capture = true } = {}) {
    this.down = new Set();
    this.capture = capture;
    this.pressHandlers = new Map();
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (this.capture && BLOCKED.has(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressHandlers.get(e.code)?.forEach((fn) => fn(e));
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  isDown(...codes) {
    return codes.some((c) => this.down.has(c));
  }

  onPress(code, fn) {
    if (!this.pressHandlers.has(code)) this.pressHandlers.set(code, []);
    this.pressHandlers.get(code).push(fn);
  }

  clear() {
    this.down.clear();
  }
}
