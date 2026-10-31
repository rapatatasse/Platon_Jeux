import '../../shared/theme.js';
import './style.css';
import { GAME, POWERS, PLAYERS, BOT_LEVELS } from './config.js';
import { LAYOUTS, LAYOUT_IDS, layoutStructure, WALL } from './core/grid.js';
import { BomberGame } from './core/BomberGame.js';
import { Bot } from './core/Bot.js';
import { Renderer } from './render/Renderer.js';
import heroFiles from 'virtual:bomberheroes';
import { loadHeroes } from './render/sprites.js';
import { Input } from './input.js';
import { Sounds } from './sounds.js';
import { Music } from '../../shared/Music.js';
import { startLoop } from '../../shared/loop.js';
import { mountGameChrome } from '../../shared/chrome.js';

const $ = (id) => document.getElementById(id);
const COUNTDOWN = ['3', '2', '1', 'Combat !'];
const STEP = 0.8;

const state = { mode: 'menu', humans: 2, botCount: 0, game: null, timer: 0, step: -1, picks: [], colors: [], map: 'random', level: 'normal' };

let heroes = [];
const sounds = new Sounds();
const music = new Music({ volume: 0.2 });
let renderer, input;
let bots = [];

const total = () => state.humans + state.botCount;
const nameOf = (i) => `${heroes[state.picks[i]].name}${i < state.humans ? '' : ' (robot)'}`;

function show(id, on) { $(id).hidden = !on; }
function setText(el, text) { if (el.textContent !== text) el.textContent = text; }
function banner(text, ms = 2200) {
  const b = $('banner');
  b.textContent = text; b.hidden = false;
  clearTimeout(banner.t);
  if (ms) banner.t = setTimeout(() => { b.hidden = true; }, ms);
}
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ───────────── Menu ─────────────
function buildMenu() {
  const fill = (id, values, onPick) => values.forEach((n) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.textContent = n; b.dataset.n = n;
    b.addEventListener('click', () => { if (!b.disabled) { sounds.select(); onPick(n); } });
    $(id).appendChild(b);
  });
  fill('human-choice', [1, 2, 3, 4], setHumans);
  fill('bot-choice', [0, 1, 2, 3], setBots);
  [['random', 'Aléatoire'], ...LAYOUT_IDS.map((id) => [id, LAYOUTS[id].name])].forEach(([id, name]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.id = id;
    b.append(mapPreview(id), Object.assign(document.createElement('span'), { textContent: name }));
    b.addEventListener('click', () => { sounds.select(); state.map = id; renderRoster(); });
    $('map-choice').appendChild(b);
  });
  Object.entries(BOT_LEVELS).forEach(([id, level]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.id = id; b.textContent = level.name;
    b.addEventListener('click', () => { sounds.select(); state.level = id; renderRoster(); });
    $('level-choice').appendChild(b);
  });
  $('legend').innerHTML = Object.values(POWERS).map((p) => `<li title="${p.hint}"><i style="background:${p.color}">${p.icon}</i>${p.name}</li>`).join('');
  renderRoster();
  refreshPads();
  window.addEventListener('gamepadconnected', refreshPads);
  window.addEventListener('gamepaddisconnected', refreshPads);
}

/** Petit dessin de la forme d'une carte (murs sombres, sol clair) pour le menu. */
function mapPreview(id) {
  const [W, H, S] = [15, 13, 4];
  const c = document.createElement('canvas');
  c.width = W * S; c.height = H * S; c.setAttribute('aria-hidden', 'true');
  const g = c.getContext('2d');
  if (id === 'random') {
    g.fillStyle = '#c9a24a'; g.font = `${H * S * 0.8}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('?', c.width / 2, c.height / 2 + 2);
    return c;
  }
  layoutStructure(W, H, id).forEach((t, i) => {
    g.fillStyle = t === WALL ? '#1a1c25' : '#7d8396';
    g.fillRect((i % W) * S, Math.floor(i / W) * S, S, S);
  });
  return c;
}

/** 4 joueurs maximum, au moins 1 humain et 2 participants : on ajuste l'autre réglage au besoin. */
function setHumans(h) {
  state.humans = h;
  state.botCount = Math.min(4 - h, Math.max(2 - h, state.botCount));
  renderRoster();
}

function setBots(n) {
  state.botCount = n;
  renderRoster();
}

/** Couleurs fixes : joueur 1 rouge, 2 bleu, 3 vert, 4 jaune (définies dans config.js). */
function assignColors() {
  PLAYERS.forEach((p, i) => { state.colors[i] = p.color; });
}

function renderRoster() {
  assignColors();
  const n = total();
  [...$('human-choice').children].forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.n) === state.humans)));
  [...$('bot-choice').children].forEach((b) => {
    const k = Number(b.dataset.n);
    b.setAttribute('aria-checked', String(k === state.botCount));
    b.disabled = state.humans + k > 4 || state.humans + k < 2;
  });
  [...$('map-choice').children].forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === state.map)));
  [...$('level-choice').children].forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === state.level)));
  $('level-field').hidden = state.botCount === 0;
  $('controls').innerHTML = PLAYERS.slice(0, n).map((p, i) => {
    const human = i < state.humans;
    const rows = human
      ? `<div><span>Déplacer</span><span>${p.label.move}</span></div>
      <div><span>Sortilège</span><span><kbd>${p.label.bomb}</kbd></span></div>
      <div><span>Pouvoir</span><span><kbd>${p.label.power}</kbd></span></div>`
      : '<div><span>Joué par</span><span>l’ordinateur</span></div>';
    return `
    <div class="pcard" style="--c:${state.colors[i]}"><h3>${nameOf(i)}</h3><div class="slot">${human ? PLAYERS[i].name : 'Robot'}</div>
      ${rows}
      <div class="hero"><button type="button" data-hero="${i}" data-d="-1" aria-label="Héros précédent">‹</button><img src="${heroes[state.picks[i]].thumb}" alt="${heroes[state.picks[i]].name}" data-hero="${i}" data-d="1" /><button type="button" data-hero="${i}" data-d="1" aria-label="Héros suivant">›</button></div>
      ${human ? `<div class="pad" data-pad="${i}">Manette ${i + 1}</div>` : '<div class="pad bot">Robot</div>'}</div>`;
  }).join('');
  refreshPads();
}

function cycleHero(i, d) {
  const taken = new Set(state.picks.slice(0, total()).filter((_, k) => k !== i));
  let next = state.picks[i];
  for (let t = 0; t < heroes.length; t++) {
    next = (next + d + heroes.length) % heroes.length;
    if (heroes.length < total() || !taken.has(next)) break;
  }
  state.picks[i] = next;
  sounds.select();
  renderRoster();
}

function refreshPads() {
  const pads = input?.connectedPads() ?? [...(navigator.getGamepads?.() ?? [])].filter(Boolean);
  document.querySelectorAll('[data-pad]').forEach((el) => {
    const on = pads.length > Number(el.dataset.pad);
    el.classList.toggle('on', on);
    el.textContent = on ? `Manette ${Number(el.dataset.pad) + 1} détectée` : `Manette ${Number(el.dataset.pad) + 1} : non détectée`;
  });
  $('pads').textContent = pads.length ? `${pads.length} manette${pads.length > 1 ? 's' : ''} détectée${pads.length > 1 ? 's' : ''} : appuie sur A pour le sortilège, B ou X pour le pouvoir.` : 'Branche des manettes puis appuie sur un bouton pour les détecter.';
}

// ───────────── Partie ─────────────
function startMatch() {
  document.activeElement?.blur?.();
  sounds.start();
  show('menu', false); show('final', false); show('pause', false); show('hud', true);
  const game = new BomberGame({ config: { ...GAME, ...GAME.sizes?.[total()], layout: state.map }, playerCount: total() });
  state.game = game;
  assignColors();
  input.count = state.humans;
  bots = game.players.slice(state.humans).map((p) => new Bot(game, p.id, BOT_LEVELS[state.level]));
  renderer.attach(game);
  wire(game);
  buildHud(game);
  nextRound(false);
}

function nextRound(restart = true) {
  const game = state.game;
  if (restart) game.startRound();
  bots.forEach((b) => { b.timer = 0; });
  state.mode = 'countdown';
  state.timer = 0; state.step = -1;
  input.enabled = false;
  $('banner').hidden = true;
  $('round-v').textContent = `Manche ${game.round} · ${LAYOUTS[game.layoutId].name}`;
}

function wire(game) {
  game.on('bombPlaced', () => sounds.place());
  game.on('explosion', () => sounds.explode());
  game.on('blockDestroyed', ({ kind }) => (kind === 'chest' ? sounds.chest() : sounds.crumble()));
  game.on('itemPicked', ({ item }) => (item.kind === 'power' ? sounds.magic() : sounds.bonus()));
  game.on('playerFrozen', () => sounds.freeze());
  game.on('playerDied', ({ cause }) => (cause === 'fall' ? sounds.fall() : sounds.die()));
  game.on('closing', () => sounds.closing());
  game.on('powerUsed', ({ power }) => sounds[power]());
  game.on('roundEnd', ({ winner }) => {
    banner(winner === null ? 'Égalité, personne ne gagne la manche' : `${nameOf(winner)} remporte la manche`, 2600);
    sounds.round();
    state.mode = 'between'; state.timer = 2.8;
  });
  game.on('matchEnd', ({ winner }) => {
    sounds.win();
    state.mode = 'final';
    input.enabled = false;
    $('final-title').textContent = `${nameOf(winner)} gagne la partie`;
    $('final-title').style.color = state.colors[winner];
    const hero = $('final-hero');
    hero.src = heroes[state.picks[winner]].thumb;
    hero.alt = nameOf(winner);
    hero.style.setProperty('--c', state.colors[winner]);
    $('final-score').textContent = game.wins.map((w, i) => `${nameOf(i)} ${w}`).join('  ·  ');
    setTimeout(() => state.mode === 'final' && show('final', true), 900);
  });
}

function action(i, kind) {
  if (state.mode !== 'playing') return;
  const g = state.game;
  if (kind === 'bomb') g.placeBomb(i);
  else if (!g.usePower(i) && g.players[i].alive && !g.players[i].power) sounds.empty();
}

function pause(on) {
  if (on && state.mode === 'playing') { state.mode = 'paused'; input.enabled = false; show('pause', true); }
  else if (!on && state.mode === 'paused') { state.mode = 'playing'; input.enabled = true; show('pause', false); input.down.clear(); }
}

function quit() {
  state.mode = 'menu'; input.enabled = false;
  ['pause', 'final'].forEach((id) => show(id, false));
  show('hud', false); show('menu', true); $('banner').hidden = true; $('count').hidden = true;
}

// ───────────── Bandeau ─────────────
function buildHud(game) {
  $('cards').innerHTML = game.players.map((p, i) => `
    <div class="card" data-card="${i}" style="--c:${state.colors[i]}">
      <span class="name"><img class="avatar" src="${heroes[state.picks[i]].thumb}" alt="" />${nameOf(i)}</span>
      <span class="stats"></span>
      <span class="pips" style="grid-column:1/-1">${'<i></i>'.repeat(GAME.roundsToWin)}</span>
      <span class="power"></span></div>`).join('');
}

function updateHud(game) {
  game.players.forEach((p, i) => {
    const card = $('cards').children[i];
    if (!card) return;
    card.classList.toggle('dead', !p.alive);
    [...card.querySelector('.pips').children].forEach((d, k) => d.classList.toggle('on', k < game.wins[i]));
    setText(card.querySelector('.stats'), `● ${p.bombsMax}  ✦ ${p.range}  » ${p.speed.toFixed(1)}`);
    const pw = card.querySelector('.power');
    const html = p.frozen > 0 ? '<b style="color:#8fd6ff">Gelé</b>'
      : p.power ? `<b style="color:${POWERS[p.power].color}">${POWERS[p.power].icon} ${POWERS[p.power].name}</b>`
        : p.slowT > 0 ? '<b style="color:#b79bff">Ralenti</b>' : '';
    if (pw.dataset.h !== html) { pw.dataset.h = html; pw.innerHTML = html; }
  });
  const at = game.cfg.suddenDeathAt;
  const left = at ? at - game.time : 0;
  const timer = $('timer');
  if (at && left > 0) setText(timer, clock(left)); else setText(timer, at ? 'Effondrement' : clock(game.time));
  timer.classList.toggle('low', !!at && left > 0 && left <= 10);
  if (state.mode === 'playing' && at && left <= 0 && !state.warned) { state.warned = true; banner('Le sol s’effondre depuis l’extérieur !', 2600); }
  if (left > 0) state.warned = false;
}

// ───────────── Boucle ─────────────
function update(dt, now) {
  input.poll();
  const game = state.game;
  if (game) {
    if (state.mode === 'countdown') {
      state.timer += dt;
      const step = Math.min(COUNTDOWN.length, Math.floor(state.timer / STEP));
      if (step !== state.step) {
        state.step = step;
        const c = $('count');
        if (step < COUNTDOWN.length) {
          c.hidden = true; void c.offsetWidth; c.hidden = false;
          c.textContent = COUNTDOWN[step];
          step === COUNTDOWN.length - 1 ? sounds.go() : sounds.count();
        } else {
          c.hidden = true; state.mode = 'playing'; input.enabled = true;
        }
      }
    } else if (state.mode === 'between') {
      game.update(dt);
      state.timer -= dt;
      if (state.timer <= 0) nextRound();
    } else if (state.mode === 'playing' || state.mode === 'final') {
      if (state.mode === 'playing') {
        for (let i = 0; i < state.humans; i++) game.setInput(i, ...input.read(i));
        bots.forEach((b) => b.update(dt));
      }
      game.update(dt);
    }
    updateHud(game);
  }
  renderer?.frame(dt, now);
}

async function boot() {
  mountGameChrome();
  input = new Input(PLAYERS, { onAction: action, onConfirm: () => { if (state.mode === 'menu') startMatch(); } });
  heroes = await loadHeroes(import.meta.env.BASE_URL, heroFiles);
  PLAYERS.forEach((_, i) => { state.picks[i] = i % heroes.length; });
  buildMenu();
  renderer = new Renderer($('arena'), { heroes, width: GAME.width, height: GAME.height });
  renderer.picks = state.picks;
  renderer.colors = state.colors;
  const demo = new BomberGame({ config: GAME, playerCount: 4 });
  renderer.attach(demo);
  state.game = null;
  renderer.game = demo;

  const soundBtn = $('sound');
  const refreshSound = () => { soundBtn.textContent = music.muted ? 'Son : non' : 'Son : oui'; sounds.muted = music.muted; };
  soundBtn.addEventListener('click', () => { music.toggleMute(); refreshSound(); });
  refreshSound();

  $('controls').addEventListener('click', (e) => {
    const t = e.target.closest('[data-hero]');
    if (t) cycleHero(Number(t.dataset.hero), Number(t.dataset.d));
  });
  $('btn-start').addEventListener('click', startMatch);
  $('btn-again').addEventListener('click', startMatch);
  $('btn-menu').addEventListener('click', quit);
  $('btn-quit').addEventListener('click', quit);
  $('btn-hud-menu').addEventListener('click', (e) => { e.currentTarget.blur(); sounds.select(); quit(); });
  $('btn-resume').addEventListener('click', () => pause(false));
  window.addEventListener('blur', () => pause(true));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || (e.code === 'Space' && state.mode !== 'menu')) { e.preventDefault(); return; }
    if (e.code === 'Escape' || e.code === 'KeyP') { if (state.mode === 'paused') pause(false); else pause(true); return; }
    if (state.mode !== 'menu' || e.repeat) return;
    if (['1', '2', '3', '4'].includes(e.key) || ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].includes(e.code)) { sounds.select(); setHumans(Number(e.key)); }
  });
  startLoop(update);
}

boot();
