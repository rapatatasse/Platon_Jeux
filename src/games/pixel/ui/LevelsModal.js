import { LEVELS, levelTests } from '../core/levels/index.js';
import { runAllLevelTests, loadProgress, recordResults, passedCount } from '../api/levelTests.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Modale « Niveaux » : liste des niveaux avec le nombre de tests réussis (mémorisés dans localStorage),
 * lancement du mode test (une fonction du joueur jouée seule sur le niveau et ses variantes) et saut vers un niveau.
 * Chaque test peut aussi être joué EN DIRECT sur la carte (LiveTests).
 */
export class LevelsModal {
  constructor(root, { game, editor, live }) {
    this.root = root;
    this.game = game;
    this.editor = editor;
    this.live = live;
    this.progress = loadProgress();
    this.results = {};
    this.running = false;
    root.className = 'levels-modal hidden';
    root.addEventListener('click', (e) => { if (e.target === root) this.close(); });
    game.events.on('testResult', (r) => {
      this.results[r.level] = [...(this.results[r.level] ?? []).filter((x) => x.index !== r.index), r];
    });
  }

  open() {
    this.progress = loadProgress();
    this.render();
    this.root.classList.remove('hidden');
  }

  close() {
    this.root.classList.add('hidden');
  }

  render() {
    const fns = this.editor.functions;
    const selected = this.selected && fns.some((f) => f.name === this.selected) ? this.selected : fns[0]?.name;
    this.selected = selected;
    const rows = LEVELS.map((def, i) => {
      const n = i + 1;
      const tests = levelTests(n);
      const done = passedCount(this.progress, n);
      const chips = tests.map((t) => {
        const r = this.results[n]?.find((x) => x.index === t.index);
        const ok = r ? r.ok : this.progress[n]?.[t.index];
        const cls = r ? (r.ok ? 'ok' : 'ko') : ok ? 'ok' : '';
        const title = `${t.name}${r?.reason ? ` : ${r.reason}` : ''} — clic : jouer ce test en direct sur la carte`;
        return `<button class="chip ${cls}" data-live="${n}:${t.index}" ${fns.length ? '' : 'disabled'} title="${esc(title)}">▶ ${esc(t.name)}${r ? (r.ok ? ` (${r.ticks} pas)` : ' ✗') : ok ? ' ✓' : ''}</button>`;
      }).join('');
      return `<div class="lv-row ${done === tests.length ? 'complete' : ''}">
        <div class="lv-head"><b>Niveau ${n}</b> · ${esc(def.name)} <span class="lv-count">${done} / ${tests.length} tests réussis</span></div>
        <div class="lv-chips">${chips}</div>
        <div class="lv-actions">
          <button class="btn-small" data-play="${n}">Jouer</button>
          <button class="btn-small validate" data-validate="${n}" ${fns.length ? '' : 'disabled'}>Valider le niveau</button>
          <button class="btn-small" data-test="${n}" ${fns.length && !this.running ? '' : 'disabled'}>Test rapide (sans affichage)</button>
        </div>
      </div>`;
    }).join('');

    this.root.innerHTML = `
      <div class="modal levels">
        <div class="lv-title"><h2>Niveaux</h2><button class="btn-small" data-close>Fermer</button></div>
        <p class="lv-help">Le mode test joue une de tes fonctions <b>sans argument</b>, seule, sur le niveau et ses variantes. Écris-la pour qu'elle marche quelle que soit la disposition. Clique sur un test pour le voir se jouer sur la carte.</p>
        <label class="lv-fn">Fonction à tester :
          <select ${fns.length ? '' : 'disabled'}>${fns.map((f) => `<option ${f.name === selected ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select>
        </label>
        ${rows}
      </div>`;
    this.root.querySelector('[data-close]').onclick = () => this.close();
    this.root.querySelector('select').onchange = (e) => { this.selected = e.target.value; };
    for (const b of this.root.querySelectorAll('[data-play]')) {
      b.onclick = () => { this.game.jumpToLevel(Number(b.dataset.play)); this.close(); };
    }
    for (const b of this.root.querySelectorAll('[data-live]')) {
      b.onclick = () => { const [l, i] = b.dataset.live.split(':').map(Number); this.close(); this.live.play(l, i, this.selected); };
    }
    for (const b of this.root.querySelectorAll('[data-validate]')) {
      b.onclick = () => { this.close(); this.live.validate(Number(b.dataset.validate), this.selected); };
    }
    for (const b of this.root.querySelectorAll('[data-test]')) b.onclick = () => this.runTests(Number(b.dataset.test));
  }

  async runTests(level) {
    const f = this.editor.functions.find((x) => x.name === this.selected);
    if (!f || this.running) return;
    this.running = true;
    this.results[level] = [];
    this.render();
    const results = await runAllLevelTests(level, f.code, (r) => { this.results[level].push(r); this.render(); });
    this.progress = recordResults(level, results);
    this.running = false;
    this.render();
  }
}
