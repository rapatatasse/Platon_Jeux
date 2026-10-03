// ============================================================
//  bateau.js — Bateau du joueur
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';

export class PlayerBoat {
    constructor(scene, textures) {
        this.scene    = scene;
        this.textures = textures; // tableau de 6 textures (index 0..5)
        this.level    = 1;
        this.heading  = 0;       // radians — 0 = vers le nord (−Z)
        this.speed    = 0;

        // Mesh principal
        const aspect0 = (this.textures[0]?.image && this.textures[0].image.width)
                        ? this.textures[0].image.height / this.textures[0].image.width : 1;
        const pW  = CONFIG.PLAYER_SIZE;
        const pH  = pW * aspect0;
        const geo = new THREE.PlaneGeometry(pW, pH);
        const mat = new THREE.MeshBasicMaterial({
            map:         this.textures[0],
            transparent: true,
            alphaTest:   0.05,
            depthWrite:  false,
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.rotation.x = -Math.PI / 2; // poser à plat sur XZ
        this.mesh.position.set(0, 0.15, 0);
        scene.add(this.mesh);

        // Sillage (trail) — petits rectangles blancs semi-transparents
        this._wakeParticles = [];
        this._wakeTimer = 0;
    }

    // ── Mise à jour chaque frame ───────────────────────────
    update(input, delta) {
        const dt = Math.min(delta, 50) / 16.67; // normalisé 60fps

        // Rotation
        if (input.left)  this.heading -= CONFIG.PLAYER_ROTATION_SPEED * dt;
        if (input.right) this.heading += CONFIG.PLAYER_ROTATION_SPEED * dt;

        // Translation
        let spd = 0;
        if (input.forward)  spd =  CONFIG.PLAYER_SPEED;
        if (input.backward) spd = -CONFIG.PLAYER_REVERSE_SPEED;

        const dx = Math.sin(this.heading) * spd * dt;
        const dz = -Math.cos(this.heading) * spd * dt;

        const half = CONFIG.MAP_SIZE / 2 - 1;
        this.mesh.position.x = Math.max(-half, Math.min(half, this.mesh.position.x + dx));
        this.mesh.position.z = Math.max(-half, Math.min(half, this.mesh.position.z + dz));

        // Rotation du mesh
        this.mesh.rotation.z = -this.heading;

        // Sillage si on avance
        if (spd > 0) this._emitWake(delta);
        this._updateWake(delta);
    }

    // ── Sillage ───────────────────────────────────────────
    _emitWake(delta) {
        this._wakeTimer += delta;
        if (this._wakeTimer < 120) return;
        this._wakeTimer = 0;

        // Derrière le bateau
        const back = new THREE.Vector3(
            this.mesh.position.x - Math.sin(this.heading) * CONFIG.PLAYER_SIZE * 0.55,
            0.05,
            this.mesh.position.z + Math.cos(this.heading) * CONFIG.PLAYER_SIZE * 0.55
        );

        const geo = new THREE.PlaneGeometry(0.6, 0.25);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false
        });
        const p = new THREE.Mesh(geo, mat);
        p.rotation.x = -Math.PI / 2;
        p.rotation.z = -this.heading + (Math.random() - 0.5) * 0.8;
        p.position.copy(back);
        p._life = 1.0;
        this.scene.add(p);
        this._wakeParticles.push(p);
    }

    _updateWake(delta) {
        const dt = delta / 1000;
        for (let i = this._wakeParticles.length - 1; i >= 0; i--) {
            const p = this._wakeParticles[i];
            p._life -= dt * 1.2;
            p.material.opacity = p._life * 0.35;
            p.scale.x += dt * 1.8;
            p.scale.y += dt * 1.2;
            if (p._life <= 0) {
                this.scene.remove(p);
                p.geometry.dispose();
                p.material.dispose();
                this._wakeParticles.splice(i, 1);
            }
        }
    }

    // ── Changement de niveau (image du bateau) ────────────
    setLevel(level) {
        this.level = Math.min(level, CONFIG.MAX_PLAYER_LEVEL);
        const texIdx = Math.min(this.level - 1, this.textures.length - 1);
        this.mesh.material.map = this.textures[texIdx];
        this.mesh.material.needsUpdate = true;

        // Légère impulsion de scale pour l'effet visuel
        this.mesh.scale.set(1.3, 1.3, 1.3);
        setTimeout(() => this.mesh.scale.set(1, 1, 1), 250);
    }

    getPosition() {
        return this.mesh.position;
    }

    destroy() {
        this.scene.remove(this.mesh);
        this._wakeParticles.forEach(p => this.scene.remove(p));
    }
}
