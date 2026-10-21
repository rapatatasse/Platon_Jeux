import { Game } from '../core/Game.js';
import { getLevelDef, buildLevel, levelTests } from '../core/levels/index.js';
import { shortestSteps } from '../core/path.js';
import { createTerminalApi, compileUserFunction } from './terminalApi.js';

export const MAX_TEST_TICKS = 600;
const STORAGE_KEY = 'pixel.levelTests.v1';

const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

/** Nombre de ticks autorisés pour un test : budget × chemin le plus court vers la 1re porte, sinon MAX_TEST_TICKS. */
export function tickBudget(level, testIndex) {
  const def = getLevelDef(level, testIndex);
  if (!def.budget) return MAX_TEST_TICKS;
  const { world, gates, bounds } = buildLevel(def);
  const best = shortestSteps(world, bounds, { x: 0, z: 0 }, gates[0]);
  return best === null ? MAX_TEST_TICKS : Math.ceil(best * def.budget);
}

/**
 * Joue UNE fonction (sans argument) sur un niveau neuf, sans aucune intervention du joueur.
 * Retourne { ok, ticks, reason }.
 */
export async function runLevelTest(level, testIndex, code) {
  const game = new Game({ level, test: testIndex });
  const api = createTerminalApi(game, () => {});
  let failure = null;
  game.events.on('gameOver', ({ reason }) => { failure = reason; });
  let fn;
  try {
    fn = compileUserFunction(api, code).fn;
  } catch (err) {
    return { ok: false, ticks: 0, reason: `Fonction invalide : ${err.message}` };
  }

  let finished = false;
  (async () => fn())().catch((err) => { failure ??= `Erreur dans ta fonction : ${err.message}`; }).finally(() => { finished = true; });

  const max = tickBudget(level, testIndex);
  await flush();
  while (game.state === 'playing' && game.tickCount < max && !failure) {
    if (finished && !game.queue.length) break;
    game.tick();
    await flush();
  }
  if (game.state === 'levelcomplete') return { ok: true, ticks: game.tickCount, reason: '' };
  if (!failure) failure = game.tickCount >= max ? `Trop de pas (maximum ${max}) : objectif non atteint.` : 'Objectif non atteint.';
  return { ok: false, ticks: game.tickCount, reason: failure };
}

/** Lance tous les tests d'un niveau. Retourne [{ index, name, ok, ticks, reason }]. */
export async function runAllLevelTests(level, code, onResult = () => {}) {
  const results = [];
  for (const t of levelTests(level)) {
    const r = { index: t.index, name: t.name, ...(await runLevelTest(level, t.index, code)) };
    results.push(r);
    onResult(r);
  }
  return results;
}

// ---------------------------------------------------------------- Sauvegarde des réussites

/** { [niveau]: { [indexTest]: true } } */
export function loadProgress(storage = globalThis.localStorage) {
  try {
    return JSON.parse(storage?.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

/** Enregistre les tests réussis (une réussite n'est jamais effacée). Retourne la progression à jour. */
export function recordResults(level, results, storage = globalThis.localStorage) {
  const progress = loadProgress(storage);
  const passed = { ...(progress[level] ?? {}) };
  for (const r of results) if (r.ok) passed[r.index] = true;
  progress[level] = passed;
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* stockage indisponible */ }
  return progress;
}

export function passedCount(progress, level) {
  return Object.keys(progress[level] ?? {}).length;
}
