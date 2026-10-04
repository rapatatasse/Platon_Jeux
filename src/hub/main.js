import '../shared/theme.js';
import './style.css';
import { SpaceGame } from './core/SpaceGame.js';
import { SpaceView } from './render/SpaceView.js';
import { Hud } from './ui/Hud.js';
import { Guide } from './ui/Guide.js';
import { OrbitModal } from './ui/OrbitModal.js';
import { HubSounds } from './HubSounds.js';
import { Keyboard } from '../shared/Keyboard.js';
import { Music } from '../shared/Music.js';
import { loadTextures } from '../shared/loadTextures.js';
import { startLoop } from '../shared/loop.js';
import { bindTouchControls } from '../shared/TouchControls.js';

const BASE = import.meta.env.BASE_URL;
const STEP = 1 / 60;   // pas de simulation fixe : évite qu'une balle rapide traverse un astéroïde

async function boot() {
  const stage = document.getElementById('jeu');
  const space = document.getElementById('space');

  // polices manuscrites prêtes avant de dessiner les textures
  await Promise.race([
    Promise.all(['30px "IM Fell English"', '26px Caveat'].map((f) => document.fonts.load(f))),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  const [shipTexture] = await loadTextures([`${BASE}images/vaisseau.png`]);

  const startAt = sessionStorage.getItem('platon.from');
  sessionStorage.removeItem('platon.from');
  const game = new SpaceGame({ startAt });
  const view = new SpaceView(space, game, { shipTexture });
  const hud = new Hud(stage, game);
  const guide = new Guide(document.getElementById('platon'), game);
  const sounds = new HubSounds();
  const music = new Music();
  const keys = new Keyboard();
  const modal = new OrbitModal(document.getElementById('orbit-modal'), game);
  const touchInput = new Set();
  bindTouchControls(document.getElementById('touch-controls'), {
    onState: (state) => { touchInput.clear(); state.forEach((code) => touchInput.add(code)); },
    onAction: (action) => { if (action === 'uturn' && !modal.isOpen) game.uturn(); },
  });
  keys.onPress('ArrowDown', () => !modal.isOpen && game.uturn());
  stage.classList.add('ready');

  // son
  const soundBtn = document.getElementById('btn-sound');
  const refreshSound = () => { soundBtn.textContent = music.muted ? 'Son : non' : 'Son : oui'; soundBtn.setAttribute('aria-pressed', String(!music.muted)); sounds.muted = music.muted; };
  soundBtn.addEventListener('click', () => { music.toggleMute(); refreshSound(); });
  refreshSound();

  // évènements -> sons et effets
  const { events } = game;
  events.on('fire', () => sounds.fire());
  events.on('enemyFire', () => sounds.enemyFire());
  events.on('asteroidHit', ({ x, y }) => { sounds.rock(); view.puff(x, y); });
  events.on('asteroidDestroyed', ({ x, y, r }) => { sounds.boom(); view.burst(x, y, { count: 6 + Math.round(r / 10), size: 10 + r / 3 }); });
  events.on('enemyHit', ({ x, y }) => { sounds.rock(); view.puff(x, y); });
  events.on('enemyDestroyed', ({ x, y }) => { sounds.boom(); view.burst(x, y, { count: 10, size: 16 }); });
  events.on('shipHit', () => sounds.hit());
  events.on('shipDestroyed', ({ x, y }) => { sounds.hit(); view.burst(x, y, { count: 12, size: 18, speed: 200 }); });
  events.on('respawn', () => { sounds.takeoff(); view.snapCamera(); });
  events.on('orbitEnter', ({ planet }) => planet.status === 'open' && sounds.orbit());
  events.on('launchGame', ({ planet }) => launch(planet));

  function launch(planet) {
    sounds.launch();
    stage.classList.add('warp');
    sessionStorage.setItem('platon.from', planet.id);
    setTimeout(() => { location.href = planet.url; }, 900);
  }

  // retour arrière du navigateur : repartir d'une page propre
  window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });

  // le jeu ne tourne (et ne capte les flèches) que lorsqu'il est visible à l'écran
  let visible = true;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    keys.capture = visible;
    if (!visible) keys.clear();
  }, { threshold: 0.35 }).observe(stage);

  let acc = 0;
  let welcomed = false;
  startLoop((dt) => {
    if (!visible) return;
    if (modal.isOpen) { view.update(0); return; }
    const turn = (keys.isDown('ArrowLeft') || touchInput.has('left') ? 1 : 0)
      - (keys.isDown('ArrowRight') || touchInput.has('right') ? 1 : 0);
    game.setInput(turn, keys.isDown('ArrowUp') || touchInput.has('up') ? 1 : 0,
      keys.isDown('Space') || touchInput.has('fire'));
    acc += dt;
    while (acc >= STEP) { game.update(STEP); acc -= STEP; }
    view.update(dt);
    if (!welcomed && game.state === 'flying') { welcomed = true; guide.welcome(); }
  });
  if (game.state === 'takeoff') sounds.takeoff();

  window.game = game;   // pratique pour déboguer dans la console du navigateur
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('jeu')?.classList.add('failed');
});
