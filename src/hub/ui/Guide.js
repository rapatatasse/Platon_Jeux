const BASE = import.meta.env.BASE_URL;

/**
 * Platon, le personnage guide : une bulle de texte qui commente ce qui se passe.
 * `say(texte, { point })` ; `point` bascule sur l'image où il montre du doigt.
 */
export class Guide {
  constructor(root, game) {
    this.root = root;
    this.img = root.querySelector('img');
    this.bubble = root.querySelector('#bubble');
    this.timer = 0;
    this.lastSaid = new Map();

    root.querySelector('button').addEventListener('click', () => this.say(this.help, { point: true, force: true, ms: 9000 }));
    this.help = 'Flèche haut : avancer. Flèche bas : demi-tour. Gauche et droite : tourner. Espace : tirer. Entre dans l\'anneau d\'une planète pour y jouer. Évite les astéroïdes !';

    const { events } = game;
    this.said = { hit: false, kill: false, enemy: false };
    events.on('orbitEnter', ({ planet }) => {
      if (planet.status !== 'open') this.say(`${planet.name} est en téraformation. Revenez bientôt, les ouvriers terminent leur travail !`, { point: true, ms: 6000 });
    });
    events.on('launchGame', ({ planet }) => this.say(`En route vers ${planet.name} !`, { force: true, ms: 3000 }));
    events.on('shipHit', ({ cause }) => {
      if (cause === 'asteroid' && !this.said.hit) { this.said.hit = true; this.say('Aïe ! Évite les astéroïdes ou fais-les exploser avec Espace.', { ms: 5000 }); }
    });
    events.on('asteroidDestroyed', () => {
      if (!this.said.kill) { this.said.kill = true; this.say('Bien visé ! Chaque astéroïde détruit rapporte des points.', { ms: 4000 }); }
    });
    events.on('enemySpawn', () => {
      if (!this.said.enemy) { this.said.enemy = true; this.say('Attention, un engin hostile approche ! Il tire lentement : esquive et réplique.', { point: true, ms: 6000 }); }
    });
    events.on('shipDestroyed', () => this.say('Pas de panique : on répare ton vaisseau à Agora, et tu repars !', { force: true, ms: 4500 }));
    events.on('respawn', () => this.say('Bon vol, voyageur !', { ms: 2500 }));
  }

  welcome() {
    this.say('Bienvenue, voyageur ! ' + this.help, { point: true, ms: 10000 });
  }

  say(text, { point = false, ms = 5000, force = false } = {}) {
    const now = performance.now();
    if (!force && now - (this.lastSaid.get(text) ?? -1e9) < 15000) return;
    this.lastSaid.set(text, now);
    this.bubble.textContent = text;
    this.root.classList.add('talking');
    this.img.src = `${BASE}images/${point ? 'platon_montrant' : 'platon'}.png`;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.root.classList.remove('talking');
      this.img.src = `${BASE}images/platon.png`;
    }, ms);
  }
}
