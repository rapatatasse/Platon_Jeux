const HEIGHT = 220;

const load = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(`Image introuvable : ${src}`));
  img.src = src;
});

/** Fond clair non transparent (damier, aplat) : gris/blanc peu saturé. */
const isBackdrop = (d, i) => {
  const r = d[i], g = d[i + 1], b = d[i + 2];
  return Math.max(r, g, b) - Math.min(r, g, b) < 26 && Math.min(r, g, b) > 150;
};

/**
 * Prépare une image de héros : réduit à HEIGHT px, retire un éventuel fond opaque (damier, en partant des bords),
 * supprime les taches isolées (on ne garde que la plus grande forme) puis recadre le personnage.
 */
export function cutOut(img) {
  const w = Math.round(img.width * (HEIGHT / img.height)), h = HEIGHT;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  const bg = new Uint8Array(w * h);
  const hasAlpha = (() => { for (let i = 3; i < d.length; i += 4) if (d[i] < 200) return true; return false; })();

  if (hasAlpha) {
    for (let p = 0; p < w * h; p++) if (d[p * 4 + 3] < 40) bg[p] = 1;
  } else {
    const stack = [];
    const push = (x, y) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const p = y * w + x;
      if (bg[p] || !isBackdrop(d, p * 4)) return;
      bg[p] = 1; stack.push(p);
    };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) {
      const p = stack.pop(), x = p % w, y = (p / w) | 0;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
  }

  // Plus grande forme seulement.
  const label = new Int32Array(w * h);
  let best = 0, bestSize = 0, id = 0;
  for (let s = 0; s < w * h; s++) {
    if (bg[s] || label[s]) continue;
    id++;
    let size = 0;
    const st = [s];
    label[s] = id;
    while (st.length) {
      const p = st.pop(); size++;
      const x = p % w, y = (p / w) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1], [x + 1, y + 1], [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (!bg[q] && !label[q]) { label[q] = id; st.push(q); }
      }
    }
    if (size > bestSize) { best = id; bestSize = size; }
  }

  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (label[p] !== best) { d[p * 4 + 3] = 0; continue; }
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  ctx.putImageData(data, 0, 0);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

const flip = (src) => {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext('2d');
  ctx.translate(c.width, 0); ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
};

/** « salomé.png » → « Salomé » (nom du héros = nom du fichier). */
export const heroName = (file) => {
  const base = file.replace(/.[^.]+$/, '');
  return base.charAt(0).toLocaleUpperCase('fr') + base.slice(1);
};

/**
 * Charge les héros listés (fichiers de public/images/bomberheroes/, voir vite-plugins/bomberHeroes.js).
 * Les images sont dirigées vers la droite ; la version gauche est un miroir.
 * Retourne [{ name, droite, gauche, thumb }] (canvas + miniature en data URL).
 */
export async function loadHeroes(baseUrl, files) {
  const heroes = [];
  for (const file of files) {
    try {
      const droite = cutOut(await load(`${baseUrl}images/bomberheroes/${encodeURIComponent(file)}`));
      heroes.push({ name: heroName(file), droite, gauche: flip(droite), thumb: droite.toDataURL() });
    } catch (e) { console.warn(e.message); }
  }
  if (!heroes.length) throw new Error('Aucune image de héros dans public/images/bomberheroes/');
  return heroes;
}

/**
 * Images des robots : boot.png (normal) et boot_sort.png (quand il détient un sort), dans public/images/bomberheroes/.
 * Retourne { normal, spell, thumb } (canvas + miniature du robot normal).
 */
export async function loadBotSprites(baseUrl) {
  const [normal, spell] = await Promise.all(['boot.png', 'boot_sort.png'].map(async (file) => cutOut(await load(`${baseUrl}images/bomberheroes/${file}`))));
  return { normal, spell, thumb: normal.toDataURL() };
}
