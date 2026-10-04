/**
 * Modale affichée à l'entrée en orbite d'une planète ouverte : Platon présente le jeu
 * dans une bulle de BD, avec un bouton pour y entrer. Le jeu du hub est en pause tant qu'elle est ouverte.
 */
export class OrbitModal {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.planet = null;
    this.title = root.querySelector('#om-title');
    this.tagline = root.querySelector('.om-tagline');
    this.desc = root.querySelector('.om-desc');
    this.audience = root.querySelector('.om-aud');
    this.enterBtn = root.querySelector('#om-enter');
    this.stayBtn = root.querySelector('#om-stay');

    this.enterBtn.addEventListener('click', () => this.enter());
    this.stayBtn.addEventListener('click', () => this.close());
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.code === 'Escape') this.close();
      else if (e.code === 'Enter' && document.activeElement !== this.stayBtn) { e.preventDefault(); this.enter(); }
    });
    game.events.on('orbitEnter', ({ planet }) => planet.status === 'open' && this.open(planet));
    game.events.on('orbitLeave', () => this.close());
  }

  get isOpen() {
    return !this.root.hidden;
  }

  open(planet) {
    this.planet = planet;
    this.title.textContent = planet.name;
    this.tagline.textContent = `« ${planet.tagline} »`;
    this.desc.textContent = planet.description;
    this.audience.textContent = planet.audience;
    this.root.hidden = false;
    this.root.parentElement.classList.add('modal-open');
    this.enterBtn.focus();
  }

  close() {
    this.root.hidden = true;
    this.root.parentElement.classList.remove('modal-open');
  }

  enter() {
    const planet = this.planet;
    this.close();
    this.game.enterGame(planet);
  }
}
