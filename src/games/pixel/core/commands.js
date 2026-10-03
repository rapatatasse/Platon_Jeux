/**
 * Analyse et valide une commande du terminal :
 *   [x, z, fire, moveyellow]
 *   - x, z        : -1, 0 ou 1 (déplacement sur le plateau ; Y est la hauteur, on ne s'y déplace pas)
 *   - fire        : [x, y, z] direction de tir (chaque valeur -1, 0 ou 1) ou null
 *   - moveyellow  : [id, [x, y, z], id, [x, y, z], ...]  ou  [[id, [x,y,z]], ...]  ou null
 *
 * Retourne { ok: true, cmd } ou { ok: false, error }.
 * cmd = { dx, dz, fire: {x,y,z}|null, moves: [{ id, pos: {x,y,z} }] }
 */
export function parseCommand(raw) {
  if (!Array.isArray(raw)) {
    return fail(`Une commande doit être un tableau [x, z, fire, moveyellow], reçu : ${describe(raw)}`);
  }
  if (raw.length > 4) return fail(`Trop d'éléments dans la commande (${raw.length}, maximum 4).`);

  const [x = 0, z = 0, fireRaw = null, moveRaw = null] = raw;

  if (!isStep(x)) return fail(`x doit valoir -1, 0 ou 1 (reçu ${describe(x)}).`);
  if (!isStep(z)) return fail(`z doit valoir -1, 0 ou 1 (reçu ${describe(z)}).`);

  let fire = null;
  if (fireRaw !== null && fireRaw !== undefined && fireRaw !== false) {
    if (!Array.isArray(fireRaw) || fireRaw.length !== 3) {
      return fail(`fire doit être [x, y, z] (reçu ${describe(fireRaw)}).`);
    }
    if (!fireRaw.every(isStep)) return fail(`fire : chaque direction doit valoir -1, 0 ou 1 (reçu ${describe(fireRaw)}).`);
    if (fireRaw.every((v) => v === 0)) return fail('fire : la direction [0, 0, 0] ne tire nulle part.');
    fire = { x: fireRaw[0], y: fireRaw[1], z: fireRaw[2] };
  }

  const moves = [];
  if (moveRaw !== null && moveRaw !== undefined && moveRaw !== false) {
    if (!Array.isArray(moveRaw)) return fail(`moveyellow doit être un tableau [id, [x, y, z], ...] (reçu ${describe(moveRaw)}).`);
    const pairs = normalizeMovePairs(moveRaw);
    if (!pairs) return fail(`moveyellow : format attendu [id, [x, y, z], id, [x, y, z], ...] (reçu ${describe(moveRaw)}).`);
    for (const [id, pos] of pairs) {
      if (!Number.isInteger(id) || id < 0) return fail(`moveyellow : id doit être un entier >= 0 (reçu ${describe(id)}).`);
      if (!Array.isArray(pos) || pos.length !== 3 || !pos.every(Number.isInteger)) {
        return fail(`moveyellow : la position du cube ${id} doit être [x, y, z] entiers (reçu ${describe(pos)}).`);
      }
      if (pos[1] < 0) return fail(`moveyellow : le cube ${id} ne peut pas passer sous le sol (y = ${pos[1]}).`);
      if (pos[0] === 0 && pos[1] === 0 && pos[2] === 0) return fail(`moveyellow : le cube ${id} ne peut pas prendre la place du pixel rouge (0, 0, 0).`);
      moves.push({ id, pos: { x: pos[0], y: pos[1], z: pos[2] } });
    }
  }

  return { ok: true, cmd: { dx: x, dz: z, fire, moves } };
}

function normalizeMovePairs(list) {
  if (list.length === 0) return [];
  // Forme imbriquée : [[id, [x,y,z]], ...]
  if (list.every((p) => Array.isArray(p) && p.length === 2 && !Array.isArray(p[0]))) return list;
  // Forme plate : [id, [x,y,z], id, [x,y,z]]
  if (list.length % 2 !== 0) return null;
  const pairs = [];
  for (let i = 0; i < list.length; i += 2) pairs.push([list[i], list[i + 1]]);
  return pairs;
}

const isStep = (v) => v === -1 || v === 0 || v === 1;
const fail = (error) => ({ ok: false, error });

export function describe(v) {
  try {
    return typeof v === 'string' ? `"${v}"` : JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}
