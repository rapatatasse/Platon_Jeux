/** Bandeaux (niveau réussi, nouveau niveau) et fenêtres de fin (victoire / défaite). */
export class Overlay {
  constructor(root, game, { onRestart }) {
    this.root = root;
    this.game = game;
    this.onRestart = onRestart;
    root.className = 'overlay hidden';

    game.events.on('levelComplete', ({ level, next }) => this.showBanner(
      `Niveau ${level} réussi !`,
      next ? `Prochain niveau : ${next.name}` : 'Dernier niveau terminé…',
      'success',
      (game.tickMs * 6) / 1000,
    ));
    game.events.on('levelLoaded', () => this.hide());   // ferme aussi l'écran "Perdu" lors d'un saut de niveau
    game.events.on('levelUp', ({ to }) => this.showBanner(`Niveau ${to} · ${game.level.name}`, game.level.intro, 'level', 5));
    game.events.on('won', ({ score }) => this.showEnd('Victoire !', `Tu as terminé tous les niveaux. Score : <b>${score}</b>`, 'win'));
    game.events.on('gameOver', ({ reason, score, level }) => this.showEnd('Perdu…', `${reason}<br>Score : <b>${score}</b> · Niveau atteint : <b>${level}</b>`, 'lose'));
  }

  showBanner(title, sub, kind, seconds) {
    this.root.innerHTML = `<div class="banner banner-${kind}"><h2>${title}</h2><p>${sub}</p></div>`;
    this.root.classList.remove('hidden');
    this.root.classList.add('transparent');
    clearTimeout(this._t);
    this._t = setTimeout(() => this.hide(), seconds * 1000);
  }

  showEnd(title, html, kind) {
    clearTimeout(this._t);
    this.root.classList.remove('transparent');
    this.root.innerHTML = `
      <div class="modal modal-${kind}">
        <h2>${title}</h2>
        <p>${html}</p>
        <button class="btn" data-action="restart">Rejouer</button>
      </div>`;
    this.root.querySelector('[data-action="restart"]').onclick = () => this.onRestart();
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
  }
}
