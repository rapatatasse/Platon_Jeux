import './style.css';
import { Game } from './core/Game.js';
import { GameView } from './render/GameView.js';
import { Music } from '../../shared/Music.js';
import { mountGameChrome } from '../../shared/chrome.js';
import { createTerminalApi } from './api/terminalApi.js';
import { Terminal } from './ui/Terminal.js';
import { FunctionEditor } from './ui/FunctionEditor.js';
import { Hud } from './ui/Hud.js';
import { LiveTests } from './ui/LiveTests.js';
import { Overlay } from './ui/Overlay.js';
import { LevelsModal } from './ui/LevelsModal.js';
import { initSplitter, initHSplitter } from './ui/Splitter.js';

/**
 * Point d'entrée : assemble logique (core), rendu (render), API terminal et UI.
 * Boucle : requestAnimationFrame pour l'affichage, accumulateur pour les ticks (game.tickMs).
 */
function boot() {
  mountGameChrome();
  initSplitter(document.getElementById('splitter'), document.getElementById('side'));
  initHSplitter(document.getElementById('hsplitter'), document.getElementById('functions'), document.getElementById('side'));
  const game = new Game({ seed: Date.now() % 100000 });
  game.autoAdvance = false;   // réussir un niveau ne change pas de niveau : on passe au suivant avec ▶ ou « Niveaux »
  const view = new GameView(document.getElementById('scene'), game);
  let terminal;
  const log = (kind, text) => terminal?.log(kind, text);
  const music = new Music({ onTrack: (src) => log('event', `Musique : ${src.split('/').pop()}`) });
  const api = createTerminalApi(game, log);

  terminal = new Terminal(document.getElementById('terminal'), api);
  const editor = new FunctionEditor(document.getElementById('functions'), api, log);
  const live = new LiveTests({ game, api, log });
  editor.onValidate = (name) => live.validate(game.level.n, name);
  const levelsModal = new LevelsModal(document.getElementById('levels-modal'), { game, editor, live });
  document.getElementById('levels').onclick = () => levelsModal.open();
  const hud = new Hud(document.getElementById('hud'), game);
  new Overlay(document.getElementById('overlay'), game, { onRestart: () => game.resetLevel() });

  const muteBtn = document.getElementById('mute');
  const refreshMute = () => { muteBtn.textContent = music.muted ? 'Musique : off' : 'Musique : on'; };
  muteBtn.onclick = () => { music.toggleMute(); view.sounds.muted = music.muted; refreshMute(); };
  view.sounds.muted = music.muted;
  refreshMute();

  // Journal des évènements dans le terminal
  game.events.on('error', (m) => log('error', m));
  game.events.on('yellowAttached', () => log('event', `+1 cube jaune (${game.player.size} au total)`));
  game.events.on('cubeDestroyed', (d) => {
    const why = { purple: 'percuté par un violet', bullet: 'touché par une balle', detached: 'détaché du groupe' }[d.cause] ?? d.cause;
    log('event', `Pixel ${d.type} détruit en (${d.x}, ${d.y}, ${d.z}) : ${why}${d.type === 'purple' ? ' → +1 balle' : ''}`);
  });
  game.events.on('cubeMoved', ({ to }) => log('event', `Un cube jaune tombe en (${to.x}, ${to.y}, ${to.z}) (gravité).`));
  const describeLevel = (level) => `NIVEAU ${level.n} · ${level.name} — ${level.intro}`;
  game.events.on('levelLoaded', ({ level }) => log('info', describeLevel(level)));
  game.events.on('gatePassed', ({ done, total }) => log('event', `Porte traversée ! (${done} / ${total})`));
  game.events.on('levelComplete', ({ level }) => log('info', `NIVEAU ${level} RÉUSSI !`));
  game.events.on('won', ({ score }) => log('info', `VICTOIRE ! Tous les niveaux sont terminés. Score : ${score}`));
  game.events.on('gameOver', ({ reason }) => log('error', `PERDU : ${reason}`));
  game.events.on('tick', () => hud.update());
  game.events.on('bulletsChanged', () => hud.update());
  game.events.on('queueChanged', () => hud.update());

  log('info', 'Bienvenue ! Tape help() pour la liste des commandes, test() pour une démo.');
  log('info', 'La musique démarre au premier clic ou à la première touche (bouton "Musique" en haut à droite).');
  log('info', describeLevel(game.level));
  terminal.focus();

  // Boucle principale
  let last = performance.now();
  let acc = 0;
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt * 1000;
    while (acc >= game.tickMs) {
      game.tick();
      acc -= game.tickMs;
    }
    view.update(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  window.game = game;   // pratique pour déboguer dans la console du navigateur
  window.api = api;
}

boot();
