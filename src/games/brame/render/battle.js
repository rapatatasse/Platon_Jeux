// Vue rapprochée d'une bataille : deux piles face à face, dés lancés à la suite, effets visuels et sons d'insectes.
// Aucune règle ici : on anime les résultats déjà calculés par Game.attackRound().
import { stackMarkup } from './board.js';

const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pips = (v) => PIPS[v].map((n) => `<i style="grid-area:${Math.ceil(n / 3)}/${((n - 1) % 3) + 1}"></i>`).join('');

export function createBattle(root, sounds) {
  const q = (s) => root.querySelector(s);
  const el = { stage: q('.battle-stage'), title: q('.bt-title'), msg: q('.bmsg'), vs: q('.vs'), skip: q('.bskip') };
  const side = { att: q('.bside.att'), def: q('.bside.def') };
  const part = (k) => ({ stack: side[k].querySelector('.bstack'), die: side[k].querySelector('.bdie'), score: side[k].querySelector('.bscore'), count: side[k].querySelector('.bcount'), name: side[k].querySelector('.bname') });
  const ui = { att: part('att'), def: part('def') };
  const state = { att: { owner: 0, count: 0 }, def: { owner: 1, count: 0 }, fast: false };
  el.skip.addEventListener('click', () => { state.fast = true; });

  const t = (ms) => sleep(state.fast ? ms / 4 : ms);

  function draw(k) {
    const s = state[k];
    ui[k].stack.innerHTML = s.count ? stackMarkup(s.owner, s.count, 80, 188, { cap: 15, badge: false, scale: 2.2 }) : '';
    ui[k].count.textContent = `× ${s.count}`;
  }

  function showDie(k, v, cls = '') {
    const d = ui[k].die;
    d.className = `bdie on ${cls}`.trim();
    d.innerHTML = pips(v);
  }

  async function rollDie(k, final) {
    const d = ui[k].die;
    d.classList.add('on', 'rolling');
    sounds.rattle();
    const end = Date.now() + (state.fast ? 250 : 900);
    while (Date.now() < end) {
      d.innerHTML = pips(1 + Math.floor(Math.random() * 6));
      await sleep(70);
    }
    showDie(k, final, 'landed');
    sounds.tick();
    await t(450);
  }

  /** Le pion du dessus éclate en éclats, puis se transforme en nuage de poussière. */
  function burst(k) {
    const host = side[k];
    const svg = ui[k].stack;
    const hr = host.getBoundingClientRect();
    const sr = svg.getBoundingClientRect();
    const scale = sr.width / 160;
    const layers = Math.min(state[k].count, 15);
    const x = sr.left - hr.left + sr.width / 2;
    const y = sr.top - hr.top + (188 - (layers - 1) * 11 - 6) * scale;
    const spawn = (cls, vars, ms, css = '') => {
      const n = document.createElement('span');
      n.className = cls;
      n.style.cssText = `left:${x}px;top:${y}px;${css}`;
      Object.entries(vars).forEach(([key, v]) => n.style.setProperty(key, v));
      host.appendChild(n);
      setTimeout(() => n.remove(), ms);
    };
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.random() * 0.6;
      const r = 70 + Math.random() * 60;
      spawn(`shard p${state[k].owner}`, { '--dx': `${Math.cos(a) * r}px`, '--dy': `${Math.sin(a) * r * 0.7 - 30}px`, '--r': `${(Math.random() - 0.5) * 720}deg` }, 1000);
    }
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 30 + Math.random() * 60;
      spawn('dust', { '--dx': `${Math.cos(a) * r}px`, '--dy': `${Math.sin(a) * r * 0.6 - 25}px` }, 1500, `animation-delay:${0.1 + Math.random() * 0.25}s;width:${36 + Math.random() * 34}px;height:${36 + Math.random() * 34}px`);
    }
  }

  const cleanup = () => {
    ['att', 'def'].forEach((k) => {
      side[k].classList.remove('lunge', 'hit', 'win');
      ui[k].die.className = 'bdie';
      ui[k].die.innerHTML = '';
      ui[k].score.textContent = '';
      ui[k].score.classList.remove('big');
    });
  };

  return {
    state,
    async open({ attacker, defender, names }) {
      state.att = { ...attacker };
      state.def = { ...defender };
      state.fast = false;
      cleanup();
      el.stage.classList.remove('zoom-out');
      ui.att.name.textContent = names[attacker.owner];
      ui.def.name.textContent = names[defender.owner];
      el.title.textContent = `Bataille : ${names[attacker.owner]} attaque ${names[defender.owner]} !`;
      el.msg.textContent = 'Les scarabées se font face…';
      draw('att');
      draw('def');
      root.hidden = false;
      sounds.buzz(24);
      await sleep(900);
    },

    async playRound(r, names) {
      cleanup();
      const a = state.att;
      const d = state.def;
      el.msg.textContent = 'Les scarabées s\'élancent !';
      side.att.classList.add('lunge');
      side.def.classList.add('lunge');
      sounds.buzz();
      await t(500);
      el.msg.textContent = `${names[a.owner]} lance son dé…`;
      await rollDie('att', r.attDie);
      el.msg.textContent = `${names[d.owner]} lance son dé…`;
      await rollDie('def', r.defDie);
      ui.att.score.textContent = `${r.attDie} + ${r.attackerCount} = ${r.attScore}`;
      ui.def.score.textContent = `${r.defDie} + ${r.defenderCount} = ${r.defScore}`;
      sounds.chitter();
      await t(800);
      const loser = r.attackerLoses ? 'att' : 'def';
      const winner = r.attackerLoses ? 'def' : 'att';
      ui[winner].score.classList.add('big');
      sounds.clash();
      side[loser].classList.add('hit');
      side[winner].classList.add('win');
      burst(loser);
      state[loser].count -= 1;
      draw(loser);
      sounds.crunch();
      el.msg.textContent = r.attackerLoses && r.attScore === r.defScore ? 'Égalité : le défenseur l\'emporte, l\'attaquant perd un pion !' : `${names[state[loser].owner]} perd un pion !`;
      await t(1300);
    },

    async close(text) {
      el.msg.textContent = text;
      sounds.win();
      await t(1500);
      el.stage.classList.add('zoom-out');
      await sleep(450);
      root.hidden = true;
      cleanup();
    },
  };
}
