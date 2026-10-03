// ============================================================
//  ui.js — Gestion du HUD (score, niveau, santé, messages)
// ============================================================
import { CONFIG } from './config.js';

export class UI {
    constructor() {
        this.scoreEl        = document.getElementById('score-value');
        this.levelEl        = document.getElementById('level-value');
        this.nextLevelEl    = document.getElementById('next-level-value');
        this.multiplierEl   = document.getElementById('multiplier-display');
        this.messageEl      = document.getElementById('message-text');
        this.streakEl       = document.getElementById('streak-display');
        this.finalScoreEl   = document.getElementById('final-score');
        this.gameOverEl     = document.getElementById('game-over');
        this.hearts         = [
            document.getElementById('heart-1'),
            document.getElementById('heart-2'),
            document.getElementById('heart-3'),
        ];
        this._msgTimer      = null;
        this._compassCtx    = document.getElementById('compass-canvas').getContext('2d');
    }

    updateScore(score, level) {
        this.scoreEl.textContent = score;
        this.levelEl.textContent = level;
        const seuils = CONFIG.NIVEAU_SEUILS;
        // Le seuil pour atteindre le niveau suivant est seuils[level-1]
        if (level - 1 < seuils.length) {
            const pointsForNext = seuils[level - 1] - score;
            this.nextLevelEl.textContent = Math.max(0, pointsForNext);
        } else {
            this.nextLevelEl.textContent = 'MAX';
        }
    }

    resetHearts() {
        const container = document.getElementById('health-display');
        // Supprimer les cœurs dynamiques (au-delà des 3 de base)
        while (this.hearts.length > 3) {
            container.removeChild(this.hearts.pop());
        }
        this.hearts.forEach(h => h.classList.remove('lost'));
    }

    updateHealth(health, maxHealth) {
        if (maxHealth === undefined) maxHealth = this.hearts.length;
        // Ajouter des cœurs si le max a augmenté
        const container = document.getElementById('health-display');
        while (this.hearts.length < maxHealth) {
            const h = document.createElement('span');
            h.className = 'heart';
            h.textContent = '❤️';
            container.appendChild(h);
            this.hearts.push(h);
        }
        this.hearts.forEach((h, i) => {
            h.classList.toggle('lost', i >= health);
        });
    }

    updateMultiplier(streak) {
        if (streak >= 2) {
            const mult = Math.min(streak, 5);
            this.multiplierEl.textContent = `🔥 Série x${mult} !`;
        } else {
            this.multiplierEl.textContent = '';
        }
    }

    showStreak(streak) {
        if (streak < 2) { this.streakEl.innerHTML = ''; return; }
        const flames = '🔥'.repeat(Math.min(streak, 5));
        this.streakEl.innerHTML = `<span class="streak-text">${flames} Série de ${streak} victoires !</span>`;
        setTimeout(() => { this.streakEl.innerHTML = ''; }, 2500);
    }

    showMessage(text, color = '#fff', duration = 1800) {
        if (this._msgTimer) clearTimeout(this._msgTimer);
        this.messageEl.textContent  = text;
        this.messageEl.style.color  = color;
        this.messageEl.style.opacity = '1';
        this._msgTimer = setTimeout(() => {
            this.messageEl.style.opacity = '0';
        }, duration);
    }

    showGameOver(score) {
        this.finalScoreEl.textContent = score;
        this.gameOverEl.classList.add('active');
    }

    hideGameOver() {
        this.gameOverEl.classList.remove('active');
    }

    // ── Boussole ──
    drawCompass(headingRad) {
        const ctx = this._compassCtx;
        const cx = 36, cy = 36, r = 32;
        ctx.clearRect(0, 0, 72, 72);

        // Fond
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(5,25,35,0.82)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(78,201,176,0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Graduation N/S/E/O
        const labels = [['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['O', -Math.PI / 2]];
        labels.forEach(([label, angle]) => {
            const rotated = angle - headingRad;
            const lx = cx + Math.sin(rotated) * 22;
            const ly = cy - Math.cos(rotated) * 22;
            ctx.font = label === 'N' ? 'bold 11px Georgia' : '10px Georgia';
            ctx.fillStyle = label === 'N' ? '#ff6b35' : '#aed';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(label, lx, ly);
        });

        // Aiguille (pointe vers le nord)
        const nx = cx + Math.sin(-headingRad) * 18;
        const ny = cy - Math.cos(-headingRad) * 18;
        const sx = cx - Math.sin(-headingRad) * 12;
        const sy = cy + Math.cos(-headingRad) * 12;

        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
}
