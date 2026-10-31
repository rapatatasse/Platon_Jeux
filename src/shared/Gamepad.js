const BUTTONS = { 0: 'a', 1: 'b', 2: 'x', 3: 'y', 4: 'lb', 5: 'rb', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };

/**
 * Manettes partagées par les jeux : croix directionnelle et stick gauche (numérisé) + boutons A B X Y LB RB Start,
 * fusionnés sur toutes les manettes branchées. `held(nom)` = maintenu ; `on(nom, fn)` = front montant (à appeler avec `poll()` à chaque image).
 */
export class GamepadInput {
  constructor({ deadzone = 0.45 } = {}) {
    this.deadzone = deadzone;
    this.prev = new Set();
    this.now = new Set();
    this.handlers = new Map();
    this.pollers = [];
  }

  pads() {
    return (navigator.getGamepads?.() ?? []).filter(Boolean);
  }

  get connected() {
    return this.pads().length > 0;
  }

  held(...names) {
    return names.some((n) => this.now.has(n));
  }

  on(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, []);
    this.handlers.get(name).push(fn);
  }

  /**
   * Direction visée par le stick gauche ou la croix : [x, y] en repère écran (y vers le bas), ou null au repos.
   * La croix donne 8 directions, le stick un angle précis.
   */
  vector() {
    for (const pad of this.pads()) {
      const b = (i) => (pad.buttons[i]?.pressed ? 1 : 0);
      const dx = b(15) - b(14), dy = b(13) - b(12);
      if (dx || dy) return [dx, dy];
      const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
      if (Math.hypot(ax, ay) > this.deadzone) return [ax, ay];
    }
    return null;
  }

  /** Angle du monde (radians, y vers le haut, 0 = droite) pour le stick / la croix, ou null au repos. */
  aim() {
    const v = this.vector();
    return v ? Math.atan2(-v[1], v[0]) : null;
  }

  poll() {
    const now = new Set();
    for (const pad of this.pads()) {
      pad.buttons.forEach((b, i) => { if (b.pressed && BUTTONS[i]) now.add(BUTTONS[i]); });
      const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
      if (ax < -this.deadzone) now.add('left');
      if (ax > this.deadzone) now.add('right');
      if (ay < -this.deadzone) now.add('up');
      if (ay > this.deadzone) now.add('down');
    }
    this.now = now;
    for (const name of now) if (!this.prev.has(name)) this.handlers.get(name)?.forEach((fn) => fn());
    this.prev = now;
    this.pollers.forEach((fn) => fn());
  }
}

/**
 * Navigation à la manette dans les fenêtres ouvertes : directions pour changer de bouton, A pour valider.
 * `menus` = [{ selector, columns? }] ; une fenêtre est ouverte quand elle a la classe `active`
 * (ou la fonction `isOpen`). `columns` : grille (haut/bas saute d'une rangée, sans boucler).
 */
export function bindPadMenus(pad, menus, { isOpen = (el) => el.classList.contains('active') } = {}) {
  let index = -1, current = null;
  const open = () => menus.map((m) => ({ ...m, el: document.querySelector(m.selector) })).find((m) => m.el && isOpen(m.el));
  const buttons = (m) => [...m.el.querySelectorAll('button')].filter((b) => b.offsetParent !== null && !b.disabled);
  const mark = (m) => {
    const list = buttons(m);
    list.forEach((b, i) => b.classList.toggle('pad-focus', i === index));
    list[index]?.focus({ preventScroll: true });
  };
  const move = (delta, vertical) => {
    const m = open();
    const list = m && buttons(m);
    if (!list?.length) return;
    const step = vertical && m.columns ? delta * m.columns : delta;
    const target = index + step;
    index = m.columns ? Math.max(0, Math.min(list.length - 1, target)) : (target + list.length) % list.length;
    mark(m);
  };
  pad.pollers.push(() => {
    const m = open(), sel = m?.selector ?? null;
    if (sel === current) return;
    document.querySelectorAll('.pad-focus').forEach((b) => b.classList.remove('pad-focus'));
    current = sel; index = 0;
    if (m) mark(m);
  });
  pad.on('left', () => move(-1, false));
  pad.on('right', () => move(1, false));
  pad.on('up', () => move(-1, true));
  pad.on('down', () => move(1, true));
  pad.on('a', () => {
    const m = open();
    if (m) buttons(m)[index]?.click();
  });
}
