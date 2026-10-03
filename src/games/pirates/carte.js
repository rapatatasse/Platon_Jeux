// ============================================================
//  carte.js — Minimap (canvas en bas à droite)
// ============================================================
import { CONFIG } from './config.js';

export class Minimap {
    constructor(canvasId) {
        this.canvas  = document.getElementById(canvasId);
        this.ctx     = this.canvas.getContext('2d');
        this.size    = this.canvas.width;   // 155px
        this.mapSize = CONFIG.MAP_SIZE;     // 100 unités
        this.scale   = this.size / this.mapSize; // px par unité
    }

    // Convertit coordonnées monde → pixels minimap
    _toMM(worldX, worldZ) {
        return [
            (worldX + this.mapSize / 2) * this.scale,
            (worldZ + this.mapSize / 2) * this.scale,
        ];
    }

    draw(playerPos, playerHeading, enemies, islands) {
        const ctx  = this.ctx;
        const size = this.size;

        // ── Fond océan ──
        ctx.fillStyle = '#0d4a46';
        ctx.fillRect(0, 0, size, size);

        // ── Grille légère ──
        ctx.strokeStyle = 'rgba(78,201,176,0.1)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 10; i++) {
            const p = i * size / 10;
            ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
        }

        // ── Îles (avec couleur de niveau) ──
        const islColors = ['#27ae60', '#f39c12', '#e74c3c'];
        islands.forEach(isl => {
            const [mx, my] = this._toMM(isl.x, isl.z);
            const r = (isl.radius * this.scale) * 0.65;
            // Anneau de niveau
            ctx.beginPath();
            ctx.arc(mx, my, Math.max(r + 1.5, 4), 0, Math.PI * 2);
            ctx.strokeStyle = islColors[Math.min((isl.level || 1) - 1, 2)];
            ctx.lineWidth = 2;
            ctx.stroke();
            // Plage
            ctx.beginPath();
            ctx.arc(mx, my, Math.max(r, 2.5), 0, Math.PI * 2);
            ctx.fillStyle = '#c8a85a';
            ctx.fill();
            // Végétation
            ctx.beginPath();
            ctx.arc(mx, my, Math.max(r * 0.55, 1.2), 0, Math.PI * 2);
            ctx.fillStyle = '#4a7c3f';
            ctx.fill();
        });

        // ── Ennemis ──
        enemies.forEach(e => {
            if (!e.alive) return;
            const [mx, my] = this._toMM(e.mesh.position.x, e.mesh.position.z);
            ctx.beginPath();
            ctx.arc(mx, my, 3, 0, Math.PI * 2);
            ctx.fillStyle = this._enemyColor(e.level);
            ctx.fill();
        });

        // ── Joueur (triangle orienté) ──
        const [px, py] = this._toMM(playerPos.x, playerPos.z);
        const h = playerHeading;
        const pr = 5;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(h);
        ctx.beginPath();
        ctx.moveTo(0, -pr);
        ctx.lineTo(pr * 0.65, pr);
        ctx.lineTo(-pr * 0.65, pr);
        ctx.closePath();
        ctx.fillStyle = '#ffd700';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.fill(); ctx.stroke();
        ctx.restore();

        // ── Bordure ──
        ctx.strokeStyle = 'rgba(78,201,176,0.5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0, 0, size, size);
    }

    _enemyColor(level) {
        const palette = ['#ff6b35','#ff9f1c','#e9c46a','#f4a261','#e76f51','#d62828'];
        return palette[Math.min(level - 1, palette.length - 1)];
    }
}
