import * as THREE from 'three';
import { CONFIG } from './config.js';
import { canvasTexture, drawCanvas } from '../../shared/canvasTexture.js';

/** Halo lumineux (mode nuit, phase 2), invisible par défaut. */
export function createGlowSprite(size, midAlpha = 0.25) {
    const rgb = CONFIG.NIGHT_GLOW_COLOR;
    const cv = drawCanvas(128, 128, (ctx) => {
        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0,   'rgba(' + rgb + ',' + CONFIG.NIGHT_GLOW_INTENSITY + ')');
        grad.addColorStop(0.4, 'rgba(' + rgb + ',' + midAlpha + ')');
        grad.addColorStop(1,   'rgba(' + rgb + ',0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
    });
    const mat = new THREE.SpriteMaterial({
        map: canvasTexture(cv), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(size, size, 1);
    sp.visible = false;
    return sp;
}
