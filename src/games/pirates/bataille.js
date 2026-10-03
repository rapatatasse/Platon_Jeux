// ============================================================
//  bataille.js — Système de bataille (multiplications)
// ============================================================
import { CONFIG } from './config.js';

export class BatailleSystem {
    constructor() {
        this.modal      = document.getElementById('battle-modal');
        this.resultEl   = document.getElementById('battle-result');
        this.questionEl = document.getElementById('battle-question');
        this.timerValEl = document.getElementById('timer-value');
        this.timerBar   = document.getElementById('timer-bar');
        this.inputEl    = document.getElementById('battle-input');
        this.submitBtn  = document.getElementById('battle-submit');
        this.enemyLvlEl = document.getElementById('battle-enemy-level');
        this.tableEl    = document.getElementById('battle-table');
        this.titleEl    = document.getElementById('battle-title');
        this.infoEl     = document.getElementById('battle-info');
        this.resultText  = document.getElementById('result-text');
        this.resultPts   = document.getElementById('result-points');
        this.outcomeEl   = document.getElementById('battle-outcome');
        this.timerWrapEl = document.querySelector('.timer-bar-wrap');
        this.timerRowEl  = document.getElementById('battle-timer');

        this.active       = false;
        this._timerIntvl  = null;
        this._onWin       = null;
        this._onLose      = null;
        this._correctAns  = 0;
        this._timeLeft    = CONFIG.BATTLE_TIME;
        this._gainPts     = 0;
        this._lossMsg     = '';
        this.onCheat      = null; // callback déclenché par le code 999
        this.bonusSeconds = 0;   // bonus timer gagné sur les îles

        // Soumission
        this.submitBtn.addEventListener('click', () => this._submit());
        this.inputEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') this._submit();
        });
    }

    // ── Bataille ennemie (multiplication) ─────────────────
    start(enemyLevel, onWin, onLose) {
        const table = enemyLevel + 1;
        const n     = Math.floor(Math.random() * CONFIG.BATTLE_MULTIPLIER_MAX) + 1;
        this._correctAns = table * n;
        this._gainPts    = 5 * enemyLevel;
        this._lossMsg    = `La reponse etait ${table * n}`;

        this.titleEl.textContent = 'BATAILLE !';
        this.infoEl.innerHTML    = `Ennemi niveau ${enemyLevel} &mdash; Multiplication &times;${table}`;
        this.questionEl.textContent = `${table} x ${n} = ?`;

        this._open(onWin, onLose);
    }

    // ── Defi d'ile (multiplication grands nombres) ────────
    startIle(islandLevel, onWin, onLose) {
        const range = CONFIG.ISLAND_BATTLE_N_MAX - CONFIG.ISLAND_BATTLE_N_MIN + 1;
        const n     = Math.floor(Math.random() * range) + CONFIG.ISLAND_BATTLE_N_MIN;
        this._correctAns = islandLevel * n;
        this._gainPts    = 0; // pas de points, récompense spéciale
        this._lossMsg    = `La reponse etait ${islandLevel * n}`;

        this.titleEl.textContent = '\u26f5 DEFI DE L\'ILE !';
        this.infoEl.innerHTML    = `Table de ${islandLevel} &mdash; Multiplication`;
        this.questionEl.textContent = `${islandLevel} x ${n} = ?`;

        this._open(onWin, onLose);
    }

    // ── Phase 2 : calcul à trou  niveau × ? = résultat ──────
    startPhase2(enemyLevel, onWin, onLose) {
        const table  = enemyLevel + 1;
        const n      = Math.floor(Math.random() * CONFIG.BATTLE_MULTIPLIER_MAX) + 1;
        const result = table * n;
        this._correctAns = n;
        this._gainPts    = 5 * enemyLevel;
        this._lossMsg    = 'La reponse etait ' + n;

        this.titleEl.textContent = 'PHASE 2 - CALCUL A TROU !';
        this.infoEl.innerHTML    = 'Ennemi niveau ' + enemyLevel + ' &mdash; Table de ' + table;
        this.questionEl.textContent = table + ' x ? = ' + result;

        this._open(onWin, onLose);
    }

    // ── Ouvrir le modal (commun) ───────────────────────────
    _open(onWin, onLose) {
        this.active  = true;
        this._onWin  = onWin;
        this._onLose = onLose;

        this.inputEl.value          = '';
        this._timeLeft              = CONFIG.BATTLE_TIME + this.bonusSeconds;
        this.timerValEl.textContent = this._timeLeft;
        this.timerValEl.style.color = '#ff8c55';
        this.timerBar.style.width   = '100%';

        this.modal.classList.add('active');
        setTimeout(() => this.inputEl.focus(), 80);
        this._timerIntvl = setInterval(() => this._tick(), 1000);
    }

    // ── Tick de la minuterie ───────────────────────────────
    _tick() {
        this._timeLeft--;
        this.timerValEl.textContent = this._timeLeft;
        this.timerBar.style.width   = (this._timeLeft / CONFIG.BATTLE_TIME * 100) + '%';

        if (this._timeLeft <= 3) {
            this.timerValEl.style.color = '#ff3333';
        }

        if (this._timeLeft <= 0) {
            this._resolve(false);
        }
    }

    // ── Soumission de la réponse ───────────────────────────
    _submit() {
        if (!this.active) return;
        const answer = parseInt(this.inputEl.value, 10);
        if (isNaN(answer)) { this.inputEl.focus(); return; }
        // Code triche : 999 → passer en Phase 2
        if (answer === 999 && this.onCheat) {
            clearInterval(this._timerIntvl);
            this.active = false;
            this.modal.classList.remove('active');
            this.onCheat();
            return;
        }
        this._resolve(answer === this._correctAns);
    }

    // ── Résoudre la bataille ───────────────────────────────
    _resolve(won) {
        if (!this.active) return;
        clearInterval(this._timerIntvl);
        this.active = false;
        this.timerValEl.style.color = '#ff8c55';

        // Remplacer ? par la bonne réponse colorée dans la question
        const color = won ? '#44ff88' : '#ff4444';
        this.questionEl.innerHTML = this.questionEl.textContent.replace(
            '?',
            '<span style="color:' + color + ';font-weight:bold">' + this._correctAns + '</span>'
        );
        this.questionEl.style.fontSize = '68px';

        // Masquer input / timer / bouton
        this.inputEl.style.display     = 'none';
        this.submitBtn.style.display   = 'none';
        this.timerWrapEl.style.display = 'none';
        this.timerRowEl.style.display  = 'none';

        // Résultat inline dans la modal
        this.outcomeEl.textContent = won ? '\u2705 VICTOIRE !' : '\u274c D\u00c9FAITE';
        this.outcomeEl.className   = 'active ' + (won ? 'win' : 'lose');

        const delay = won ? 2000 : 5000;
        setTimeout(() => {
            // Fermer et restaurer la modal pour la prochaine bataille
            this.modal.classList.remove('active');
            this.questionEl.innerHTML      = '';
            this.questionEl.style.fontSize = '';
            this.inputEl.style.display     = '';
            this.submitBtn.style.display   = '';
            this.timerWrapEl.style.display = '';
            this.timerRowEl.style.display  = '';
            this.outcomeEl.className       = '';
            this.outcomeEl.textContent     = '';
            if (won) this._onWin();
            else     this._onLose();
        }, delay);
    }
}
