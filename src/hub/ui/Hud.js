import { CFG } from '../core/SpaceGame.js';

/** HUD du hub : points de vie (cœurs), score, bandeau d'orbite. Écoute uniquement les évènements du jeu. */
export class Hud {
  constructor(root, game) {
    this.hearts = root.querySelector('#hearts');
    this.score = root.querySelector('#score-value');
    this.banner = root.querySelector('#orbit-banner');
    this.flash = root.querySelector('#flash');
    this.max = 0;
    this.setHp(game.ship.hp, CFG.ship.maxHp);

    const { events } = game;
    events.on('hp', ({ hp, max }) => this.setHp(hp, max));
    events.on('score', ({ score }) => { this.score.textContent = score; });
    events.on('shipHit', () => this.hitFlash());
    events.on('orbitEnter', ({ planet }) => planet.status !== 'open' && this.showOrbit(planet));
    events.on('orbitLeave', () => this.hideOrbit());
    events.on('respawn', () => this.hideOrbit());
  }

  setHp(hp, max) {
    if (max !== this.max) {
      this.max = max;
      this.hearts.replaceChildren(...Array.from({ length: max }, () => {
        const s = document.createElement('span');
        s.className = 'heart';
        s.textContent = '♥';
        return s;
      }));
    }
    [...this.hearts.children].forEach((h, i) => h.classList.toggle('lost', i >= hp));
    this.hearts.setAttribute('aria-label', `Points de vie : ${hp} sur ${max}`);
  }

  hitFlash() {
    this.flash.classList.remove('on');
    void this.flash.offsetWidth;
    this.flash.classList.add('on');
  }

  showOrbit(planet, forced) {
    const open = planet.status === 'open';
    this.banner.innerHTML = `<strong></strong><span></span>`;
    this.banner.firstChild.textContent = planet.name;
    this.banner.lastChild.textContent = forced ?? (open ? 'Reste dans l\'orbite pour atterrir…' : 'En téraformation — bientôt disponible');
    this.banner.classList.toggle('building', !open);
    this.banner.classList.add('show');
  }

  hideOrbit() {
    this.banner.classList.remove('show');
  }
}
