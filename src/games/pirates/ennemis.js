// ============================================================
//  ennemis.js — Bateaux ennemis et leur gestionnaire
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { canvasTexture } from '../../shared/canvasTexture.js';
import { createGlowSprite } from './sprites.js';

export class EnemyBoat {
    constructor(scene, textures, level, x, z) {
        this.scene    = scene;
        this.level    = level;
        this.alive    = true;
        this.heading  = Math.random() * Math.PI * 2;
        this.speed    = CONFIG.ENEMY_SPEED_MIN +
                        Math.random() * (CONFIG.ENEMY_SPEED_MAX - CONFIG.ENEMY_SPEED_MIN);
        this._dirTimer    = 0;
        this._dirInterval = CONFIG.ENEMY_DIR_CHANGE_INTERVAL * (0.7 + Math.random() * 0.6);
        this._bobPhase    = Math.random() * Math.PI * 2;

        const tex    = textures[Math.min(level - 1, textures.length - 1)];
        const aspect = (tex?.image && tex.image.width) ? tex.image.height / tex.image.width : 1;
        const eW     = CONFIG.ENEMY_SIZE;
        const eH     = eW * aspect;
        const geo = new THREE.PlaneGeometry(eW, eH);
        const mat = new THREE.MeshBasicMaterial({
            map:         tex,
            transparent: true,
            alphaTest:   0.05,
            depthWrite:  false,
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(x, 0.1, z);
        scene.add(this.mesh);

        // Badge de niveau (sprite textuel sur canvas)
        this._badgeMesh = this._createLevelBadge(level);
        scene.add(this._badgeMesh);

        // Halo de nuit (Phase 2)
        this._glowMesh = createGlowSprite(CONFIG.NIGHT_GLOW_SIZE, 0.2);
        this._glowMesh.position.set(x, 0.3, z);
        scene.add(this._glowMesh);
    }

    _createLevelBadge(level) {
        const cv  = document.createElement('canvas');
        cv.width  = 64; cv.height = 64;
        const ctx = cv.getContext('2d');
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fillStyle = this._levelColor(level);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        const table = level + 1;
        ctx.font = 'bold 20px Georgia';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('x' + table, 32, 33);

        const tex = canvasTexture(cv);
        const mat = new THREE.SpriteMaterial({ map: tex, depthWrite: false });
        const sp  = new THREE.Sprite(mat);
        sp.scale.set(2.0, 2.0, 1);
        return sp;
    }

    _levelColor(level) {
        const colors = ['#4ec9b0','#ff9f1c','#e76f51','#d62828','#9b2226','#6a0572'];
        return colors[Math.min(level - 1, colors.length - 1)];
    }

    update(delta, mapHalf, islands) {
        if (!this.alive) return;

        const dt = Math.min(delta, 50) / 16.67;

        // Changement de direction aléatoire
        this._dirTimer += delta;
        if (this._dirTimer >= this._dirInterval) {
            this._dirTimer = 0;
            this._dirInterval = CONFIG.ENEMY_DIR_CHANGE_INTERVAL * (0.7 + Math.random() * 0.6);
            this.heading += (Math.random() - 0.5) * Math.PI;
        }

        // Déplacement
        let nx = this.mesh.position.x + Math.sin(this.heading) * this.speed * dt;
        let nz = this.mesh.position.z - Math.cos(this.heading) * this.speed * dt;

        // Rebond sur les bords
        if (nx < -mapHalf || nx > mapHalf) this.heading = Math.PI - this.heading;
        if (nz < -mapHalf || nz > mapHalf) this.heading = -this.heading;

        nx = Math.max(-mapHalf, Math.min(mapHalf, nx));
        nz = Math.max(-mapHalf, Math.min(mapHalf, nz));

        // Collision avec les îles
        if (islands) {
            for (const isl of islands) {
                const ddx = nx - isl.x;
                const ddz = nz - isl.z;
                const d   = Math.sqrt(ddx * ddx + ddz * ddz);
                const col = isl.radius * 0.5;
                if (d < col && d > 0) {
                    nx += (ddx / d) * (col - d);
                    nz += (ddz / d) * (col - d);
                    this.heading = Math.atan2(ddx, -ddz) + (Math.random() - 0.5) * Math.PI * 0.5;
                }
            }
        }

        this.mesh.position.x = nx;
        this.mesh.position.z = nz;
        this.mesh.rotation.z = -this.heading;

        // Légère oscillation verticale (effet de vague)
        this._bobPhase += delta * 0.002;
        this.mesh.position.y = 0.1 + Math.sin(this._bobPhase) * 0.04;

        // Badge
        this._badgeMesh.position.set(
            this.mesh.position.x + CONFIG.ENEMY_SIZE * 0.42,
            0.5,
            this.mesh.position.z - CONFIG.ENEMY_SIZE * 0.42
        );

        // Halo
        if (this._glowMesh && this._glowMesh.visible) {
            this._glowMesh.position.set(this.mesh.position.x, 0.3, this.mesh.position.z);
        }
    }

    explode() {
        this.alive = false;
        const scene = this.scene;
        const pos   = this.mesh.position.clone();

        // Retirer badge et halo immédiatement
        scene.remove(this._badgeMesh);
        if (this._glowMesh) scene.remove(this._glowMesh);

        // Préparer le mesh pour la transparence progressive
        this.mesh.material.alphaTest  = 0;
        this.mesh.material.transparent = true;
        this.mesh.material.depthWrite  = false;

        // ── Ripple eau ──────────────────────────────────────
        const rippleCv  = document.createElement('canvas');
        rippleCv.width  = rippleCv.height = 128;
        const rCtx = rippleCv.getContext('2d');
        rCtx.strokeStyle = 'rgba(140,210,255,0.85)';
        rCtx.lineWidth = 6;
        rCtx.beginPath(); rCtx.arc(64, 64, 50, 0, Math.PI * 2); rCtx.stroke();
        const rippleTex = canvasTexture(rippleCv);
        const rippleMat = new THREE.SpriteMaterial({
            map: rippleTex, transparent: true, depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const ripple = new THREE.Sprite(rippleMat);
        ripple.position.set(pos.x, 0.05, pos.z);
        ripple.scale.set(0.5, 0.5, 1);
        scene.add(ripple);

        // ── Bulles ──────────────────────────────────────────
        const bubbles = [];
        const bCv  = document.createElement('canvas');
        bCv.width  = bCv.height = 32;
        const bCtx = bCv.getContext('2d');
        const grad = bCtx.createRadialGradient(16,16,2,16,16,14);
        grad.addColorStop(0,   'rgba(220,240,255,0.95)');
        grad.addColorStop(0.6, 'rgba(140,200,255,0.5)');
        grad.addColorStop(1,   'rgba(100,180,255,0)');
        bCtx.fillStyle = grad;
        bCtx.fillRect(0, 0, 32, 32);
        const bubbleTex = canvasTexture(bCv);

        for (let i = 0; i < 10; i++) {
            const bMat = new THREE.SpriteMaterial({
                map: bubbleTex, transparent: true, depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            const b = new THREE.Sprite(bMat);
            const sz = 0.15 + Math.random() * 0.35;
            b.scale.set(sz, sz, 1);
            b.position.set(
                pos.x + (Math.random() - 0.5) * 1.5,
                0.1 + Math.random() * 0.3,
                pos.z + (Math.random() - 0.5) * 1.5
            );
            b._vy  = 0.005 + Math.random() * 0.008;
            b._vx  = (Math.random() - 0.5) * 0.003;
            b._vz  = (Math.random() - 0.5) * 0.003;
            b._delay = i * 120; // décalage de départ
            scene.add(b);
            bubbles.push(b);
        }

        // ── Animation principale ─────────────────────────────
        const DURATION = 2600;
        const start    = performance.now();
        const meshRef  = this.mesh;

        const tick = (now) => {
            const elapsed = now - start;
            const t = Math.min(elapsed / DURATION, 1);

            // Coulage : descend et penche
            meshRef.position.y = 0.1 - t * 1.2;
            meshRef.rotation.y = t * 0.6;
            meshRef.material.opacity = 1 - t;

            // Ripple : grandit et s'estompe
            const rs = 0.5 + t * 5;
            ripple.scale.set(rs, rs, 1);
            rippleMat.opacity = Math.max(0, 0.8 - t * 1.2);

            // Bulles : montent
            bubbles.forEach((b, i) => {
                if (elapsed < b._delay) return;
                const bt = Math.min((elapsed - b._delay) / 1800, 1);
                b.position.y += b._vy;
                b.position.x += b._vx;
                b.position.z += b._vz;
                b.material.opacity = Math.sin(bt * Math.PI); // fondu entrée/sortie
            });

            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                // Nettoyage final
                scene.remove(meshRef);
                scene.remove(ripple);
                rippleMat.dispose(); rippleTex.dispose();
                bubbles.forEach(b => { scene.remove(b); b.material.dispose(); });
                bubbleTex.dispose();
            }
        };
        requestAnimationFrame(tick);
    }

    getPosition() { return this.mesh.position; }
}

// ============================================================
export class EnemyManager {
    constructor(scene, textures) {
        this.scene    = scene;
        this.textures = textures;
        this.enemies  = [];
        this._respawnQueue = [];
        this._respawnTimer = 0;
        this._spawnAll();
    }

    _spawnAll() {
        const numLevels = 6; // nombre d'images de bateaux disponibles (bateau1-6)
        // Créer une liste avec au moins 1 ennemi par niveau, répartis équitablement
        const levels = [];
        for (let i = 0; i < CONFIG.ENEMY_COUNT; i++) {
            levels.push((i % numLevels) + 1);
        }
        // Mélanger pour un placement aléatoire
        for (let i = levels.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [levels[i], levels[j]] = [levels[j], levels[i]];
        }
        levels.forEach(lvl => this._spawnOne(lvl));
    }

    _spawnOne(level) {
        const half = CONFIG.MAP_SIZE / 2 - 5;
        // Éviter le centre (spawn du joueur)
        let x, z;
        do {
            x = (Math.random() - 0.5) * CONFIG.MAP_SIZE * 0.9;
            z = (Math.random() - 0.5) * CONFIG.MAP_SIZE * 0.9;
        } while (Math.sqrt(x * x + z * z) < 12);

        const lvl = level || Math.ceil(Math.random() * 3); // niveaux 1-3 au départ
        const enemy = new EnemyBoat(this.scene, this.textures, lvl, x, z);
        this.enemies.push(enemy);
        return enemy;
    }

    update(delta, mapHalf, islands) {
        this.enemies.forEach(e => e.update(delta, mapHalf, islands));

        // Respawn différé
        this._respawnTimer += delta;
        if (this._respawnTimer >= 8000 && this._respawnQueue.length > 0) {
            this._respawnTimer = 0;
            const lvl = this._respawnQueue.shift();
            this._spawnOne(lvl);
        }
    }

    removeEnemy(enemy, playerLevel) {
        enemy.explode();
        const idx = this.enemies.indexOf(enemy);
        if (idx !== -1) this.enemies.splice(idx, 1);
        // Programmer un respawn d'un ennemi de niveau plus élevé
        const newLvl = Math.min(playerLevel + Math.floor(Math.random() * 2), CONFIG.MAX_PLAYER_LEVEL);
        this._respawnQueue.push(newLvl);
    }

    getAliveEnemies() {
        return this.enemies.filter(e => e.alive);
    }
}
