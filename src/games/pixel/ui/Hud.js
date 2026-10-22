import { LEVEL_COUNT, levelTests } from '../core/levels/index.js';
import { loadProgress } from '../api/levelTests.js';

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
      <div class="hud-goal"><label>Objectif</label><b data-k="goal"></b><div class="hud-tests"></div></div>
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
    this.testsEl = root.querySelector('.hud-tests');
    this.failed = new Set();
    this.running = null;
    game.events.on('levelLoaded', () => this.renderTests());
    game.events.on('testRunning', (r) => { this.running = `${r.level}:${r.index}`; this.renderTests(); });
    game.events.on('testResult', (r) => {
      this.running = null;
      this.failed[r.ok ? 'delete' : 'add'](`${r.level}:${r.index}`);
      this.renderTests();
    });
    this.update();
    this.renderTests();
  }

  /** Tests validés du niveau courant (vert = validé, rouge = échec du dernier essai), comme sur CodinGame. */
  renderTests() {
    const n = this.game.level?.n;
    if (!n) return;
    const tests = levelTests(n);
    const passed = loadProgress()[n] ?? {};
    const done = tests.filter((t) => passed[t.index]).length;
    this.testsEl.innerHTML = `<span class="hud-tests-count">Tests validés : <b>${done} / ${tests.length}</b></span>` + tests.map((t) => {
      const key = `${n}:${t.index}`;
      const cls = this.running === key ? 'running' : passed[t.index] ? 'ok' : this.failed.has(key) ? 'ko' : '';
      return `<span class="chip ${cls}" title="${t.name}">${passed[t.index] ? '✓' : this.failed.has(key) ? '✗' : t.index + 1}</span>`;
    }).join('');
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
