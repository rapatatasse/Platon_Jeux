import '../../shared/theme.js';
import './style.css';
import { DeliveryGame } from './core/DeliveryGame.js';
import { buildWorld } from './core/world.js';
import { COUNTRIES, whenPhrase } from './inventions.js';
import { GEO, MAP_SIZE } from './worldGeo.js';
import { MapView } from './render/MapView.js';
import { Sounds } from './sounds.js';
import { Keyboard } from '../../shared/Keyboard.js';
import { Music } from '../../shared/Music.js';
import { loadTextures } from '../../shared/loadTextures.js';
import { startLoop } from '../../shared/loop.js';
import { mountGameChrome } from '../../shared/chrome.js';
import { bindTouchControls } from '../../shared/TouchControls.js';

// ═══════════════════════════════════════════════════════════════════════════
//  RÉGLAGES DU JEU — modifie ces valeurs pour changer les règles
//  (les pays, inventeurs et dates sont dans inventions.js)
// ═══════════════════════════════════════════════════════════════════════════
const GAME = {
  deliveriesToWin: 20,          // nombre d'inventions à livrer pour gagner
  timeLimitSec: 300,            // temps maximum : 300 s = 5 minutes
  choicesPerRound: 5,           // nombre de pays proposés avant chaque livraison
  pauseTimerWhileReading: true, // true = le chrono s'arrête pendant le choix du pays et la lecture de la livraison
  mapScale: 2.2,                // taille de la carte (1 unité de la carte SVG = 2.2 unités de jeu)
  viewHeight: 520,              // zoom de la caméra (plus petit = plus proche)
  arrivalRadius: 45,            // rayon autour du centre du pays qui compte comme arrivée (aide pour les petits pays)
  arrivalDwell: 0.35,           // secondes à passer dans la zone du pays pour livrer
  ship: {                       // mêmes déplacements que le vaisseau de la page d'accueil
    radius: 24, turnSpeed: 3.4, uturnSpeed: 9,
    accel: 900, maxSpeed: 480, drag: 1.7,
  },

  // Niveaux (choisis avec l'adresse ?niveau=1, ?niveau=2, ?niveau=3).
  // Chaque niveau peut aussi redéfinir deliveriesToWin et timeLimitSec.
  //   compass    : 'ok' = boussole normale (flèche + km)
  //                'broken' = boussole cassée : fumée et aiguille folle, mais les km restent exacts
  //                'kmOnly' = plus de flèche, seulement la distance en km
  //   showNames  : afficher le nom des pays sur la carte
  //   showTarget : afficher le contour et le rond qui marquent le pays à rejoindre
  levels: [
    { title: 'Niveau 1 — Le grand départ', compass: 'ok', showNames: true, showTarget: true, story: [
      'Un savant fou a éteint la créativité du monde : toutes les inventions ont disparu !',
      'Aide-moi à parcourir la planète, à inspirer les inventeurs et à leur rendre leurs inventions.',
    ] },
    { title: 'Niveau 2 — La boussole cassée', compass: 'broken', showNames: true, showTarget: true, story: [
      'Le savant fou a saboté ma boussole : elle fume et son aiguille tourne dans tous les sens !',
      'Ne fais pas confiance à la flèche. Seule la distance en kilomètres est encore juste : repère-toi avec elle et avec le nom des pays.',
    ] },
    { title: 'Niveau 3 — La carte effacée', compass: 'kmOnly', showNames: false, showTarget: false, story: [
      'Pire encore : le savant fou a effacé le nom des pays et le rond qui marquait la destination !',
      'Il ne reste que la distance en kilomètres. Sers-toi d\'elle, et de ta mémoire !',
    ] },
  ],
};
// ═══════════════════════════════════════════════════════════════════════════

const BASE = import.meta.env.BASE_URL;
const $ = (id) => document.getElementById(id);
const show = (el) => { el.hidden = false; };
const hide = (el) => { el.hidden = true; };
const mmss = (s) => { const t = Math.ceil(Math.max(0, s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const durationLabel = (s) => (s % 60 === 0 ? `${s / 60} minute${s / 60 > 1 ? 's' : ''}` : mmss(s));

async function boot() {
  mountGameChrome();
  const stage = $('stage');
  const levelNo = clamp(parseInt(new URLSearchParams(location.search).get('niveau'), 10) || 1, 1, GAME.levels.length);
  const LEVEL = { ...GAME, ...GAME.levels[levelNo - 1] };
  const world = buildWorld({ countries: COUNTRIES, geo: GEO, mapSize: MAP_SIZE, scale: GAME.mapScale });
  const [shipTop] = await loadTextures([`${BASE}images/vaisseau_vue_haut.png`]);

  const game = new DeliveryGame({
    world,
    config: { ...LEVEL, timeLimit: LEVEL.timeLimitSec, startX: 0, startY: 0 },
  });
  const view = new MapView($('map'), game, { geo: GEO, mapSize: MAP_SIZE, shipTexture: shipTop, viewHeight: GAME.viewHeight, showNames: LEVEL.showNames, showTarget: LEVEL.showTarget });
  const sounds = new Sounds();
  const music = new Music();
  const keys = new Keyboard();
  const touchInput = new Set();
  bindTouchControls(document.getElementById('touch-controls'), {
    onState: (state) => { touchInput.clear(); state.forEach((code) => touchInput.add(code)); },
    onAction: (action) => { if (action === 'uturn') game.uturn(); },
  });
  stage.classList.add('ready');

  const kmPerUnit = 40075 / (world.halfW * 2);   // tour de la Terre / largeur de la carte
  $('goal').textContent = LEVEL.deliveriesToWin;
  $('level-v').textContent = levelNo;
  $('intro-title').textContent = LEVEL.title;
  $('intro-story').replaceChildren(...LEVEL.story.map((s) => Object.assign(document.createElement('p'), { textContent: s })));
  $('intro-goal').textContent = `livrer ${LEVEL.deliveriesToWin} invention${LEVEL.deliveriesToWin > 1 ? 's' : ''} en moins de ${durationLabel(LEVEL.timeLimitSec)}`;
  $('levels').replaceChildren(...GAME.levels.map((_, i) => {
    const a = document.createElement('a');
    a.href = `?niveau=${i + 1}`; a.textContent = i + 1; a.className = i + 1 === levelNo ? 'current' : '';
    a.setAttribute('aria-label', `Niveau ${i + 1}`);
    return a;
  }));
  const brokenCompass = LEVEL.compass === 'broken';
  $('compass').classList.toggle('broken', brokenCompass);
  $('compass').classList.toggle('km-only', LEVEL.compass === 'kmOnly');

  // ── son
  const soundBtn = document.createElement('button');
  soundBtn.type = 'button'; soundBtn.className = 'sound';
  const refreshSound = () => { soundBtn.textContent = music.muted ? 'Son : non' : 'Son : oui'; sounds.muted = music.muted; };
  soundBtn.addEventListener('click', () => { music.toggleMute(); refreshSound(); });
  stage.appendChild(soundBtn);
  refreshSound();

  // ── écrans
  const startGame = () => { if (game.state !== 'intro') return; hide($('intro')); show($('hud')); stage.classList.add('playing'); game.start(); };
  $('btn-start').addEventListener('click', startGame);
  const continueGame = () => { if (game.state !== 'delivering') return; hide($('delivery')); game.continue(); };
  $('btn-continue').addEventListener('click', continueGame);
  $('btn-replay').addEventListener('click', () => location.reload());
  const choose = (i) => { if (game.state === 'choosing') { sounds.select(); game.choose(i); } };
  keys.onPress('Enter', () => { startGame(); continueGame(); });
  for (let i = 0; i < LEVEL.choicesPerRound; i++) {
    keys.onPress(`Digit${i + 1}`, () => choose(i));
    keys.onPress(`Numpad${i + 1}`, () => choose(i));
  }
  $('btn-start').focus();

  const { events } = game;
  events.on('proposals', ({ proposals }) => {
    $('choices').replaceChildren(...proposals.map((p, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn';
      b.innerHTML = '<small></small><span></span>';
      b.firstChild.textContent = i + 1;
      b.lastChild.textContent = p.country.name;
      b.addEventListener('click', () => choose(i));
      li.appendChild(b);
      return li;
    }));
    $('choose-count').textContent = `${game.deliveredCount} / ${LEVEL.deliveriesToWin} inventions livrées.`;
    stage.classList.remove('touch-flying');
    show($('choose'));
    $('choices').querySelector('button')?.focus();
  });

  events.on('target', ({ country }) => {
    hide($('choose'));
    stage.classList.add('touch-flying');
    view.setTarget(country);
    $('compass-name').textContent = country.name;
    show($('compass')); show($('controls'));
    sounds.takeoff();
  });

  events.on('delivered', ({ country, invention, count }) => {
    view.setTarget(null);
    stage.classList.remove('touch-flying');
    view.markDelivered(country);
    hide($('compass')); hide($('controls'));
    $('count-v').textContent = count;
    $('delivery-title').textContent = country.name;
    $('delivery-sentence').textContent = `${invention.inventor} ${invention.plural ? 'viennent' : 'vient'} d'inventer ${invention.invention} ${country.locative}, ${whenPhrase(invention)}.`;
    $('delivery-desc').textContent = invention.description;
    show($('delivery'));
    $('btn-continue').focus();
    sounds.deliver();
  });

  const endScreen = ({ won, count, timeUsed }) => {
    view.setTarget(null);
    stage.classList.remove('touch-flying');
    hide($('compass')); hide($('controls')); hide($('hud'));
    const hasNext = won && levelNo < GAME.levels.length;
    $('end-title').textContent = !won ? 'Le temps est écoulé…'
      : hasNext ? `Niveau ${levelNo} réussi !` : 'Fin du jeu ! Bravo, la créativité est de retour !';
    $('end-text').textContent = won
      ? `Tu as livré ${count} inventions en ${mmss(timeUsed)}. ${hasNext ? 'Le savant fou prépare un nouveau piège…' : 'Le savant fou est battu : tous les niveaux sont terminés !'}`
      : `Tu as livré ${count} inventions sur ${LEVEL.deliveriesToWin}. Le savant fou a encore un peu d'avance : réessaie !`;
    $('btn-next').hidden = !hasNext;
    $('btn-next').href = `?niveau=${levelNo + 1}`;
    $('btn-replay').textContent = won ? 'Rejouer ce niveau' : 'Réessayer';
    $('end-platon').src = `${BASE}images/${won ? 'platon_montrant' : 'platon'}.png`;
    $('end-list').replaceChildren(...game.delivered.map(({ iso, invention }) => {
      const c = world.countries.find((x) => x.iso === iso);
      const li = document.createElement('li');
      li.innerHTML = '<b></b> — <span></span>';
      li.firstChild.textContent = c.name;
      li.lastChild.textContent = `${invention.invention}, ${whenPhrase(invention)}`;
      return li;
    }));
    show($('end'));
    (hasNext ? $('btn-next') : $('btn-replay')).focus();
    won ? sounds.win() : sounds.lose();
  };
  events.on('won', (e) => endScreen({ won: true, ...e }));
  events.on('lost', (e) => endScreen({ won: false, ...e, timeUsed: LEVEL.timeLimitSec }));

  // ── boucle
  let lastSecond = -1;
  let needleDeg = 0, needleGoal = 0, needleTimer = 0;   // aiguille affolée (niveau 2)
  startLoop((dt) => {
    const flying = game.state === 'flying';
    const turn = (keys.isDown('ArrowLeft') || touchInput.has('left') ? 1 : 0)
      - (keys.isDown('ArrowRight') || touchInput.has('right') ? 1 : 0);
    const thrust = keys.isDown('ArrowUp') || touchInput.has('up') ? 1 : 0;
    game.update(dt, { turn, thrust });
    view.update(dt, flying && thrust > 0);

    $('timer').textContent = mmss(game.timeLeft);
    $('timer').classList.toggle('low', game.timeLeft <= 30);
    const sec = Math.ceil(game.timeLeft);
    if (flying && sec <= 10 && sec !== lastSecond) sounds.tick();
    lastSecond = sec;

    const k = flying && game.compass();
    if (k) {
      if (brokenCompass) {
        needleTimer -= dt;
        if (needleTimer <= 0) { needleTimer = 0.12 + Math.random() * 0.5; needleGoal = needleDeg + (Math.random() - 0.5) * 900; }
        needleDeg += (needleGoal - needleDeg) * Math.min(1, dt * 7);
        $('needle').style.transform = `rotate(${needleDeg}deg)`;
      } else {
        $('needle').style.transform = `rotate(${90 - (k.angle * 180) / Math.PI}deg)`;
      }
      $('compass-dist').textContent = `≈ ${(Math.round((k.distance * kmPerUnit) / 10) * 10).toLocaleString('fr-FR')} km`;
    }
  });
  keys.onPress('ArrowDown', () => game.uturn());

  window.game = game;   // pratique pour déboguer dans la console du navigateur
}

boot().catch((e) => {
  console.error(e);
  document.querySelector('.loading').textContent = 'Impossible de charger la carte. Recharge la page.';
});
