import { levelTests } from '../core/levels/index.js';
import { tickBudget, recordResults } from '../api/levelTests.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Joue les tests d'un niveau EN DIRECT dans la vue du jeu (la carte est visible).
 * Le jeu est en « mode test » : réussir ne passe pas au niveau suivant.
 * Chaque résultat est enregistré (réussites mémorisées) et annoncé par l'évènement `testResult`.
 */
export class LiveTests {
  constructor({ game, api, log }) {
    this.game = game;
    this.api = api;
    this.log = log;
    this.cancel = null;
  }

  /** Joue une variante. Retourne { index, name, ok, ticks, reason, aborted? }. */
  play(level, index, fnName) {
    this.cancel?.();
    const { game, api, log } = this;
    const fn = api.userFns[fnName];
    const name = levelTests(level).find((t) => t.index === index)?.name ?? `test ${index}`;
    const base = { level, index, name };
    if (!fn) return Promise.resolve({ ...base, ok: false, ticks: 0, reason: `Fonction « ${fnName} » introuvable.` });

    const max = tickBudget(level, index);
    api.stop();
    game.jumpToLevel(level, index, { testMode: true });
    log('info', `--- Test « ${name} » (niveau ${level}) : ${fnName}() — maximum ${max} pas ---`);
    game.events.emit('testRunning', base);

    return new Promise((resolve) => {
      const start = game.tickCount;
      let finished = false;
      let done = false;
      const end = (ok, reason, aborted = false) => {
        if (done) return;
        done = true;
        game.events.off('tick', onTick);
        this.cancel = null;
        if (!aborted) {
          if (!ok) api.stop();
          log(ok ? 'info' : 'error', ok ? `Test « ${name} » réussi en ${game.tickCount - start} pas.` : `Test « ${name} » échoué : ${reason}`);
          const result = { ...base, ok, ticks: game.tickCount - start, reason };
          recordResults(level, [result]);
          game.events.emit('testResult', result);
          resolve(result);
        } else resolve({ ...base, ok: false, ticks: 0, reason, aborted: true });
      };
      const onTick = () => {
        if (game.state === 'levelcomplete' || game.state === 'won') end(true, '');
        else if (game.state === 'gameover') end(false, 'le pixel a perdu (voir le message au-dessus).');
        else if (game.tickCount - start >= max) end(false, `trop de pas (maximum ${max}), objectif non atteint.`);
        else if (finished && !game.queue.length) end(false, 'la fonction est terminée mais l\'objectif n\'est pas atteint.');
      };
      this.cancel = () => end(false, 'interrompu', true);
      game.events.on('tick', onTick);
      (async () => fn())()
        .catch((err) => end(false, `erreur dans ta fonction : ${err.message}`))
        .finally(() => { finished = true; });
    });
  }

  /** Joue tous les tests du niveau l'un après l'autre. */
  async validate(level, fnName) {
    const tests = levelTests(level);
    this.log('info', `=== Validation du niveau ${level} avec ${fnName}() : ${tests.length} tests ===`);
    let passed = 0;
    for (const t of tests) {
      const r = await this.play(level, t.index, fnName);
      if (r.aborted) return;
      if (r.ok) passed++;
      await sleep(900);
    }
    const all = passed === tests.length;
    this.log(all ? 'info' : 'error', all ? `NIVEAU ${level} VALIDÉ : ${passed} / ${tests.length} tests réussis !` : `Niveau ${level} non validé : ${passed} / ${tests.length} tests réussis.`);
    this.game.jumpToLevel(level, 0);
  }
}
