// Mini bus d'évènements : la logique émet, le rendu / les sons / l'UI écoutent.
// Permet de garder core/ totalement indépendant de Three.js et du DOM.

export class Emitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    this.listeners.get(event)?.delete(fn);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach((fn) => fn(data));
    this.listeners.get('*')?.forEach((fn) => fn(event, data));
  }
}
