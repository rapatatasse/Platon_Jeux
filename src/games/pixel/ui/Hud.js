import { LEVEL_COUNT } from '../core/levels/index.js';

/** Affichage des stats (niveau, balles, cubes, file...). Mis à jour à chaque tick. */
export class Hud {
  constructor(root, game) {
    this.game = game;
    root.innerHTML = `
      <div class="hud-row">
        <span class="hud-title">PIXEL</span>
        <span class="hud-level-nav">
          <button class="btn-small" data-nav="-1" title="Niveau précédent (test)">◀</button>
          <span class="hud-level"></span>
          <button class="btn-small" data-nav="1" title="Niveau suivant (test)">▶</button>
        </span>
      </div>
      <div class="hud-goal"><label>Objectif</label><b data-k="goal"></b></div>
      <div class="hud-grid">
        <div><label>Cubes</label><b data-k="cubes"></b></div>
        <div><label>Balles</label><b data-k="bullets"></b></div>
        <div><label>Score</label><b data-k="score"></b></div>
        <div><label>File</label><b data-k="queue"></b></div>
        <div><label>Position</label><b data-k="position"></b></div>
        <div><label>Tick</label><b data-k="tick"></b></div>
      </div>
      <div class="hud-progress"><div class="hud-progress-bar"></div></div>
      <div class="hud-legend">
        <span><i style="background:#ff2d2d"></i>toi</span>
        <span><i style="background:#ffd400"></i>jaune : à ramasser</span>
        <span><i style="background:#9b30ff"></i>violet : danger</span>
        <span><i style="background:#f0f0f0"></i>blanc : mur</span>
        <span><i style="background:#2fa8ff"></i>bleu : porte</span>
      </div>
    `;
    this.els = Object.fromEntries([...root.querySelectorAll('[data-k]')].map((el) => [el.dataset.k, el]));
    this.levelEl = root.querySelector('.hud-level');
    this.navBtns = [...root.querySelectorAll('[data-nav]')];
    for (const b of this.navBtns) b.onclick = () => game.jumpToLevel(game.level.n + Number(b.dataset.nav));
    this.bar = root.querySelector('.hud-progress-bar');
    this.update();
  }

  update() {
    const s = this.game.snapshot();
    this.levelEl.textContent = `Niveau ${s.level} · ${s.levelName}`;
    this.navBtns[0].disabled = s.level <= 1;
    this.navBtns[1].disabled = s.level >= LEVEL_COUNT;
    this.els.goal.textContent = `${s.goalLabel} : ${s.goalProgress} / ${s.goal.count}`;
    this.els.cubes.textContent = s.cubes;
    this.els.bullets.textContent = s.bullets;
    this.els.score.textContent = s.score;
    this.els.queue.textContent = s.queue;
    this.els.tick.textContent = `${s.tickMs} ms`;
    this.els.position.textContent = `${s.position.x}, ${s.position.z}`;
    this.bar.style.width = `${Math.min(100, (s.goalProgress / s.goal.count) * 100)}%`;
  }
}
