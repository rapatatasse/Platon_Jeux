// Ordinateur de BRAME : `aiStep(game)` exécute UNE action selon la phase en cours (le rendu gère le rythme).
import { BASE, EXIT, NEIGHBORS, NODES, RESERVE, distancesToGoal, forwardNeighbors, isGoal, rowOf, startCells, startRow } from './board.js';

const distCache = [distancesToGoal(0), distancesToGoal(1)];
const subsets = (list) => list.reduce((acc, x) => acc.concat(acc.map((s) => [...s, x])), [[]]).filter((s) => s.length);

/**
 * Éliminer les derniers pions adverses termine la partie : à éviter tant que ce n'est pas une victoire aux points
 * (on garde alors le dernier pion adverse en vie, bloqué, et on sauve nos pions).
 */
function endsBadly(game, me, killed) {
  return killed >= game.pionsLeft(1 - me) && game.saved[me] <= game.saved[1 - me];
}

/** Meilleur chemin de pyramide : score = pions adverses écrasés - pions alliés écrasés. */
function bestPyramid(game, steps) {
  const me = game.current;
  let best = { score: -Infinity, first: null };
  const walk = (pos, left, score, first, killed = 0) => {
    if (left === 0) {
      const final = score - (endsBadly(game, me, killed) ? 500 : 0);
      if (final > best.score) best = { score: final, first };
      return;
    }
    forwardNeighbors(pos, me).forEach((n) => {
      const c = game.cells[n];
      const gain = c ? (c.owner === me ? -c.count : c.count) : 0;
      const bounce = game.pyramids[1 - me] === n ? 2 : 0;
      const kills = killed + (c && c.owner !== me ? c.count : 0);
      if (isGoal(n, me)) {
        const final = score + gain + bounce - (endsBadly(game, me, kills) ? 500 : 0);
        if (final > best.score) best = { score: final, first: first ?? n };
        return;
      }
      walk(n, left - 1, score + gain + bounce, first ?? n, kills);
    });
  };
  walk(game.pyramids[me] ?? BASE, steps, 0, null);
  return best;
}

/**
 * Fuites : nombre de cases de départ de `me` (arrivée de l'adversaire) qu'un pion adverse peut encore atteindre
 * sans passer par une case tenue par `me` ou une pyramide. 0 = camp totalement verrouillé.
 * `cells` = plateau (réel ou hypothétique).
 */
export function leakCount(game, me, cells = game.cells) {
  const enemy = 1 - me;
  const seen = new Set();
  const queue = [];
  const push = (id) => {
    if (seen.has(id) || cells[id]?.owner === me || game.pyramids.includes(id)) return;
    seen.add(id);
    queue.push(id);
  };
  Object.keys(cells).forEach((id) => { if (cells[id].owner === enemy) push(id); });
  if (game.reserve[enemy] > 0) startCells(enemy).forEach(push);
  while (queue.length) NEIGHBORS[queue.shift()].forEach(push);
  return [...seen].filter((id) => isGoal(id, enemy)).length;
}

/** Plateau après le déplacement d'un pion de `me` de `from` vers `to`. */
function applyMove(cells, from, to, me) {
  const c = { ...cells };
  if (from !== RESERVE) {
    if (c[from].count > 1) c[from] = { owner: me, count: c[from].count - 1 };
    else delete c[from];
  }
  if (to !== EXIT) c[to] = { owner: me, count: (c[to]?.count ?? 0) + 1 };
  return c;
}

/** Distance (en cases) de chaque nœud à la case libre la plus proche qui ferait baisser les fuites. */
function distancesToCuts(game, me, leak) {
  const cuts = NODES.filter((id) => !game.cells[id] && !game.pyramids.includes(id) && leakCount(game, me, { ...game.cells, [id]: { owner: me, count: 1 } }) < leak);
  if (!cuts.length) return null;
  const dist = Object.fromEntries(NODES.map((n) => [n, Infinity]));
  cuts.forEach((n) => { dist[n] = 0; });
  const queue = [...cuts];
  while (queue.length) {
    const n = queue.shift();
    NEIGHBORS[n].forEach((m) => { if (dist[m] === Infinity) { dist[m] = dist[n] + 1; queue.push(m); } });
  }
  return dist;
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
 * 1. verrouiller son camp : un pion adverse ne doit plus pouvoir rejoindre l'arrivée par aucun passage libre
 *    (on calcule les « fuites » réelles du plateau, couloirs et diagonales compris), sans jamais rouvrir une fuite ;
 *    tant qu'un passage reste ouvert, on va occuper la case qui le ferme ;
 * 2. sauver un pion, mais jamais en abandonnant un poste de blocage ;
 * 3. éviter les armées (empilements sans intérêt) : préférer les cases vides et faire entrer le camp ;
 * 4. un pion adverse proche de l'arrivée est intercepté en priorité ;
 * 5. une fois le camp verrouillé, tous les autres pions montent au plus près du camp adverse, au contact, et attaquent
 *    dès qu'ils ont l'avantage numérique (≥ 1 pion de plus) pour tenter de passer.
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
  const NEEDED = 4;
  const guarded = (extraOut, extraIn) => posts.filter((id) => (game.cells[id]?.owner === me && (id !== extraOut || game.cells[id].count > 1)) || id === extraIn).length;
  const coverBefore = Math.min(NEEDED, guarded(null, null));
  // Fuites actuelles (passages que l'adversaire peut encore emprunter) et cases qui les ferment.
  const leakBefore = enemyActive ? leakCount(game, me) : 0;
  const cutDist = leakBefore > 0 ? distancesToCuts(game, me, leakBefore) : null;
  const cd = (id) => (cutDist ? (id === EXIT ? 40 : id === RESERVE ? Math.min(...startCells(me).map((c) => cutDist[c])) + 1 : cutDist[id]) : 0);
  // Pions adverses déjà proches de leur arrivée (dans mon camp) : à intercepter.
  const threats = Object.keys(game.cells).filter((id) => game.cells[id].owner === 1 - me && distCache[1 - me][id] <= 2);
  // Camp verrouillé : tout le reste monte au plus près du camp adverse et cherche le contact.
  const locked = leakBefore === 0 || !enemyActive;
  // Camp verrouillé et adversaire encore là : priorité absolue à sauver le maximum de pions.
  const rush = locked && enemyActive;
  const contact = (id) => id !== EXIT && [...NEIGHBORS[id]].some((n) => game.cells[n]?.owner === 1 - me);
  const combos = subsets(game.freeDice()).filter((s) => game.moveLimit > 1 || s.length === 1);
  const d = (id) => (id === EXIT ? 0 : id === RESERVE ? Math.min(...startCells(me).map((s) => dist[s])) + 1 : dist[id]);
  let best = null;
  game.sources().forEach((from) => combos.forEach((idxs) => {
    const n = idxs.reduce((t, i) => t + game.dice[i].v, 0);
    game.destinations(from, n).forEach((to) => {
      const guardDelta = enemyActive ? Math.min(NEEDED, guarded(from, to)) - coverBefore : 0;
      const sealDelta = enemyActive && (leakBefore > 0 || from !== to) ? leakBefore - leakCount(game, me, applyMove(game.cells, from, to, me)) : 0;
      let score = Math.random() * 0.5;
      score += sealDelta * 150 + guardDelta * 30;
      if (cutDist && to !== from) score += (cd(from) - cd(to)) * 10;
      const intercept = to !== EXIT && threats.some((t) => NEIGHBORS[t].has(to));
      if (intercept) score += 30;
      // Les dés ne se combinent que pour sauver un pion ; sinon chaque dé doit jouer un pion différent.
      if (idxs.length > 1) score += to === EXIT ? 15 : -60;
      if (to === from) score -= 50;
      let why = 'avance';
      if (to === EXIT) score += sealDelta < 0 ? 30 : rush ? 300 : 80;
      else {
        score += (d(from) - d(to)) * (rush ? 22 : locked ? 9 : 4);
        if (contact(to)) score += locked ? 16 : 8;
        score -= game.cells[to] ? (posts.includes(to) ? 4 : 14) : 0;
        score += from === RESERVE ? 6 : 0;
        score -= (exposure(to, enemyReach) - exposure(from, enemyReach)) * (rush ? 6 : locked ? 9 : 20);
        score -= (exposure(to, ownReach) - exposure(from, ownReach)) * 10;
      }
      if (to === EXIT) why = 'sauve un pion';
      else if (to === from) why = 'ne bouge pas';
      else if (rush && d(to) < d(from)) why = 'file vers la sortie pour sauver des pions';
      else if (sealDelta > 0) why = 'ferme un passage de son camp';
      else if (sealDelta < 0) why = 'avance en rouvrant un passage';
      else if (intercept) why = 'intercepte un pion adverse proche de son camp';
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
    const urgent = distCache[1 - game.current][o.to] <= 2;   // pion adverse prêt à passer : on attaque même à égalité
    if (!endsBadly(game, game.current, 1) && edge >= (urgent ? 0 : 1) && (!best || edge > best.edge)) best = { ...o, edge };
  });
  return best;
}

export function aiStep(game) {
  switch (game.phase) {
    case 'idle': {
      const atk = pickAttack(game);
      if (atk && Math.random() < 0.9) { game.beginAttack(); return; }
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
