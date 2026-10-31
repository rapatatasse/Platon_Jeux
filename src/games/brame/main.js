import '../../shared/theme.js';
import './style.css';
import { Game, PLAYER_NAMES, PIONS_PER_PLAYER } from './core/rules.js';
import { aiStep } from './core/ai.js';
import { renderBoard, stackMarkup, pyramidMarkup, SYMBOLS } from './render/board.js';
import { mountGameChrome } from '../../shared/chrome.js';
import { createBattle } from './render/battle.js';
import { Sounds } from './sounds.js';

const $ = (id) => document.getElementById(id);
const sounds = new Sounds();
const battle = createBattle($('battle'), sounds);
let battling = false;
const EMBLEMS = ['/images/brame/seth.png', '/images/brame/horus.png'];
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };

const game = new Game();
const ui = { mode: 'ai', dice: new Set(), from: null, rolled: false, logs: [], lastKey: '' };
let timer = null;
const isHuman = (p) => ui.mode === '2p' || p === 0;
const label = (p) => (ui.mode === 'ai' ? (p === 0 ? 'Vous' : 'Ordinateur') : `Joueur ${p + 1}`);
const sum = () => [...ui.dice].reduce((t, i) => t + game.dice[i].v, 0);

function marks() {
  const m = {};
  if (game.over || !isHuman(game.current)) return m;
  const mark = (ids, kind) => ids.forEach((id) => { m[id] = kind; });
  switch (game.phase) {
    case 'move': {
      const n = sum();
      if (!n) break;
      mark(game.sources().filter((id) => game.destinations(id, n).length), 'pick');
      if (ui.from) mark(game.destinations(ui.from, n), 'move');
      break;
    }
    case 'attackSelect': {
      const opts = game.attackOptions();
      mark([...new Set(opts.map((o) => o.from))], 'pick');
      if (ui.from) mark(opts.filter((o) => o.from === ui.from).map((o) => o.to), 'attack');
      break;
    }
    case 'attackFollow': mark(game.attackOptions().map((o) => o.to), 'attack'); break;
    case 'pyramid': mark(game.pyramidOptions(), 'move'); break;
    case 'tripleKill': mark(Object.keys(game.cells).filter((id) => game.cells[id].owner !== game.current), 'kill'); break;
    default:
  }
  return m;
}

function dieHtml(i) {
  const d = game.dice[i];
  const pips = PIPS[d.v].map((n) => `<i style="grid-area:${Math.ceil(n / 3)}/${((n - 1) % 3) + 1}"></i>`).join('');
  const cls = ['die', d.used && 'used', ui.dice.has(i) && 'sel', ui.rolled && !d.used && 'roll'].filter(Boolean).join(' ');
  return `<button type="button" class="${cls}" data-die="${i}" aria-label="Dé ${d.v}" aria-pressed="${ui.dice.has(i)}">${pips}</button>`;
}

function toolsHtml(p) {
  if (game.over || game.current !== p) return '';
  const human = isHuman(p);
  let out = game.dice.length ? `<div class="dice">${game.dice.map((_, i) => dieHtml(i)).join('')}</div>` : '';
  if (game.pyr && game.phase === 'pyramid') out += `<div class="pyr-info"><span class="pdie">${game.pyr.steps}</span> pas de pyramide</div>`;
  if (!human) return `${out}<p class="thinking">L'ordinateur réfléchit…</p>`;
  if (game.phase === 'idle') {
    out += `<button type="button" class="btn btn-main btn-gold" data-act="roll">Lancer les 3 dés</button>`;
    if (game.attackOptions().length) out += `<button type="button" class="btn btn-orange" data-act="attack">Attaquer</button>`;
  }
  if (game.phase === 'attackSelect') out += `<button type="button" class="btn btn-sand" data-act="cancel">Annuler</button>`;
  if (game.phase === 'attackFollow') out += `<button type="button" class="btn btn-sand" data-act="end">Terminer le tour</button>`;
  if (game.phase === 'pyrChoose') out += `<p>Dé pyramide : choisis</p><div class="dice">${game.pyr.values.map((v) => `<button type="button" class="pdie big" data-pyr="${v}">${v}</button>`).join('')}</div>`;
  return out;
}

function campHtml(p) {
  const saved = game.saved[p];
  const pile = (n) => (n
    ? stackMarkup(p, n, 50, 118, { cap: PIONS_PER_PLAYER, badge: false, scale: 1 })
    : '<ellipse cx="50" cy="116" rx="26" ry="12" fill="none" stroke="#3a2813" stroke-dasharray="4 4" stroke-width="2"/>');
  const active = !game.over && game.current === p && isHuman(p);
  const mk = active ? marks().reserve : '';
  const reserve = `<button type="button" class="reserve ${mk || ''}${active && ui.from === 'reserve' ? ' selected' : ''}"${active ? ' data-node="reserve"' : ' tabindex="-1"'} aria-label="Pions dans le camp : ${game.reserve[p]}"><svg class="pile" viewBox="0 0 100 130" aria-hidden="true">${pile(game.reserve[p])}</svg></button>`;
  const inBase = game.pyramids[p] === null;
  const att = game.lastAttack && game.current === p && ['attack', 'attackFollow'].includes(game.phase) ? `<p class="last">Dé ${game.lastAttack.attDie} + ${game.lastAttack.attackerCount} = ${game.lastAttack.attScore}</p>` : '';
  return `<h2><img class="emblem" src="${EMBLEMS[p]}" alt="${PLAYER_NAMES[p]}" title="${PLAYER_NAMES[p]}" width="100" height="108" /></h2><p class="who">${label(p)}</p>
    <div class="piles">
      <div class="pile-box"><span>Camp</span>${reserve}<b>${game.reserve[p]}</b></div>
      <div class="pile-box"><span>Sauvés</span><svg class="pile" viewBox="0 0 100 130" aria-hidden="true">${pile(saved)}</svg><b>${saved}</b></div>
    </div>
    <dl class="stats">
      <div><dt>Plateau</dt><dd>${game.pionsOnBoard(p)}</dd></div>
      <div><dt>Perdus</dt><dd>${game.lost[p]}</dd></div>
    </dl>
    <div class="base${inBase ? '' : ' away'}"><svg viewBox="0 0 60 60" aria-hidden="true">${pyramidMarkup(p, 30, 42, 1)}</svg><span>${inBase ? 'Pyramide dans la base' : 'Pyramide en jeu'}</span></div>
    ${att}<div class="tools">${toolsHtml(p)}</div>`;
}

function hintText() {
  const who = game.name();
  if (game.over) return 'Partie terminée.';
  if (!isHuman(game.current)) return `Tour de ${who} (ordinateur).`;
  const t = {
    idle: `${who}, à toi : lance les dés ou attaque.`,
    move: sum() ? 'Choisis le pion à déplacer (ou ton camp pour en faire entrer un), puis la case d\'arrivée ou la sortie.' : 'Choisis un dé (ou plusieurs pour les additionner).',
    attackSelect: ui.from ? 'Choisis le bataillon ennemi à attaquer.' : 'Choisis ton bataillon attaquant.',
    attack: 'L\'attaque est lancée…',
    attackFollow: 'Victoire ! Attaque encore avec le même bataillon ou termine ton tour.',
    pyrChoose: 'Triple ! Choisis la valeur du dé pyramide.',
    pyramid: 'Avance la pyramide : clique la case suivante.',
    tripleKill: 'Triple : supprime un pion adverse.',
  };
  return `${who} : ${t[game.phase] ?? ''}`;
}

function render() {
  const key = `${game.current}:${game.phase}`;
  if (key !== ui.lastKey) {
    ui.dice.clear();
    ui.from = game.phase === 'attackFollow' ? game.attack.to : null;
    ui.lastKey = key;
  }
  if (game.phase === 'move' && ui.from && !game.destinations(ui.from, sum() || 0).length) ui.from = null;
  renderBoard($('board'), game, { marks: marks(), selected: ui.from });
  [0, 1].forEach((p) => {
    const el = $(`camp-${p}`);
    el.innerHTML = campHtml(p);
    el.classList.toggle('active', !game.over && game.current === p);
  });
  $('hint').textContent = hintText();
  schedule();
}

function schedule() {
  clearTimeout(timer);
  if (game.over || battling || $('menu').hidden === false) return;
  if (game.phase === 'attack') timer = setTimeout(runBattle, 300);
  else if (!isHuman(game.current)) timer = setTimeout(() => aiStep(game), 850);
  else if (game.phase === 'pyramid' && game.pyramidOptions().length === 1) timer = setTimeout(() => game.pyramidStep(game.pyramidOptions()[0]), 650);
}

async function runBattle() {
  if (battling || game.phase !== 'attack') return;
  battling = true;
  clearTimeout(timer);
  const { from, to } = game.attack;
  const a = game.cells[from];
  const d = game.cells[to];
  await battle.open({ attacker: { owner: a.owner, count: a.count }, defender: { owner: d.owner, count: d.count }, names: PLAYER_NAMES });
  while (game.phase === 'attack') {
    const r = game.attackRound();
    if (!r) break;
    await battle.playRound(r, PLAYER_NAMES);
  }
  const { att, def } = battle.state;
  const win = att.count > 0 ? att : def;
  const lose = att.count > 0 ? def : att;
  await battle.close(`${PLAYER_NAMES[win.owner]} l'emporte et prend la place de ${PLAYER_NAMES[lose.owner].toLowerCase()} (${win.count} pion${win.count > 1 ? 's' : ''} restant${win.count > 1 ? 's' : ''}).`);
  battling = false;
  render();
}

function onNode(id) {
  if (!isHuman(game.current)) return;
  const m = marks()[id];
  switch (game.phase) {
    case 'move':
      if (m === 'move' && ui.from) {
        const [from, idxs] = [ui.from, [...ui.dice]];
        ui.from = null;
        ui.dice.clear();
        game.move(from, id, idxs);
      } else if (m === 'pick') { ui.from = ui.from === id ? null : id; render(); } else { ui.from = null; render(); }
      break;
    case 'attackSelect':
      if (m === 'attack') game.attackBattalion(ui.from, id);
      else if (m === 'pick') { ui.from = id; render(); }
      break;
    case 'attackFollow': if (m === 'attack') game.attackBattalion(game.attack.to, id); break;
    case 'pyramid': if (m === 'move') game.pyramidStep(id); break;
    case 'tripleKill': if (m === 'kill') game.removeEnemy(id); break;
    default:
  }
}

function onClick(e) {
  const t = e.target.closest('[data-node],[data-die],[data-act],[data-pyr]');
  if (!t || !isHuman(game.current)) return;
  if (t.dataset.node) return onNode(t.dataset.node);
  if (t.dataset.die !== undefined) {
    const i = +t.dataset.die;
    if (game.phase !== 'move' || game.dice[i].used) return;
    if (ui.dice.has(i)) ui.dice.delete(i);
    else { if (game.moveLimit === 1) ui.dice.clear(); ui.dice.add(i); }
    ui.from = null;
    return render();
  }
  if (t.dataset.pyr) return void game.choosePyramid(+t.dataset.pyr);
  const act = { roll: () => { ui.rolled = true; sounds.rattle(); game.roll(); setTimeout(() => { ui.rolled = false; }, 600); }, attack: () => game.beginAttack(), cancel: () => game.cancelAttack(), end: () => game.endAttackTurn() }[t.dataset.act];
  act?.();
}

function startGame(mode) {
  ui.mode = mode;
  ui.logs = [];
  ui.lastKey = '';
  $('menu').hidden = true;
  $('final').hidden = true;
  game.reset();
}

function showRules(show) { $('rules').hidden = !show; }

const SAVE_KEY = 'brame.save.v1';
function persist() {
  try {
    if (game.over) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, JSON.stringify({ mode: ui.mode, state: game.serialize() }));
  } catch { /* stockage indisponible : la partie ne sera simplement pas conservée */ }
}

function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    const s = saved?.state;
    if (!s || !Array.isArray(s.reserve) || !s.cells || s.phase === 'over') return false;
    ui.mode = saved.mode === '2p' ? '2p' : 'ai';
    game.load(s);
    $('menu').hidden = true;
    return true;
  } catch {
    return false;
  }
}

game.on('change', () => { render(); persist(); });
game.on('log', (msg) => ui.logs.push(msg));
game.on('saved', () => sounds.saved());
game.on('crush', () => sounds.crunch());
game.on('over', ({ winner, saved }) => {
  const show = () => (battling ? setTimeout(show, 300) : setTimeout(() => {
    sounds.win();
    $('final-title').textContent = winner === null ? 'Égalité !' : `${PLAYER_NAMES[winner]} gagne (${label(winner)}) !`;
    $('final-score').textContent = `Pions sauvés : Noir ${saved[0]} - Rouge ${saved[1]}.`;
    $('final').hidden = false;
  }, 700));
  show();
});

document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${SYMBOLS}</svg>`);
document.addEventListener('click', onClick);
$('start-ai').addEventListener('click', () => startGame('ai'));
$('start-2p').addEventListener('click', () => startGame('2p'));
$('btn-new').addEventListener('click', () => { $('menu').hidden = false; clearTimeout(timer); });
$('btn-menu').addEventListener('click', () => { $('final').hidden = true; $('menu').hidden = false; });
$('btn-again').addEventListener('click', () => startGame(ui.mode));
$('btn-sound').addEventListener('click', (e) => {
  sounds.muted = !sounds.muted;
  e.currentTarget.textContent = sounds.muted ? 'Son : non' : 'Son : oui';
  e.currentTarget.setAttribute('aria-pressed', String(!sounds.muted));
});
$('btn-rules').addEventListener('click', () => showRules(true));
$('menu-rules').addEventListener('click', () => showRules(true));
$('rules-close').addEventListener('click', () => showRules(false));
$('rules').addEventListener('click', (e) => { if (e.target === $('rules')) showRules(false); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') showRules(false); });

mountGameChrome();
if (restore()) ui.logs.push('Partie reprise.');
else render();
