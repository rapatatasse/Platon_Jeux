import { scanRange } from '../core/scan.js';
import { CELL } from '../core/constants.js';

/**
 * Ce que le joueur peut utiliser dans le terminal et dans ses fonctions.
 * Les variables BulletsCount / CubesOffsets sont des "getters" : toujours à jour.
 *
 * `log(kind, text)` est fourni par l'UI pour afficher les messages.
 */
export const MAX_LOOP_STEPS = 1000;
export const TIRED_MESSAGE = "Trop d'instructions : ton pixel est fatigué, il est rentré dans une boucle sans fin.";

/**
 * Ajoute un garde-fou dans chaque `while (...)` / `for (;;)` : la condition appelle `__guard()`.
 * Les `for...of` / `for...in` sont finis, on n'y touche pas.
 */
export function instrumentLoops(code) {
  let out = '';
  let i = 0;
  const re = /\b(while|for)\s*\(/g;
  let m;
  while ((m = re.exec(code))) {
    const open = m.index + m[0].length;
    let depth = 1, j = open;
    const semis = [];
    for (; j < code.length && depth > 0; j++) {
      const c = code[j];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth--;
      else if (c === ';' && depth === 1) semis.push(j);
    }
    if (depth !== 0) break;
    const close = j - 1;
    const guard = (cond) => `(__guard(), ${cond.trim() || 'true'})`;
    let inner;
    if (m[1] === 'while') inner = guard(code.slice(open, close));
    else if (semis.length === 2) inner = `${code.slice(open, semis[0])};${guard(code.slice(semis[0] + 1, semis[1]))};${code.slice(semis[1] + 1, close)}`;
    else continue;
    out += code.slice(i, open) + inner;
    i = close;
    re.lastIndex = close;
  }
  return out + code.slice(i);
}

export function createTerminalApi(game, log) {
  const userFns = {};

  // Garde-fou : au-delà de MAX_LOOP_STEPS tours de boucle sans rendre la main au navigateur, on stoppe le script.
  let loopSteps = 0;
  const guard = () => {
    if (++loopSteps === 1) setTimeout(() => { loopSteps = 0; });
    if (loopSteps > MAX_LOOP_STEPS) {
      loopSteps = 0;
      game.clearQueue();
      throw new Error(TIRED_MESSAGE);
    }
  };

  // Si la file est pleine, on LÈVE une erreur : cela casse la boucle du joueur
  // (sinon un `while (true) move(...)` gèlerait le navigateur).
  const enqueue = (cmd) => {
    if (game.isQueueFull()) {
      throw new Error(`file pleine (${game.queue.length} commandes). ${TIRED_MESSAGE}`);
    }
    // La commande renvoie une promesse résolue quand elle est EXÉCUTÉE (1 par tick) :
    // `await move(...)` permet de relire Scanner... après le mouvement.
    return new Promise((resolve) => {
      if (!game.enqueue(cmd, { onDone: resolve })) resolve(false);
    });
  };

  const planned = () => {
    const p = { x: game.player.x, z: game.player.z };
    const visited = new Set();
    const cells = game.player.cells();
    for (const c of game.queue) {
      const dx = c.dx ?? 0, dz = c.dz ?? 0;
      if (!dx && !dz) continue;
      // Un pas contre un mur blanc n'est pas joué : la position prévue ne change pas.
      const blocked = cells.some((q) => {
        if (game.player.hasLocal(q.lx + dx, q.ly, q.lz + dz)) return false;
        return game.world.get(p.x + q.lx + dx, q.ly, p.z + q.lz + dz) === CELL.WHITE;
      });
      if (blocked) continue;
      p.x += dx;
      p.z += dz;
      visited.add(`${p.x},${p.z}`);
    }
    return { p, visited };
  };

  const api = {
    // ---- variables (lecture seule)
    get BulletsCount() { return game.bullets; },
    get CubesOffsets() { return game.cubesOffsets; },
    get Level() { return game.level.n; },
    get Goal() { return { ...game.level.goal, progress: game.goalProgress }; },
    // Gates est relative à la position PRÉVUE (après les déplacements déjà en file) :
    // la relire juste après move() est à jour.
    get Gates() {
      const { p, visited } = planned();
      return game.gates.map((g) => ({ x: g.x - p.x, z: g.z - p.z, passed: g.passed || visited.has(`${g.x},${g.z}`) }));
    },
    get State() { return game.snapshot(); },
    get Scanner() { return game.scanner; },
    get ScannerRange() { return scanRange(game.player); },

    // ---- actions (mises en file, exécutées 1 par tick) : le déplacement se fait uniquement avec move(x, z)
    move(x, z) { return enqueue([x, z]); },
    fire(x, y, z) { return enqueue([0, 0, [x, y, z]]); },
    moveYellow(...pairs) { return enqueue([0, 0, null, pairs]); },
    wait(n = 1) {
      let last;
      for (let i = 0; i < n; i++) last = enqueue([0, 0]);
      return last;
    },
    stop() {
      const n = game.queue.length;
      game.clearQueue();
      log('info', n ? `STOP : ${n} commande(s) en attente annulée(s).` : 'STOP : rien en attente.');
      return true;
    },

    // ---- affichage : console.log(...) écrit dans le terminal (et dans la vraie console du navigateur)
    console: {
      log: (...args) => { log('result', args.map(format).join(' ')); globalThis.console.log(...args); },
      error: (...args) => { log('error', args.map(format).join(' ')); globalThis.console.error(...args); },
      warn: (...args) => { log('error', args.map(format).join(' ')); globalThis.console.warn(...args); },
    },
    print(...args) { api.console.log(...args); return undefined; },

    // ---- aide
    clear() { log('clear'); return undefined; },
    reset() { game.resetLevel(); return undefined; },
    help() { help(log); return undefined; },
    test() { runTest(game, api, log); return undefined; },
    functions() {
      const names = Object.keys(userFns);
      log('info', names.length ? `Fonctions enregistrées : ${names.join(', ')}` : 'Aucune fonction enregistrée.');
      return undefined;
    },

    userFns,
    __guard: guard,
  };

  // Proxy : les fonctions enregistrées par le joueur sont accessibles directement par leur nom.
  return new Proxy(api, {
    has: (t, p) => p in t || p in userFns,
    get: (t, p) => (p in t ? t[p] : userFns[p]),
    set: (t, p, v) => { userFns[p] = v; return true; },
  });
}

/** Affichage lisible d'une valeur (objets/tableaux en JSON, sur une ligne). */
export function format(v) {
  if (typeof v === 'string') return v;
  if (typeof v === 'function') return `[fonction ${v.name || 'anonyme'}]`;
  try { return JSON.stringify(v) ?? String(v); } catch { return String(v); }
}

/**
 * Évalue une ligne du terminal avec l'API en portée (mode non strict pour `with`).
 * Si le résultat est un tableau, il est interprété comme une commande.
 */
export function evaluate(api, code) {
  // eslint-disable-next-line no-new-func
  const fn = new Function('__api', '__code', 'with (__api) { return eval(__code); }');
  return fn(api, instrumentLoops(code));
}

/**
 * Compile une fonction utilisateur écrite sous la forme `function nom(args) { ... }`.
 * Retourne { name, fn } ou lève une erreur explicite.
 */
export function compileUserFunction(api, code) {
  const m = code.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
  if (!m) throw new Error('Le code doit commencer par "function nomDeLaFonction(...) { ... }".');
  const name = m[1];
  // eslint-disable-next-line no-new-func
  const factory = new Function('__api', `with (__api) { ${instrumentLoops(code)}\n; return ${name}; }`);
  const fn = factory(api);
  if (typeof fn !== 'function') throw new Error(`"${name}" n'est pas une fonction.`);
  api.userFns[name] = fn;
  return { name, fn };
}

function help(log) {
  [
    'AXES       ->  X = gauche(-1)/droite(+1)   Y = HAUTEUR (0 = sol)   Z = haut(-1)/bas(+1) de l\'écran',
    'COMMANDES  ->  (1 commande = 1 pas du monde, toujours avec des parenthèses)',
    '  move(x, z)                    : -1, 0 ou 1. Déplacement sur le plateau (pas de Y : on ne monte pas). Ex : move(1, 0)',
    '  fire(x, y, z)                 : tire dans la direction [x, y, z]. Ex : fire(1, 0, 0) tire à droite',
    '  moveYellow(id, [x, y, z], ...) : nouvel offset des cubes jaunes. Ex : moveYellow(0, [0, 1, 0]) place le cube 0 au-dessus du rouge',
    '  wait(n)                       : ne rien faire pendant n pas',
    'STOP       ->  stop() ou le bouton STOP : annule toutes les commandes en attente (boucle trop longue...).',
    'VARIABLES  ->  BulletsCount   CubesOffsets   Level   Goal   Gates (portes, relatives à toi)   State',
    '               Scanner (violets/jaunes/murs proches, relatifs à toi)   ScannerRange (portée : 1 + jaunes empilés sur le rouge)',
    '               Scanner -> [{ type: "violet", coordinates: [[dx, dz], ...] }, { type: "jaune", coordinates: [...] }, { type: "mur", coordinates: [...] }]',
    'ATTENDRE    ->  dans une fonction async : await move(1, 0) attend que le pas soit fait, puis relis Scanner.',
    'AIDE+       ->  le bouton "Aide" ouvre la page complète (commandes, scanner, bases de JavaScript).',
    'AFFICHER   ->  tape juste le nom :  CubesOffsets          -> affiche sa valeur',
    '               console.log(CubesOffsets)                  -> pareil, marche aussi dans tes fonctions',
    '               console.log("balles :", BulletsCount)      -> plusieurs valeurs',
    '               console.log(CubesOffsets[0].y)             -> la hauteur du 1er cube',
    '               console.log(CubesOffsets.length)           -> combien de cubes jaunes',
    '               for (const c of CubesOffsets) console.log(c.x, c.y, c.z)   -> un par ligne',
    'AUTRES     ->  help()  test()  clear()  reset() (recommence le niveau)  functions()',
    'RÈGLES     ->  jaune touché = ajouté au-dessus | violet touché par le rouge = perdu',
    '               violet = détruit par une balle, ou écrasé par un cube jaune qui lui tombe dessus (+1 balle)',
    '               cube jaune non relié au rouge = détruit | un cube ne flotte jamais : il retombe',
    '               blanc = mur incassable (même à la balle) | objectif atteint = niveau suivant',
    'SYNTAXE    ->  les valeurs se séparent par des VIRGULES : move(1, 0)  et non move(1;0)',
    'ASTUCE     ->  Écris des fonctions dans le panneau "Mes fonctions", puis appelle-les ici.',
  ].forEach((l) => log('help', l));
}

/** Exemples du cahier des charges, joués au démarrage sur demande. */
function runTest(game, api, log) {
  log('info', '--- test() : démonstration des commandes ---');
  log('info', 'Axes : X = gauche/droite, Y = HAUTEUR (0 = sol), Z = haut/bas de l\'écran.');
  const exampleOffsets = [
    { x: 0, y: 1, z: 0 },   // Juste au-dessus du rouge (empilé)
    { x: 0, y: 2, z: 0 },   // Deux crans au-dessus
    { x: 0, y: 0, z: 1 },   // Devant le rouge, au sol (vers le bas de l'écran)
    { x: -1, y: 0, z: 0 },  // À gauche du rouge, au sol
  ];
  log('info', `Exemple d'offsets : ${JSON.stringify(exampleOffsets)}`);
  log('info', '{ x: 0, y: -1, z: 0 } serait INTERDIT : y < 0 = sous le sol.');
  log('info', `BulletsCount = ${api.BulletsCount}   CubesOffsets = ${JSON.stringify(api.CubesOffsets)}`);
  log('info', 'Boucle : for (let i = 0; i < 3; i++) move(1, 0)   -> 3 pas à droite');
  for (let i = 0; i < 3; i++) api.move(1, 0);
  log('info', 'Puis move(0, 1) x2 (vers le bas), move(-1, 0) x3, move(0, -1) x2 (vers le haut) : un rectangle.');
  for (let i = 0; i < 2; i++) api.move(0, 1);
  for (let i = 0; i < 3; i++) api.move(-1, 0);
  for (let i = 0; i < 2; i++) api.move(0, -1);
  log('info', 'Tir vers la droite : fire(1, 0, 0)');
  api.fire(1, 0, 0);
  log('info', 'Erreur volontaire : move(2, 0)');
  api.move(2, 0);
  log('info', 'Erreur volontaire (y < 0) : moveYellow(0, [0, -1, 0])');
  api.moveYellow(0, [0, -1, 0]);
  log('info', `--- fin de test() : ${game.queue.length} commandes en file ---`);
}
