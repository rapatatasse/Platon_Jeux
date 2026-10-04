// ============================================================
//  main.js — Initialisation Three.js et boucle de jeu
// ============================================================

import './style.css';
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { UI } from './ui.js';
import { Minimap } from './carte.js';
import { BatailleSystem } from './bataille.js';
import { PlayerBoat } from './bateau.js';
import { EnemyManager } from './ennemis.js';
import { createGlowSprite } from './sprites.js';
import { createRenderer } from '../../shared/createRenderer.js';
import { loadTextures } from '../../shared/loadTextures.js';
import { canvasTexture } from '../../shared/canvasTexture.js';
import { startLoop } from '../../shared/loop.js';
import { Keyboard } from '../../shared/Keyboard.js';
import { mountGameChrome } from '../../shared/chrome.js';
import { bindTouchControls } from '../../shared/TouchControls.js';

// ── État global ──────────────────────────────────────────────
let scene, camera, renderer, viewAspect = 1;
let playerBoat, enemyManager, minimap, ui, batailleSystem;
let boatTextures = [];
let islands = [];     // { mesh, x, z, radius, lastVisit }
let oceanUniforms;

let gameState  = 'loading'; // 'loading' | 'playing' | 'battle' | 'gameover'
let score      = 0;
let playerLevel= 1;
let health     = CONFIG.MAX_HEALTH;
let winStreak  = 0;
let lastTime   = 0;
let inBattle   = false;
let battleCooldown = 0; // ms pour éviter re-déclenchement immédiat
let gamePhase      = 1;  // 1 = jour, 2 = nuit (calcul à trou)
let playerGlow     = null;
let bonusSeconds   = 0;  // secondes supplémentaires gagnables sur les îles
let maxHealthBonus = 0;  // coeurs supplémentaires gagnables sur les îles

const input = { forward: false, backward: false, left: false, right: false };
const touchInput = new Set();

// ── Point d'entrée ───────────────────────────────────────────
mountGameChrome();
_initThree();
_preloadTextures(() => {
    _buildScene();
    _initSystems();
    _bindInput();
    gameState = 'playing';
    document.getElementById('loading-screen').classList.add('hidden');
    lastTime = performance.now();
    startLoop((dt, now) => _loop(now));
});

// ── Initialisation Three.js ──────────────────────────────────
function _initThree() {
    scene = new THREE.Scene();

    const v = CONFIG.CAMERA_VIEW_SIZE;
    camera = new THREE.OrthographicCamera(-v, v, v, -v, 0.1, 500);
    camera.position.set(0, 80, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);

    renderer = createRenderer(document.getElementById('canvas-container'), {
        onResize: (w, h) => {
            viewAspect = w / h;
            camera.left  = -v * viewAspect;
            camera.right =  v * viewAspect;
            camera.updateProjectionMatrix();
        },
    });
}

// ── Préchargement des textures ───────────────────────────────
function _preloadTextures(cb) {
    const bar  = document.getElementById('loading-bar');
    const urls = Array.from({ length: CONFIG.MAX_PLAYER_LEVEL }, (_, i) =>
        `${import.meta.env.BASE_URL}images/pirates/bateaux/bateau${i + 1}.png`);
    loadTextures(urls, p => { bar.style.width = (p * 100) + '%'; }).then(textures => {
        boatTextures = textures;
        cb();
    });
}

// ── Construction de la scène ─────────────────────────────────
function _buildScene() {
    _createOcean();
    _createMapBorder();
    _createIslands();
}

function _createOcean() {
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    const fragmentShader = `
        uniform float uTime;
        uniform float uNight;
        varying vec2 vUv;

        void main() {
            // Couleurs jour
            vec3 deepJ    = vec3(0.09, 0.45, 0.43);
            vec3 shallowJ = vec3(0.13, 0.68, 0.63);
            vec3 waveJ    = vec3(0.55, 0.90, 0.88);
            // Couleurs nuit
            vec3 deepN    = vec3(0.01, 0.04, 0.14);
            vec3 shallowN = vec3(0.02, 0.07, 0.22);
            vec3 waveN    = vec3(0.07, 0.15, 0.45);

            vec3 deepColor    = mix(deepJ,    deepN,    uNight);
            vec3 shallowColor = mix(shallowJ, shallowN, uNight);
            vec3 waveColor    = mix(waveJ,    waveN,    uNight);

            float grad = smoothstep(0.0, 1.0, vUv.y);
            vec3 base = mix(deepColor, shallowColor, grad * 0.6);

            float worldY  = vUv.y * 60.0 - uTime * 0.4;
            float linePos = fract(worldY);
            float line    = step(0.88, linePos) * 0.22;

            float worldX  = vUv.x * 120.0;
            float dash    = step(0.35, fract(worldX * 0.35)) * step(fract(worldX * 0.35), 0.9);

            float worldY2  = vUv.y * 40.0 - uTime * 0.25 + 0.5;
            float linePos2 = fract(worldY2);
            float line2    = step(0.91, linePos2) * 0.12;
            float dash2    = step(0.5, fract(worldX * 0.25 + 0.5));

            float wave = line * dash + line2 * dash2;
            vec3  color = mix(base, waveColor, wave);
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    oceanUniforms = { uTime: { value: 0 }, uNight: { value: 0.0 } };
    const mat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: oceanUniforms,
    });
    const geo  = new THREE.PlaneGeometry(300, 300);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0;
    scene.add(mesh);
}

function _createMapBorder() {
    const half = CONFIG.MAP_SIZE / 2;
    const pts  = [
        new THREE.Vector3(-half, 0.3, -half),
        new THREE.Vector3( half, 0.3, -half),
        new THREE.Vector3( half, 0.3,  half),
        new THREE.Vector3(-half, 0.3,  half),
        new THREE.Vector3(-half, 0.3, -half),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0xffd700, opacity: 0.5, transparent: true });
    scene.add(new THREE.Line(geo, mat));
}

function _createIslands() {
    for (let i = 0; i < CONFIG.ISLAND_COUNT; i++) {
        let x, z;
        do {
            x = (Math.random() - 0.5) * CONFIG.MAP_SIZE * 0.85;
            z = (Math.random() - 0.5) * CONFIG.MAP_SIZE * 0.85;
        } while (Math.sqrt(x * x + z * z) < 10); // loin du spawn

        const radius = CONFIG.ISLAND_MIN_SIZE +
                       Math.random() * (CONFIG.ISLAND_MAX_SIZE - CONFIG.ISLAND_MIN_SIZE);
        const lvls  = CONFIG.ISLAND_LEVELS;
        const level = lvls[Math.floor(Math.random() * lvls.length)];
        const mesh   = _buildIslandMesh(radius);
        const badge  = _buildIslandBadge(level);

        const glow = createGlowSprite(CONFIG.NIGHT_ISLAND_GLOW_SIZE);
        glow.position.set(x, 0.3, z);

        mesh.position.set(x, 0.02, z);
        badge.position.set(x, 0.5, z);
        scene.add(mesh);
        scene.add(badge);
        scene.add(glow);
        islands.push({ mesh, badge, glow, x, z, radius, level, lastVisit: -CONFIG.TREASURE_COOLDOWN });
    }
}

function _buildIslandBadge(level) {
    const colorMap = { 12: '#27ae60', 13: '#f39c12', 14: '#e74c3c' };
    const cv  = document.createElement('canvas');
    cv.width  = 96; cv.height = 96;
    const ctx = cv.getContext('2d');
    ctx.beginPath();
    ctx.arc(48, 48, 42, 0, Math.PI * 2);
    ctx.fillStyle = colorMap[level] || '#888';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.font = 'bold 26px Georgia';
    ctx.fillStyle    = '#fff';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×' + level, 48, 50);

    const tex = canvasTexture(cv);
    const mat = new THREE.SpriteMaterial({ map: tex, depthWrite: false });
    const sp  = new THREE.Sprite(mat);
    sp.scale.set(3.2, 3.2, 1);
    return sp;
}

function _buildIslandMesh(radius) {
    // Générer une texture île avec Canvas
    const cv  = document.createElement('canvas');
    cv.width  = 256; cv.height = 256;
    const ctx = cv.getContext('2d');
    const cx  = 128, cy = 128;

    // Plage (forme organique)
    ctx.beginPath();
    for (let a = 0; a <= 360; a += 12) {
        const rad   = a * Math.PI / 180;
        const noise = 0.75 + Math.random() * 0.25;
        const r     = 120 * noise;
        if (a === 0) ctx.moveTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
        else         ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
    }
    ctx.closePath();
    const beachGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, 120);
    beachGrad.addColorStop(0, '#d4b860');
    beachGrad.addColorStop(0.4, '#c8a84a');
    beachGrad.addColorStop(1, '#e8d5a3');
    ctx.fillStyle = beachGrad;
    ctx.fill();

    // Végétation intérieure
    ctx.beginPath();
    for (let a = 0; a <= 360; a += 15) {
        const rad  = a * Math.PI / 180;
        const noise= 0.7 + Math.random() * 0.3;
        const r    = 72 * noise;
        if (a === 0) ctx.moveTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
        else         ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
    }
    ctx.closePath();
    const greenGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 72);
    greenGrad.addColorStop(0, '#5a9e3a');
    greenGrad.addColorStop(0.5, '#3d7a28');
    greenGrad.addColorStop(1, '#2d5c1e');
    ctx.fillStyle = greenGrad;
    ctx.fill();

    // Quelques points végétation
    for (let k = 0; k < 6; k++) {
        const tx = cx + (Math.random() - 0.5) * 80;
        const ty = cy + (Math.random() - 0.5) * 80;
        const tr = 8 + Math.random() * 14;
        ctx.beginPath();
        ctx.arc(tx, ty, tr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${30 + Math.floor(Math.random()*40)}, ${100 + Math.floor(Math.random()*40)}, ${20 + Math.floor(Math.random()*30)}, 0.7)`;
        ctx.fill();
    }

    const tex = canvasTexture(cv);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1 });
    const geo = new THREE.PlaneGeometry(radius * 2.1, radius * 2.1);
    const m   = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    return m;
}

// ── Initialisation des systèmes ──────────────────────────────
function _initSystems() {
    ui            = new UI();
    minimap       = new Minimap('minimap');
    batailleSystem= new BatailleSystem();
    playerBoat    = new PlayerBoat(scene, boatTextures);
    enemyManager  = new EnemyManager(scene, boatTextures);

    // Halo joueur (phase 2)
    playerGlow = createGlowSprite(CONFIG.NIGHT_GLOW_SIZE);
    scene.add(playerGlow);

    ui.updateScore(score, playerLevel);
    ui.updateHealth(health);

    batailleSystem.onCheat = () => _triggerPhase2();

    document.getElementById('reward-heart-btn').addEventListener('click', () => {
        maxHealthBonus++;
        health = Math.min(health + 1, CONFIG.MAX_HEALTH + maxHealthBonus);
        ui.updateHealth(health, CONFIG.MAX_HEALTH + maxHealthBonus);
        ui.showMessage('❤️ +1 Cœur !', '#ff6b6b', 2500);
        document.getElementById('reward-modal').classList.remove('active');
        gameState = 'playing';
    });

    document.getElementById('reward-time-btn').addEventListener('click', () => {
        bonusSeconds += CONFIG.ISLAND_BONUS_SECONDS;
        batailleSystem.bonusSeconds = bonusSeconds;
        ui.showMessage('⏱ +' + CONFIG.ISLAND_BONUS_SECONDS + 's au timer !', '#7ec8e3', 2500);
        document.getElementById('reward-modal').classList.remove('active');
        gameState = 'playing';
    });

    document.getElementById('restart-btn').addEventListener('click', restartGame);

    document.getElementById('pause-btn').addEventListener('click', _togglePause);
    document.getElementById('resume-btn').addEventListener('click', _togglePause);
}

// ── Contrôles (clavier partagé + manette) ────────────────────
const keys = new Keyboard();

function _bindInput() {
    keys.onPress('Escape', _togglePause);
    bindTouchControls(document.getElementById('touch-controls'), {
        onState: state => { touchInput.clear(); state.forEach(code => touchInput.add(code)); },
    });
}

function _readInput() {
    input.forward  = keys.isDown('ArrowUp', 'KeyW') || touchInput.has('up');
    input.backward = keys.isDown('ArrowDown', 'KeyS') || touchInput.has('down');
    input.left     = keys.isDown('ArrowLeft', 'KeyA') || touchInput.has('left');
    input.right    = keys.isDown('ArrowRight', 'KeyD') || touchInput.has('right');
    _readGamepad();
}

function _readGamepad() {
    const gp = navigator.getGamepads?.()[0];
    if (!gp) return;
    const dz = CONFIG.GAMEPAD_DEADZONE;
    const ax = gp.axes[0] || 0;
    const ay = gp.axes[1] || 0;
    const btn = i => gp.buttons[i]?.pressed;
    input.left     ||= ax < -dz || btn(14);
    input.right    ||= ax >  dz || btn(15);
    input.forward  ||= ay < -dz || btn(12);
    input.backward ||= ay >  dz || btn(13);
}

// ── Boucle principale ────────────────────────────────────────
function _loop(now) {
    const delta = Math.min(now - lastTime, 100);
    lastTime = now;

    if (gameState === 'playing') {
        _update(delta);
    }

    oceanUniforms.uTime.value = now * 0.001;
    renderer.render(scene, camera);
}

function _update(delta) {
    _readInput();

    // Mouvement joueur
    playerBoat.update(input, delta);
    const pos = playerBoat.getPosition();

    // Collision joueur ↔ îles
    for (const isl of islands) {
        const cdx  = pos.x - isl.x;
        const cdz  = pos.z - isl.z;
        const dist = Math.sqrt(cdx * cdx + cdz * cdz);
        const col  = isl.radius * 0.5;
        if (dist < col && dist > 0) {
            const push = col - dist;
            playerBoat.mesh.position.x += (cdx / dist) * push;
            playerBoat.mesh.position.z += (cdz / dist) * push;
        }
    }

    // Caméra suit le joueur
    const targetX = pos.x;
    const targetZ = pos.z;
    camera.position.x += (targetX - camera.position.x) * CONFIG.CAMERA_SMOOTHING;
    camera.position.z += (targetZ - camera.position.z) * CONFIG.CAMERA_SMOOTHING;
    camera.up.set(0, 0, -1);
    camera.lookAt(camera.position.x, 0, camera.position.z);
    camera.updateProjectionMatrix();

    // Ennemis
    enemyManager.update(delta, CONFIG.MAP_SIZE / 2 - 2, islands);

    // Cooldown de bataille
    if (battleCooldown > 0) battleCooldown -= delta;

    // Détection de proximité → bataille
    if (battleCooldown <= 0 && !inBattle) {
        const alive = enemyManager.getAliveEnemies();
        for (const enemy of alive) {
            const ep  = enemy.getPosition();
            const dx  = pos.x - ep.x;
            const dz  = pos.z - ep.z;
            const dist= Math.sqrt(dx * dx + dz * dz);
            if (dist < CONFIG.BATTLE_DISTANCE) {
                _startBattle(enemy);
                break;
            }
        }
    }

    // Défis des îles
    if (battleCooldown <= 0 && !inBattle) {
        islands.forEach(isl => {
            if (inBattle) return;
            const now = performance.now();
            if (now - isl.lastVisit < CONFIG.TREASURE_COOLDOWN) return;
            const dx   = pos.x - isl.x;
            const dz   = pos.z - isl.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < isl.radius * 0.75) {
                isl.lastVisit = now;
                _startIsleBattle(isl);
            }
        });
    }

    // Halo joueur (phase 2)
    if (playerGlow && playerGlow.visible) {
        playerGlow.position.set(pos.x, 0.3, pos.z);
    }

    // Boussole + minimap
    ui.drawCompass(playerBoat.heading);
    minimap.draw(pos, playerBoat.heading, enemyManager.enemies, islands);
}

// ── Bataille ─────────────────────────────────────────────────
function _startBattle(enemy) {
    inBattle  = true;
    gameState = 'battle';
    if (gamePhase === 2) {
        batailleSystem.startPhase2(
            enemy.level,
            () => _onBattleWin(enemy),
            () => _onBattleLose(enemy)
        );
    } else {
        batailleSystem.start(
            enemy.level,
            () => _onBattleWin(enemy),
            () => _onBattleLose(enemy)
        );
    }
}

function _onBattleWin(enemy) {
    winStreak++;
    const streak = Math.min(winStreak - 1, 4);
    const gained = 5 * enemy.level + streak * 2;
    _addScore(gained);
    ui.showStreak(winStreak);
    ui.updateMultiplier(winStreak);
    ui.showMessage('+' + gained + ' pts', '#ffd700');
    enemyManager.removeEnemy(enemy, playerLevel);
    _endBattle();
}

function _onBattleLose(enemy) {
    winStreak = 0;
    ui.updateMultiplier(0);
    health--;
    ui.updateHealth(health);
    score = Math.max(0, score - CONFIG.POINTS_LOSE);
    ui.updateScore(score, playerLevel);
    ui.showMessage('-' + CONFIG.POINTS_LOSE + ' pts', '#ff4444');

    // Repousser le joueur loin de l'ennemi
    const ep   = enemy.getPosition();
    const pdx  = playerBoat.getPosition().x - ep.x;
    const pdz  = playerBoat.getPosition().z - ep.z;
    const pdist= Math.sqrt(pdx * pdx + pdz * pdz) || 1;
    playerBoat.mesh.position.x += (pdx / pdist) * 6;
    playerBoat.mesh.position.z += (pdz / pdist) * 6;

    if (health <= 0) {
        if (playerLevel <= 1) {
            _gameOver();
        } else {
            _levelDown();
            _endBattle();
        }
    } else {
        _endBattle();
    }
}

function _endBattle() {
    inBattle      = false;
    battleCooldown= 3000;
    gameState     = 'playing';
}

// ── Passage Phase 2 ───────────────────────────────────────────
function _triggerPhase2() {
    if (gamePhase === 2) return;
    gamePhase   = 2;
    score       = 0;
    playerLevel = 1;
    playerBoat.setLevel(1);
    health      = CONFIG.MAX_HEALTH;
    winStreak   = 0;
    ui.updateScore(score, playerLevel);
    ui.updateHealth(health);
    ui.updateMultiplier(0);
    ui.showMessage('PHASE 2 - MODE NUIT !', '#4488ff', 4000);
    _activateNightMode();
    _endBattle();
}

function _activateNightMode() {
    // Fond sombre
    renderer.setClearColor(CONFIG.NIGHT_SKY_COLOR, 1);
    // Océan nocturne
    oceanUniforms.uNight.value = 1.0;
    // Activer les halos
    if (playerGlow) playerGlow.visible = true;
    islands.forEach(isl => { if (isl.glow) isl.glow.visible = true; });
    enemyManager.enemies.forEach(e => { if (e._glowMesh) e._glowMesh.visible = true; });
}

// ── Descente d'un niveau (coeurs perdus) ─────────────────────
function _levelDown() {
    playerLevel--;
    // Ramener le score au début du nouveau niveau pour éviter un re-level immédiat
    const seuils = CONFIG.NIVEAU_SEUILS;
    score = (playerLevel >= 2) ? seuils[playerLevel - 2] : 0;
    playerBoat.setLevel(playerLevel);
    health = CONFIG.MAX_HEALTH;
    ui.updateHealth(health);
    ui.updateScore(score, playerLevel);
    ui.showMessage('Niveau ' + playerLevel + ' !', '#ff6b35', 2500);
}

// ── Batailles des iles (division) ────────────────────────────
function _startIsleBattle(isl) {
    inBattle  = true;
    gameState = 'battle';
    batailleSystem.startIle(
        isl.level,
        () => _onIsleWin(isl),
        () => _onIsleLose(isl)
    );
}

function _onIsleWin(isl) {
    winStreak++;
    ui.showStreak(winStreak);
    ui.updateMultiplier(winStreak);
    _endBattle();
    _showRewardChoice(isl.level);
}

function _showRewardChoice(islandLevel) {
    const modal = document.getElementById('reward-modal');
    document.getElementById('reward-sub').textContent =
        'Île ×' + islandLevel + ' — Choisissez votre récompense permanente :';
    modal.classList.add('active');
    gameState = 'battle'; // bloquer le mouvement pendant le choix
}

function _onIsleLose(isl) {
    winStreak = 0;
    ui.updateMultiplier(0);
    health--;
    ui.updateHealth(health);
    score = Math.max(0, score - CONFIG.POINTS_LOSE);
    ui.updateScore(score, playerLevel);
    ui.showMessage('-' + CONFIG.POINTS_LOSE + ' pts', '#ff4444');

    // Repousser le joueur loin de l'ile
    const pdx  = playerBoat.getPosition().x - isl.x;
    const pdz  = playerBoat.getPosition().z - isl.z;
    const pdist= Math.sqrt(pdx * pdx + pdz * pdz) || 1;
    playerBoat.mesh.position.x += (pdx / pdist) * 6;
    playerBoat.mesh.position.z += (pdz / pdist) * 6;

    if (health <= 0) {
        if (playerLevel <= 1) {
            _gameOver();
        } else {
            _levelDown();
            _endBattle();
        }
    } else {
        _endBattle();
    }
}

// ── Score et niveau ───────────────────────────────────────────
function _addScore(pts) {
    score += pts;
    const seuils   = CONFIG.NIVEAU_SEUILS;
    let   newLevel = 1;
    for (let i = 0; i < seuils.length; i++) {
        if (score >= seuils[i]) newLevel = i + 2;
    }
    const capped = Math.min(newLevel, CONFIG.MAX_PLAYER_LEVEL);
    if (capped > playerLevel) {
        playerLevel = capped;
        playerBoat.setLevel(playerLevel);
        // Atteint le niveau max en phase 1 → passer en phase 2
        if (playerLevel >= CONFIG.MAX_PLAYER_LEVEL && gamePhase === 1) {
            setTimeout(() => _triggerPhase2(), 1800);
            return;
        }
        ui.showMessage('Niveau ' + playerLevel + ' !', '#4ec9b0', 2500);
    }
    ui.updateScore(score, playerLevel);
}

// ── Pause ─────────────────────────────────────────────────────
function _togglePause() {
    if (gameState === 'battle') return; // impossible de pauser pendant une bataille
    const overlay = document.getElementById('pause-overlay');
    const btn     = document.getElementById('pause-btn');
    if (gameState === 'playing') {
        gameState = 'paused';
        overlay.classList.add('active');
        btn.innerHTML = '&#9654;'; // icône play
    } else if (gameState === 'paused') {
        gameState = 'playing';
        overlay.classList.remove('active');
        btn.innerHTML = '&#9646;&#9646;'; // icône pause
        lastTime = performance.now(); // évite un gros delta après pause
    }
}

// ── Game Over ────────────────────────────────────────────────
function _gameOver() {
    gameState = 'gameover';
    ui.showGameOver(score);
}

function restartGame() {
    // Nettoyer la scène
    enemyManager.enemies.forEach(e => {
        if (e.alive) { e.alive = false; scene.remove(e.mesh); scene.remove(e._badgeMesh); if (e._glowMesh) scene.remove(e._glowMesh); }
    });
    playerBoat.destroy();

    // Réinitialiser état
    score       = 0;
    playerLevel = 1;
    health      = CONFIG.MAX_HEALTH;
    winStreak   = 0;
    battleCooldown = 0;
    inBattle    = false;
    gamePhase   = 1;
    input.forward = input.backward = input.left = input.right = false;

    // Désactiver mode nuit
    renderer.setClearColor(0x000000, 1);
    oceanUniforms.uNight.value = 0.0;
    if (playerGlow) playerGlow.visible = false;
    bonusSeconds   = 0;
    maxHealthBonus = 0;
    batailleSystem.bonusSeconds = 0;
    document.getElementById('reward-modal').classList.remove('active');
    document.getElementById('pause-overlay').classList.remove('active');
    document.getElementById('pause-btn').innerHTML = '&#9646;&#9646;';
    gameState = 'playing'; // s'assurer qu'on sort du mode pause
    ui.resetHearts();
    islands.forEach(isl => {
        isl.lastVisit = -CONFIG.TREASURE_COOLDOWN;
        if (isl.glow) isl.glow.visible = false;
    });

    // Recréer joueur et ennemis
    playerBoat   = new PlayerBoat(scene, boatTextures);
    enemyManager = new EnemyManager(scene, boatTextures);

    // Repositionner le glow joueur
    if (playerGlow) playerGlow.position.set(0, 0.3, 0);

    ui.updateScore(score, playerLevel);
    ui.updateHealth(health);
    ui.updateMultiplier(0);
    ui.hideGameOver();

    gameState = 'playing';
}
