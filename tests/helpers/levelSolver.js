import { GAME } from '../../src/games/bomberhero/config.js';
let RANGE = GAME.player.range; const MAX_ESCAPE = 6;
const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Un héros seul (sans gardiens, bonus ignorés) peut-il rejoindre la porte ? Recherche sur les ensembles de blocs détruits. */
export function solve(L, range = GAME.player.range) {
  RANGE = range;
  const { width: W, height: H } = L;
  const idx = (x, y) => y * W + x;
  const start = L.heroes[0], door = idx(L.door.x, L.door.y);
  const initial = L.cells.map((c) => (c === 'wall' ? 'w' : c === 'floor' ? '.' : 'b'));
  const key = (c) => c.join('');
  const free = (c, x, y) => x >= 0 && y >= 0 && x < W && y < H && c[idx(x, y)] === '.';
  const region = (c) => {
    const seen = new Set([idx(start.x, start.y)]), st = [[start.x, start.y]];
    while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of D) { const nx = x + dx, ny = y + dy; if (free(c, nx, ny) && !seen.has(idx(nx, ny))) { seen.add(idx(nx, ny)); st.push([nx, ny]); } } }
    return seen;
  };
  const blast = (c, x, y) => {
    const cells = new Set([idx(x, y)]), hit = [];
    for (const [dx, dy] of D) for (let i = 1; i <= RANGE; i++) { const nx = x + dx * i, ny = y + dy * i; if (nx < 0 || ny < 0 || nx >= W || ny >= H || c[idx(nx, ny)] === 'w') break; cells.add(idx(nx, ny)); if (c[idx(nx, ny)] === 'b') { hit.push(idx(nx, ny)); break; } }
    return { cells, hit };
  };
  const escape = (c, reg, x, y, cells) => {
    let layer = [[x, y]]; const seen = new Set([idx(x, y)]);
    for (let step = 1; step <= MAX_ESCAPE; step++) {
      const next = [];
      for (const [cx, cy] of layer) for (const [dx, dy] of D) { const nx = cx + dx, ny = cy + dy, k = idx(nx, ny); if (!free(c, nx, ny) || seen.has(k)) continue; seen.add(k); if (!cells.has(k)) return true; next.push([nx, ny]); }
      layer = next;
    }
    return false;
  };
  const dist = (c) => { // distance heuristique à la porte (blocs = coût 3)
    const d = new Map([[door, 0]]); const q = [door];
    while (q.length) { const k = q.shift(); const x = k % W, y = (k / W) | 0; for (const [dx, dy] of D) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || c[idx(nx, ny)] === 'w') continue; const nk = idx(nx, ny); const cost = d.get(k) + (c[nk] === 'b' ? 3 : 1); if (!d.has(nk) || d.get(nk) > cost) { d.set(nk, cost); q.push(nk); } } }
    return d;
  };
  const open = [{ c: initial, steps: 0, plan: [] }]; const seen = new Set([key(initial)]);
  let expanded = 0;
  while (open.length && expanded < 40000) {
    open.sort((a, b) => a.h - b.h || 0);
    const cur = open.shift(); expanded++;
    const reg = region(cur.c);
    if (reg.has(door)) return { ok: true, bombs: cur.steps, plan: cur.plan };
    for (const k of reg) {
      const x = k % W, y = (k / W) | 0;
      const { cells, hit } = blast(cur.c, x, y);
      if (!hit.length || !escape(cur.c, reg, x, y, cells)) continue;
      const c = [...cur.c]; hit.forEach((b) => { c[b] = '.'; });
      const nk = key(c); if (seen.has(nk)) continue; seen.add(nk);
      const d = dist(c); let h = Infinity; for (const r of region(c)) h = Math.min(h, d.get(r) ?? Infinity);
      open.push({ c, steps: cur.steps + 1, plan: [...cur.plan, [x, y]], h: h + (cur.steps + 1) * 0.1 });
    }
  }
  return { ok: false, expanded };
}

