import { CELL, BULLET_SPEED, BULLET_RANGE } from './constants.js';

/**
 * Toutes les règles du jeu, sous forme de fonctions pures qui modifient `game`
 * et émettent des évènements. Aucune dépendance au rendu.
 *
 * Évènements émis :
 *   playerMoved      { x, z }
 *   blocked          { x, y, z }
 *   yellowAttached   { x, y, z }            (position monde du nouveau cube)
 *   cubeDestroyed    { x, y, z, type, cause } type: 'yellow'|'purple'|'white'  cause: 'purple'|'bullet'|'detached'|'crush'
 *   cubeMoved        { from, to }           (cube jaune du joueur qui tombe : gravité)
 *   cellMoved        { from, to, type }     (case du monde qui tombe : gravité)
 *   bulletFired      { bullet }
 *   bulletRemoved    { bullet }
 *   bulletsChanged   { count }
 *   purpleMoved      { from, to }
 *   gameOver         { reason }
 * Émis par Game : gatePassed { gate, done, total }, levelComplete { level, next }, levelUp { from, to }, won { score }
 *   error            message
 */

// ---------------------------------------------------------------- Déplacement

export function tryMove(game, dx, dz) {
  const { player, world, events } = game;
  if (dx === 0 && dz === 0) return false;

  const cells = player.cells();
  const purpleHits = [];
  const yellowHits = [];

  for (const c of cells) {
    const tx = c.x + dx, tz = c.z + dz;
    if (player.occupies(tx, c.y, tz)) continue;   // case occupée par nous-mêmes : elle bouge aussi
    const t = world.get(tx, c.y, tz);
    if (t === CELL.WHITE) {
      events.emit('blocked', { x: tx, y: c.y, z: tz });
      events.emit('error', `Move blocked by a white wall at (${tx}, ${c.y}, ${tz}).`);
      return false;
    }
    if (t === CELL.PURPLE) purpleHits.push({ c, tx, tz });
    if (t === CELL.YELLOW) yellowHits.push({ c, tx, tz });
  }

  // Le rouge touche un violet : défaite.
  if (purpleHits.some((h) => h.c.index === -1)) {
    gameOver(game, 'The red pixel touched a purple pixel.');
    return false;
  }

  player.x += dx;
  player.z += dz;

  // Ramassage des jaunes : le cube ramassé se pose au-dessus du cube qui l'a touché.
  for (const h of yellowHits) {
    world.remove(h.tx, h.c.y, h.tz);
    const o = player.addOnTop(h.c.lx, h.c.lz, h.c.ly + 1);
    if (o) {
      game.score += 1;
      events.emit('yellowAttached', player.toWorld(o));
    }
  }

  // Jaunes qui percutent un violet : voir yellowHitsPurple.
  for (const h of purpleHits) {
    if (h.c.index === -1) continue;
    yellowHitsPurple(game, h.c.lx, h.c.ly, h.c.lz, h.tx, h.c.y, h.tz);
  }

  settle(game);
  events.emit('playerMoved', { x: player.x, z: player.z });
  return true;
}

/**
 * Règle de contact jaune / violet :
 *   - le cube jaune (offset local lx,ly,lz) est détruit ;
 *   - si un autre cube jaune était juste au-dessus de lui, il retombe d'un cran
 *     et ÉCRASE le violet (position monde px,py,pz) : violet détruit, +1 balle ;
 *   - sinon le violet reste et la colonne au-dessus, désormais posée sur lui, est
 *     détruite si elle n'est plus reliée au rouge (settle).
 */
export function yellowHitsPurple(game, lx, ly, lz, px, py, pz) {
  const { player, events } = game;
  const removed = player.removeLocal(lx, ly, lz);
  if (!removed) return false;
  events.emit('cubeDestroyed', { x: px, y: py, z: pz, type: CELL.YELLOW, cause: 'purple' });
  if (player.hasLocal(lx, ly + 1, lz)) {
    destroyWorldCell(game, px, py, pz, 'crush');   // la gravité (settle) fera descendre la colonne
    return true;
  }
  return false;
}

export function pruneDetached(game) {
  const removed = game.player.pruneDetached();
  for (const o of removed) {
    game.events.emit('cubeDestroyed', { ...game.player.toWorld(o), type: CELL.YELLOW, cause: 'detached' });
  }
  return removed.length;
}

/**
 * Stabilise le joueur après tout changement : gravité (aucun cube ne flotte : il
 * retombe jusqu'au sol ou sur un autre cube), puis suppression des cubes qui ne
 * sont plus reliés au rouge. On boucle car une chute peut en provoquer une autre.
 */
export function settle(game) {
  const { player, world, events } = game;
  for (let i = 0; i < 8; i++) {
    const moved = player.applyGravity((x, y, z) => !world.has(x, y, z));
    for (const m of moved) events.emit('cubeMoved', { from: player.toWorld(m.from), to: player.toWorld(m.to) });
    const pruned = pruneDetached(game);
    if (!moved.length && !pruned) break;
  }
}

/** Gravité du monde : les cases d'une colonne retombent quand on détruit celle du dessous. */
export function fallWorldColumn(game, x, z) {
  const { world, player, events } = game;
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 1; y < 32; y++) {
      const type = world.get(x, y, z);
      if (!type || world.has(x, y - 1, z) || player.occupies(x, y - 1, z)) continue;
      world.remove(x, y, z);
      world.set(x, y - 1, z, type);
      events.emit('cellMoved', { from: { x, y, z }, to: { x, y: y - 1, z }, type });
      changed = true;
    }
  }
}

/** Détruit une case du monde et applique les récompenses. */
export function destroyWorldCell(game, x, y, z, cause) {
  const type = game.world.remove(x, y, z);
  if (!type) return null;
  fallWorldColumn(game, x, z);
  if (type === CELL.PURPLE) {
    game.addBullets(1);
    game.score += 5;
    game.purplesDestroyed++;
  }
  game.events.emit('cubeDestroyed', { x, y, z, type, cause });
  return type;
}

// ---------------------------------------------------------------- moveyellow

export function applyMoveYellow(game, moves) {
  const { player, world, events } = game;
  if (!moves.length) return false;

  const next = player.offsets.map((o) => ({ ...o }));
  for (const { id, pos } of moves) {
    if (id >= next.length) {
      events.emit('error', `moveyellow: cube ${id} does not exist (CubesOffsets has ${next.length} cube(s)).`);
      return false;
    }
    next[id] = { ...pos };
  }

  const seen = new Set();
  for (const [i, o] of next.entries()) {
    const k = `${o.x},${o.y},${o.z}`;
    if (seen.has(k)) {
      events.emit('error', `moveyellow : deux cubes finiraient à la même position (${o.x}, ${o.y}, ${o.z}).`);
      return false;
    }
    seen.add(k);
    const w = player.toWorld(o);
    const t = world.get(w.x, w.y, w.z);
    if (t) {
      events.emit('error', `moveyellow : le cube ${i} ne peut pas aller en (${o.x}, ${o.y}, ${o.z}) : case occupée par un pixel ${t}.`);
      return false;
    }
  }

  player.setOffsets(next);
  settle(game);
  events.emit('playerReshaped', {});
  return true;
}

// ---------------------------------------------------------------- Tir

export function fire(game, dir) {
  const { player, events } = game;
  if (game.bullets <= 0) {
    events.emit('error', 'Impossible de tirer : BulletsCount = 0. Détruis un pixel violet pour gagner une balle.');
    return false;
  }
  game.addBullets(-1);
  const bullet = {
    id: ++game._bulletId,
    x: player.x, y: 0, z: player.z,
    dx: dir.x, dy: dir.y, dz: dir.z,
    traveled: 0,
  };
  game.projectiles.push(bullet);
  events.emit('bulletFired', { bullet });
  return true;
}

export function stepProjectiles(game) {
  const { player, world, events } = game;
  for (const b of [...game.projectiles]) {
    let alive = true;
    for (let s = 0; s < BULLET_SPEED && alive; s++) {
      b.x += b.dx; b.y += b.dy; b.z += b.dz;
      b.traveled++;
      if (player.occupies(b.x, b.y, b.z)) continue;        // traverse le corps du joueur
      if (b.y < 0 || b.traveled > BULLET_RANGE) { alive = false; break; }
      const hit = world.get(b.x, b.y, b.z);
      if (hit === CELL.WHITE) {
        events.emit('blocked', { x: b.x, y: b.y, z: b.z });     // les murs blancs sont incassables
        alive = false;
      } else if (hit) {
        destroyWorldCell(game, b.x, b.y, b.z, 'bullet');
        alive = false;
      }
    }
    if (!alive) {
      game.projectiles.splice(game.projectiles.indexOf(b), 1);
      events.emit('bulletRemoved', { bullet: b });
      settle(game);   // un cube du joueur reposait peut-être sur la case détruite
    }
  }
}

// ---------------------------------------------------------------- IA des violets

/** Les violets proches avancent d'une case vers le joueur (selon le niveau). */
export function stepEnemies(game) {
  const { level, player, world, events } = game;
  if (!level.purpleMoveEvery || game.tickCount % level.purpleMoveEvery !== 0) return;
  if (level.purpleMode === 'bounce') return stepBouncers(game);

  const purples = [...world.cellsNear(player.x, player.z, level.purpleRange ?? 12, CELL.PURPLE)];
  for (const p of purples) {
    if (world.get(p.x, p.y, p.z) !== CELL.PURPLE) continue;     // déjà détruit ce tick
    const ddx = Math.sign(player.x - p.x), ddz = Math.sign(player.z - p.z);
    const options = [];
    if (Math.abs(player.x - p.x) >= Math.abs(player.z - p.z)) { if (ddx) options.push([ddx, 0]); if (ddz) options.push([0, ddz]); }
    else { if (ddz) options.push([0, ddz]); if (ddx) options.push([ddx, 0]); }

    for (const [dx, dz] of options) {
      const tx = p.x + dx, tz = p.z + dz;
      if (player.occupies(tx, p.y, tz)) {
        purpleAttacks(game, p, tx, p.y, tz);
        break;
      }
      if (!world.has(tx, p.y, tz) && (p.y === 0 || world.has(tx, p.y - 1, tz))) {
        world.remove(p.x, p.y, p.z);
        world.set(tx, p.y, tz, CELL.PURPLE);
        events.emit('purpleMoved', { from: { x: p.x, y: p.y, z: p.z }, to: { x: tx, y: p.y, z: tz } });
        fallWorldColumn(game, p.x, p.z);
        break;
      }
    }
    if (game.state !== 'playing') return;
  }
  settle(game);
}

/**
 * Mode « rebond » : chaque violet avance d'une case sur l'axe X (vers la gauche au départ)
 * et fait demi-tour dès qu'une case occupée (mur, autre violet, joueur) lui barre la route.
 */
function stepBouncers(game) {
  const { world, player, events } = game;
  const k = (c) => `${c.x},${c.y},${c.z}`;
  for (const p of [...world.cellsOfType(CELL.PURPLE)]) {
    if (world.get(p.x, p.y, p.z) !== CELL.PURPLE) continue;
    if (game.level.onlyMarked && !game.purpleDirs.has(k(p))) continue;
    let dx = game.purpleDirs.get(k(p)) ?? -1;
    game.purpleDirs.delete(k(p));
    const blocked = (d) => world.has(p.x + d, p.y, p.z) || player.occupies(p.x + d, p.y, p.z)
      || game.gates.some((g) => g.x === p.x + d && g.z === p.z);
    if (blocked(dx)) dx = -dx;
    if (blocked(dx)) { game.purpleDirs.set(k(p), dx); continue; }
    world.remove(p.x, p.y, p.z);
    world.set(p.x + dx, p.y, p.z, CELL.PURPLE);
    game.purpleDirs.set(`${p.x + dx},${p.y},${p.z}`, dx);
    events.emit('purpleMoved', { from: { x: p.x, y: p.y, z: p.z }, to: { x: p.x + dx, y: p.y, z: p.z } });
  }
}

function purpleAttacks(game, p, tx, ty, tz) {
  const { player, world, events } = game;
  const l = player.toLocal(tx, ty, tz);
  if (l.x === 0 && l.y === 0 && l.z === 0) {
    gameOver(game, 'A purple pixel reached the red pixel.');
    return;
  }
  // Le violet avance dans la case du jaune, puis la règle de contact s'applique.
  world.remove(p.x, p.y, p.z);
  world.set(tx, ty, tz, CELL.PURPLE);
  events.emit('purpleMoved', { from: { x: p.x, y: p.y, z: p.z }, to: { x: tx, y: ty, z: tz } });
  fallWorldColumn(game, p.x, p.z);
  yellowHitsPurple(game, l.x, l.y, l.z, tx, ty, tz);
  settle(game);
}

// ---------------------------------------------------------------- Fin

export function gameOver(game, reason) {
  if (game.state === 'gameover') return;
  game.state = 'gameover';
  game.player.alive = false;
  game.events.emit('gameOver', { reason, score: game.score, level: game.level.n });
}
