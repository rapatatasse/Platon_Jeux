import { compileUserFunction } from '../api/terminalApi.js';

const STORAGE_KEY = 'pixel.functions.v1';

const DEFAULT_FUNCTIONS = [
  {
    name: 'carre',
    code: `function carre(taille) {
  // Dessine un carré : 4 côtés, "taille" pas chacun
  for (let i = 0; i < taille; i++) move(1, 0);
  for (let i = 0; i < taille; i++) move(0, 1);
  for (let i = 0; i < taille; i++) move(-1, 0);
  for (let i = 0; i < taille; i++) move(0, -1);
}`,
  },
  {
    name: 'tirPartout',
    code: `function tirPartout() {
  // Tire dans les 4 directions si on a des balles
  const directions = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
  for (const d of directions) {
    if (BulletsCount > 0) fire(d[0], d[1], d[2]);
  }
}`,
  },
];

/**
 * Éditeur de fonctions : le joueur écrit `function nom(...) { ... }`, enregistre,
 * puis lance la fonction avec un bouton (les arguments sont saisis en JSON).
 * Les fonctions sont conservées dans localStorage et disponibles dans le terminal.
 */
export class FunctionEditor {
  constructor(root, api, log) {
    this.api = api;
    this.log = log;
    this.functions = this.load();

    root.innerHTML = `
      <div class="panel-title">Mes fonctions <button class="btn-small" data-action="new">+ nouvelle</button></div>
      <div class="fn-list"></div>
      <textarea class="fn-code" spellcheck="false" rows="8" placeholder="function avance(n) {\n  for (let i = 0; i < n; i++) move(1, 0);\n}"></textarea>
      <div class="fn-actions">
        <button class="btn" data-action="save">Enregistrer</button>
        <span class="fn-hint">Puis dans le terminal : <code>avance(3)</code></span>
      </div>
    `;
    this.listEl = root.querySelector('.fn-list');
    this.codeEl = root.querySelector('.fn-code');
    root.querySelector('[data-action="save"]').onclick = () => this.save();
    root.querySelector('[data-action="new"]').onclick = () => { this.codeEl.value = ''; this.codeEl.focus(); };
    this.codeEl.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { e.preventDefault(); this.insertAtCursor('  '); }
      if (e.key === 'Enter' && e.ctrlKey) this.save();
    });

    for (const f of this.functions) this.compile(f, true);
    this.renderList();
  }

  insertAtCursor(text) {
    const { selectionStart: s, selectionEnd: e, value } = this.codeEl;
    this.codeEl.value = value.slice(0, s) + text + value.slice(e);
    this.codeEl.selectionStart = this.codeEl.selectionEnd = s + text.length;
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(saved) ? saved : DEFAULT_FUNCTIONS;
    } catch {
      return DEFAULT_FUNCTIONS;
    }
  }

  persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.functions));
  }

  compile(f, silent = false) {
    try {
      const { name } = compileUserFunction(this.api, f.code);
      f.name = name;
      return true;
    } catch (err) {
      if (!silent) this.log('error', `Fonction invalide : ${err.message}`);
      return false;
    }
  }

  save() {
    const code = this.codeEl.value.trim();
    if (!code) return;
    const f = { code };
    if (!this.compile(f)) return;
    const idx = this.functions.findIndex((x) => x.name === f.name);
    if (idx >= 0) this.functions[idx] = f; else this.functions.push(f);
    this.persist();
    this.renderList();
    this.log('info', `Fonction "${f.name}" enregistrée. Appelle-la dans le terminal : ${f.name}(...)`);
  }

  remove(name) {
    this.functions = this.functions.filter((f) => f.name !== name);
    delete this.api.userFns[name];
    this.persist();
    this.renderList();
  }

  run(f, argsText) {
    let args = [];
    if (argsText.trim()) {
      try { args = JSON.parse(`[${argsText}]`); } catch { this.log('error', `Arguments invalides : "${argsText}" (ex : 3  ou  1, 2)`); return; }
    }
    this.log('cmd', `> ${f.name}(${argsText})`);
    try {
      const r = this.api.userFns[f.name](...args);
      if (r instanceof Promise) r.catch((err) => this.log('error', `Erreur dans ${f.name} : ${err.message}`));
      else if (r !== undefined) this.log('result', JSON.stringify(r));
    } catch (err) {
      this.log('error', `Erreur dans ${f.name} : ${err.message}`);
    }
  }

  renderList() {
    this.listEl.innerHTML = '';
    if (!this.functions.length) {
      this.listEl.innerHTML = '<div class="fn-empty">Aucune fonction. Écris-en une ci-dessous.</div>';
      return;
    }
    for (const f of this.functions) {
      const row = document.createElement('div');
      row.className = 'fn-row';
      row.innerHTML = `
        <span class="fn-name">${f.name}(</span><input class="fn-args" placeholder="args" /><span class="fn-name">)</span>
        <button class="btn-small" data-a="run">Lancer</button>
        <button class="btn-small" data-a="edit">Éditer</button>
        <button class="btn-small danger" data-a="del">X</button>
      `;
      const args = row.querySelector('.fn-args');
      row.querySelector('[data-a="run"]').onclick = () => this.run(f, args.value);
      args.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.run(f, args.value); });
      row.querySelector('[data-a="edit"]').onclick = () => { this.codeEl.value = f.code; this.codeEl.focus(); };
      row.querySelector('[data-a="del"]').onclick = () => this.remove(f.name);
      this.listEl.appendChild(row);
    }
  }
}
