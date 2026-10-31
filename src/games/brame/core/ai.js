// Ordinateur de BRAME : `aiStep(game)` exécute UNE action selon la phase en cours (le rendu gère le rythme).
import { BASE, EXIT, NEIGHBORS, NODES, RESERVE, distancesToGoal, forwardNeighbors, isGoal, rowOf, startCells, startRow } from './board.js';

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
 * Choix d'un déplacement, par priorité :
 * 1. bloquer son camp : occuper les postes des 3-4 dernières rangées (croix, cercles et rangée de départ),
 *    sans jamais dégarnir un poste ;
 * 2. sauver un pion, mais jamais en abandonnant un poste de blocage ;
 * 3. éviter les armées (empilements sans intérêt) : préférer les cases vides et faire entrer le camp ;
 * 4. envoyer vers le camp adverse les pions qui ne servent pas au blocage, hors de portée des pyramides.
 */
function pickMove(game) {
  const me = game.current;
  const dist = distCache[me];
  const enemyReach = pyramidReach(game, 1 - me);
  const ownReach = pyramidReach(game, me);
  // Postes de blocage : les 4 dernières rangées de SON camp (jamais celles du camp adverse).
  const posts = NODES.filter((id) => Math.abs(startRow(me) - rowOf(id)) <= 3);
  const enemyActive = game.pionsLeft(1 - me) > 0;
  const exposure = (id, reach) => (id !== EXIT && id !== RESERVE && reach.has(id) ? 1 : 0);
  // Il suffit de tenir `NEEDED` postes pour verrouiller le camp ; au-delà, les pions partent au contact.
  const NEEDED = 6;
  const guarded = (extraOut, extraIn) => posts.filter((id) => (game.cells[id]?.owner === me && (id !== extraOut || game.cells[id].count > 1)) || id === extraIn).length;
  const coverBefore = Math.min(NEEDED, guarded(null, null));
  const contact = (id) => id !== EXIT && [...NEIGHBORS[id]].some((n) => game.cells[n]?.owner === 1 - me);
  const combos = subsets(game.freeDice()).filter((s) => game.moveLimit > 1 || s.length === 1);
  const d = (id) => (id === EXIT ? 0 : id === RESERVE ? Math.min(...startCells(me).map((s) => dist[s])) + 1 : dist[id]);
  let best = null;
  game.sources().forEach((from) => combos.forEach((idxs) => {
    const n = idxs.reduce((t, i) => t + game.dice[i].v, 0);
    game.destinations(from, n).forEach((to) => {
      const guardDelta = enemyActive ? Math.min(NEEDED, guarded(from, to)) - coverBefore : 0;
      let score = Math.random() * 0.5;
      score += guardDelta * 120;
      // Les dés ne se combinent que pour sauver un pion ; sinon chaque dé doit jouer un pion différent.
      if (idxs.length > 1) score += to === EXIT ? 15 : -60;
      if (to === from) score -= 50;
      let why = 'avance';
      if (to === EXIT) score += guardDelta < 0 ? 30 : 80;
      else {
        score += (d(from) - d(to)) * 4;
        if (contact(to)) score += 8;
        score -= game.cells[to] ? (posts.includes(to) ? 4 : 14) : 0;
        score += from === RESERVE ? 6 : 0;
        score -= (exposure(to, enemyReach) - exposure(from, enemyReach)) * 20;
        score -= (exposure(to, ownReach) - exposure(from, ownReach)) * 10;
      }
      if (to === EXIT) why = 'sauve un pion';
      else if (to === from) why = 'ne bouge pas';
      else if (guardDelta > 0) why = 'renforce le blocage de son camp';
      else if (from === RESERVE) why = 'fait entrer un renfort';
      else if (contact(to)) why = 'va au contact de tes pions';
      else if (posts.includes(from) && !posts.includes(to)) why = 'envoie un pion vers ton camp';
      else if (exposure(from, enemyReach) && !exposure(to, enemyReach)) why = 'sort un pion de la portée de ta pyramide';
      else if (game.cells[to] && !posts.includes(to)) why = 'regroupe ses pions';
      if (!best || score > best.score) best = { score, from, to, idxs, why };
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
      if (!m) { game.emit('log', 'Ordinateur : aucun coup possible, il passe son tour.'); game.endTurn(); return; }
      game.emit('log', `Ordinateur : ${m.why} (dé ${m.idxs.map((i) => game.dice[i].v).join('+')}).`);
      if (!game.move(m.from, m.to, m.idxs)) { game.emit('log', 'Ordinateur : coup refusé, tour passé.'); game.endTurn(); }
      return;
    }
    default:
  }
}
