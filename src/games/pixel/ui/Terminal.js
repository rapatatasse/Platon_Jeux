import { evaluate, format } from '../api/terminalApi.js';

const MAX_LINES = 300;

/**
 * Terminal : zone de log + ligne de saisie JS avec historique (flèches haut/bas).
 * Un tableau tapé directement (ex : [1, 0]) est envoyé comme commande.
 */
export class Terminal {
  constructor(root, api) {
    this.api = api;
    this.history = [];
    this.historyIndex = -1;

    root.innerHTML = `
      <div class="panel-title">Terminal
        <button class="btn-small stop" data-action="stop" title="Vide la file : arrête les commandes en attente">■ STOP</button>
        <button class="btn-small" data-action="help" title="Ouvre la page d'aide (commandes, scanner, bases de JavaScript)">Aide</button>
        <button class="btn-small" data-action="clear">clear()</button>
        <button class="btn-small" data-action="reset" title="Recommence le niveau sans recharger la page">reset()</button>
      </div>
      <div class="term-log"></div>
      <div class="term-input-row"><span class="prompt">&gt;</span><input class="term-input" spellcheck="false" placeholder="move(1, 0)   ou   for (let i = 0; i < 5; i++) move(0, 1)" /></div>
    `;
    this.logEl = root.querySelector('.term-log');
    this.input = root.querySelector('.term-input');

    root.querySelector('[data-action="stop"]').onclick = () => this.exec('stop()');
    root.querySelector('[data-action="help"]').onclick = () => window.open('/games/pixel/aide/', '_blank', 'noopener');
    root.querySelector('[data-action="clear"]').onclick = () => this.exec('clear()');

    root.querySelector('[data-action="reset"]').onclick = () => this.exec('reset()');

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const code = this.input.value.trim();
        this.input.value = '';
        if (code) this.exec(code);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigate(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigate(1);
      }
    });
  }

  navigate(dir) {
    if (!this.history.length) return;
    this.historyIndex = Math.max(0, Math.min(this.history.length, this.historyIndex + dir));
    this.input.value = this.history[this.historyIndex] ?? '';
  }

  /** Exécute une ligne de code avec l'API en portée. */
  exec(code) {
    this.history.push(code);
    this.historyIndex = this.history.length;
    this.log('cmd', `> ${code}`);
    try {
      const result = evaluate(this.api, code);
      if (result instanceof Promise) result.catch((err) => this.log('error', `Erreur JS : ${err.message}`));
      else if (result !== undefined) this.log('result', format(result));
    } catch (err) {
      this.log('error', `Erreur JS : ${err.message}`);
      if (err instanceof SyntaxError) {
        this.log('help', /;/.test(code)
          ? 'Astuce : sépare les valeurs par des virgules, pas des points-virgules. Exemple : move(1, 0)'
          : 'Astuce : une commande s\'écrit avec des parenthèses. Exemple : move(1, 0). Tape help() pour la liste.');
      }
    }
  }

  /** kind : cmd | result | info | error | event | help | clear */
  log(kind, text = '') {
    if (kind === 'clear') { this.logEl.innerHTML = ''; return; }
    const line = document.createElement('div');
    line.className = `line line-${kind}`;
    line.textContent = text;
    this.logEl.appendChild(line);
    while (this.logEl.childElementCount > MAX_LINES) this.logEl.firstChild.remove();
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  focus() {
    this.input.focus();
  }
}
