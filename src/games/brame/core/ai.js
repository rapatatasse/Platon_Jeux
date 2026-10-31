// Ordinateur de BRAME : `aiStep(game)` exécute UNE action selon la phase en cours (le rendu gère le rythme).
import { BASE, EXIT, RESERVE, distancesToGoal, forwardNeighbors, isGoal, startCells } from './board.js';

const distCache = [distancesToGoal(0), distancesToGoal(1)];
const subsets = (list) => list.reduce((acc, x) => acc.concat(acc.map((s) => [...s, x])), [[]]).filter((s) => s.length);

/** Meilleur chemin de pyramide : score = pions adverses écrasés - pions alliés écrasés. */
function bestPyramid(game, steps) {
  const me = game.current;
  let best = { score: -Infinity, first: null };
  const walk = (pos, left, score, first) => {
    if (left === 0) {
      if (score > best.score) best = { score, first };
      return;
    }
    forwardNeighbors(pos, me).forEach((n) => {
      const c = game.cells[n];
      const gain = c ? (c.owner === me ? -c.count : c.count) : 0;
      const bounce = game.pyramids[1 - me] === n ? 2 : 0;
      if (isGoal(n, me)) { if (score + gain + bounce > best.score) best = { score: score + gain + bounce, first: first ?? n }; return; }
      walk(n, left - 1, score + gain + bounce, first ?? n);
    });
  };
  walk(game.pyramids[me] ?? BASE, steps, 0, null);
  return best;
}

/** Cases qu'une pyramide de `owner` peut écraser au prochain double/triple (jusqu'à 3 pas devant elle). */
export function pyramidReach(game, owner) {
  const reach = new Set();
  let layer = [game.pyramids[owner] ?? BASE];
  for (let k = 0; k < 3; k++) {
    const next = new Set();
    layer.forEach((id) => forwardNeighbors(id, owner).forEach((n) => {
      reach.add(n);
      if (!isGoal(n, owner)) next.add(n);
    }));
    layer = [...next];
  }
  return reach;
}

/**
 * Choix d'un déplacement. Priorités : sauver un pion dès que possible, rester hors de portée (3 cases) de la pyramide
 * adverse et de la sienne, tenir sa rangée de départ pour bloquer les passages adverses, puis avancer.
 */
function pickMove(game) {
  const me = game.current;
  const dist = distCache[me];
  const enemyReach = pyramidReach(game, 1 - me);
  const ownReach = pyramidReach(game, me);
  const home = startCells(me).filter((id) => !ownReach.has(id));
  const enemyActive = game.pionsLeft(1 - me) > 0;
  const exposure = (id, reach) => (id !== EXIT && id !== RESERVE && reach.has(id) ? 1 : 0);
  const guarded = (extraOut, extraIn) => home.filter((id) => (game.cells[id]?.owner === me && (id !== extraOut || game.cells[id].count > 1)) || id === extraIn).length;
  const guardBefore = guarded(null, null);
  let best = null;
  const combos = subsets(game.freeDice()).filter((s) => game.moveLimit > 1 || s.length === 1);
  const d = (id) => (id === EXIT ? 0 : id === RESERVE ? Math.min(...startCells(me).map((s) => dist[s])) + 1 : dist[id]);
  game.sources().forEach((from) => combos.forEach((idxs) => {
    const n = idxs.reduce((t, i) => t + game.dice[i].v, 0);
    game.destinations(from, n).forEach((to) => {
      let score = Math.random() * 0.5 - (idxs.length - 1) * 0.3;
      if (to === EXIT) score += 1000;
      else {
        score += (d(from) - d(to)) * 3 + (game.cells[to] ? 0.5 : 0);
        score -= (exposure(to, enemyReach) - exposure(from, enemyReach)) * 8;
        score -= (exposure(to, ownReach) - exposure(from, ownReach)) * 6;
      }
      if (enemyActive) score += (guarded(from, to) - guardBefore) * 4;
      if (!best || score > best.score) best = { score, from, to, idxs };
    });
  }));
  return best;
}

/** Faut-il attaquer plutôt que lancer les dés ? Oui si on a l'avantage numérique net. */
function pickAttack(game) {
  let best = null;
  game.attackOptions().forEach((o) => {
    const edge = game.cells[o.from].count - game.cells[o.to].count;
    if (edge >= 2 && (!best || edge > best.edge)) best = { ...o, edge };
  });
  return best;
}

export function aiStep(game) {
  switch (game.phase) {
    case 'idle': {
      const atk = pickAttack(game);
      if (atk && Math.random() < 0.7) { game.beginAttack(); return; }
      game.roll();
      return;
    }
    case 'attackSelect':
    case 'attackFollow': {
      const atk = pickAttack(game);
      if (atk) game.attackBattalion(atk.from, atk.to);
      else if (game.phase === 'attackFollow') game.endAttackTurn();
      else game.attackBattalion(game.attackOptions()[0].from, game.attackOptions()[0].to);
      return;
    }
    case 'attack': game.attackRound(); return;
    case 'pyrChoose': {
      const [a, b] = game.pyr.values;
      game.choosePyramid(bestPyramid(game, a).score >= bestPyramid(game, b).score ? a : b);
      return;
    }
    case 'pyramid': game.pyramidStep(bestPyramid(game, game.pyr.steps).first ?? game.pyramidOptions()[0]); return;
    case 'tripleKill': {
      const cells = Object.entries(game.cells).filter(([, c]) => c.owner !== game.current).sort((x, y) => y[1].count - x[1].count);
      game.removeEnemy(cells[0][0]);
      return;
    }
    case 'move': {
      const m = pickMove(game);
      if (m) game.move(m.from, m.to, m.idxs);
      return;
    }
    default:
  }
}
