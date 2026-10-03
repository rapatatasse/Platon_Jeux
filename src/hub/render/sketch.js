import { drawCanvas } from '../../shared/canvasTexture.js';

/**
 * Dessins « à main levée » façon planches de Léonard de Vinci : encre sépia, double trait tremblé,
 * hachures, lavis légers. Tout est généré en canvas (aucune image à charger) avec un RNG à graine,
 * donc le même objet est toujours dessiné de la même façon.
 */
export const INK = '#3a2813';
export const INK_SOFT = 'rgba(58, 40, 19, 0.55)';
export const RUST = '#8c3b1f';
export const FONT_TITLE = '"IM Fell English", Georgia, serif';
export const FONT_HAND = 'Caveat, "Comic Sans MS", cursive';

export function makeRng(seed = 1) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pen = (ctx, width = 1.6, color = INK, alpha = 1) => {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([]);
};

/** Trait légèrement courbé et tremblé entre deux points. */
export function line(ctx, x1, y1, x2, y2, rng, j = 1.2) {
  const mx = (x1 + x2) / 2 + (rng() - 0.5) * j * 2;
  const my = (y1 + y2) / 2 + (rng() - 0.5) * j * 2;
  ctx.beginPath();
  ctx.moveTo(x1 + (rng() - 0.5) * j, y1 + (rng() - 0.5) * j);
  ctx.quadraticCurveTo(mx, my, x2 + (rng() - 0.5) * j, y2 + (rng() - 0.5) * j);
  ctx.stroke();
}

/** Cercle dessiné en 2 passes qui ne se referment jamais exactement. */
export function circle(ctx, cx, cy, r, rng, { passes = 2, wobble = 0.02 } = {}) {
  for (let p = 0; p < passes; p++) {
    const a0 = rng() * Math.PI * 2;
    const phase = rng() * 6;
    const rr = r * (1 + (rng() - 0.5) * wobble * 2);
    ctx.beginPath();
    const steps = 48;
    for (let i = 0; i <= steps + 2; i++) {
      const a = a0 + (i / steps) * Math.PI * 2;
      const k = 1 + Math.sin(a * 3 + phase) * wobble;
      const x = cx + Math.cos(a) * rr * k, y = cy + Math.sin(a) * rr * k;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
}

export function polygon(ctx, pts, rng, { passes = 2, j = 1 } = {}) {
  for (let p = 0; p < passes; p++) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const px = x + (rng() - 0.5) * j, py = y + (rng() - 0.5) * j;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
  }
}

/** Hachures parallèles, limitées par un tracé (clip). */
function hatch(ctx, clip, box, { angle = -0.7, gap = 5, width = 0.9, alpha = 0.6 }, rng) {
  ctx.save();
  clip();
  ctx.clip();
  pen(ctx, width, INK, alpha);
  const [x0, y0, x1, y1] = box;
  const diag = Math.hypot(x1 - x0, y1 - y0);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  for (let d = -diag / 2; d < diag / 2; d += gap) {
    const ox = cx + Math.cos(angle + Math.PI / 2) * d, oy = cy + Math.sin(angle + Math.PI / 2) * d;
    line(ctx, ox - Math.cos(angle) * diag, oy - Math.sin(angle) * diag, ox + Math.cos(angle) * diag, oy + Math.sin(angle) * diag, rng, 0.8);
  }
  ctx.restore();
}

function wash(ctx, color, alpha, path) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  path();
  ctx.fill();
  ctx.restore();
}

const SCALE = 2;   // résolution des textures : 2 px par unité monde

// ───────────────────────────── planètes ─────────────────────────────

const WASH = { ink: '#b8453a', sea: '#3f8f8a', sand: '#c9a24f', home: '#c9b27a' };

export function planetTexture({ radius, hue, seed = 1, building = false, home = false }) {
  const side = Math.ceil((radius * 2 + 24) * SCALE);
  return drawCanvas(side, side, (ctx, w) => {
    const rng = makeRng(seed);
    const c = w / 2, r = radius * SCALE;
    const body = () => { ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); };

    wash(ctx, WASH[home ? 'home' : hue] ?? WASH.sand, building ? 0.1 : 0.28, body);

    if (building) {
      // échafaudages : méridiens et parallèles en pointillés, grue
      pen(ctx, 1.6, INK, 0.7);
      ctx.setLineDash([8, 7]);
      circle(ctx, c, c, r, rng, { passes: 1, wobble: 0.01 });
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath(); ctx.ellipse(c, c, r * Math.abs(k) / 2.4 + 2, r, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(c, c, r, r * Math.abs(k) / 2.4 + 2, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.setLineDash([]);
      pen(ctx, 2.2, INK, 0.9);
      const gx = c + r * 0.15, gy = c - r * 0.2;
      line(ctx, gx, gy + r * 0.55, gx, gy - r * 0.45, rng); line(ctx, gx, gy - r * 0.45, gx + r * 0.55, gy - r * 0.45, rng);
      line(ctx, gx + r * 0.45, gy - r * 0.45, gx + r * 0.45, gy - r * 0.1, rng);
      line(ctx, gx, gy - r * 0.45, gx + r * 0.25, gy - r * 0.2, rng);
      return;
    }

    // ombre portée en hachures (côté bas-droit)
    hatch(ctx, () => { ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.arc(c - r * 0.28, c - r * 0.3, r * 1.02, 0, Math.PI * 2, true); }, [0, 0, w, w], { angle: -0.8, gap: 6 }, rng);
    pen(ctx, 2.6, INK);
    circle(ctx, c, c, r, rng, { passes: 2, wobble: 0.012 });

    pen(ctx, 1.6, INK, 0.85);
    if (home) {
      // temple grec : fronton et colonnes
      const bw = r * 0.9, bx = c - bw / 2, by = c - r * 0.1;
      polygon(ctx, [[bx - 6, by], [c, by - r * 0.38], [bx + bw + 6, by]], rng);
      for (let i = 0; i < 5; i++) { const x = bx + (bw / 4) * i; line(ctx, x, by + 6, x, by + r * 0.48, rng, 0.8); }
      line(ctx, bx - 6, by + r * 0.52, bx + bw + 6, by + r * 0.52, rng);
      line(ctx, bx - 2, by + r * 0.6, bx + bw + 2, by + r * 0.6, rng);
    } else if (hue === 'ink') {
      // grille de pixels + pixel rouge
      for (let i = -3; i <= 3; i++) {
        const o = (i * r) / 3.6, half = Math.sqrt(Math.max(0, r * r - o * o)) * 0.92;
        line(ctx, c + o, c - half, c + o, c + half, rng, 1);
        line(ctx, c - half, c + o, c + half, c + o, rng, 1);
      }
      ctx.fillStyle = '#a02a22'; ctx.globalAlpha = 0.9;
      const s = r * 0.2;
      ctx.fillRect(c - s / 2, c - s / 2, s, s);
      pen(ctx, 1.8, INK); ctx.strokeRect(c - s / 2, c - s / 2, s, s);
    } else if (hue === 'sea') {
      // vagues + petit voilier
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        for (let x = -r * 0.8; x <= r * 0.8; x += 6) {
          const y = k * r * 0.26 + Math.sin(x / (r * 0.16) + k) * 5;
          if (Math.hypot(x, y) > r * 0.9) continue;
          ctx.lineTo(c + x, c + y);
        }
        ctx.stroke();
      }
      pen(ctx, 2, INK);
      const sx = c - r * 0.1, sy = c - r * 0.02;
      polygon(ctx, [[sx - 16, sy + 12], [sx + 18, sy + 12], [sx + 10, sy + 22], [sx - 10, sy + 22]], rng, { passes: 1 });
      line(ctx, sx, sy + 12, sx, sy - 26, rng); polygon(ctx, [[sx + 2, sy - 24], [sx + 20, sy + 8], [sx + 2, sy + 8]], rng, { passes: 1 });
    }
  });
}

export function labelTexture(title, sub, { color = INK } = {}) {
  return drawCanvas(460, 70, (ctx, W) => {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.font = `30px ${FONT_TITLE}`;
    ctx.fillText(title, W / 2, sub ? 24 : 35);
    if (sub) { ctx.font = `26px ${FONT_HAND}`; ctx.globalAlpha = 0.85; ctx.fillText(sub, W / 2, 54); }
  });
}

// ───────────────────────────── orbite ─────────────────────────────

/** Cercle d'orbite + carré inscrit (étude de proportions), pointillés et graduations. */
export function orbitTexture({ radius, seed = 3, dashed = false }) {
  const side = Math.ceil((radius * 2 + 20) * SCALE);
  return drawCanvas(side, side, (ctx, w) => {
    const rng = makeRng(seed);
    const c = w / 2, r = radius * SCALE;
    pen(ctx, 2, INK, dashed ? 0.55 : 0.8);
    ctx.setLineDash(dashed ? [4, 12] : [18, 9]);
    circle(ctx, c, c, r, rng, { passes: 1, wobble: 0.008 });
    ctx.setLineDash([3, 9]);
    pen(ctx, 1.2, INK, 0.45); ctx.setLineDash([3, 9]);
    const q = r / Math.SQRT2;
    polygon(ctx, [[c - q, c - q], [c + q, c - q], [c + q, c + q], [c - q, c + q]], rng, { passes: 1 });
    ctx.setLineDash([]);
    pen(ctx, 1.6, INK, 0.7);
    for (let a = 0; a < 360; a += 15) {
      const rad = (a * Math.PI) / 180, len = a % 90 === 0 ? 14 : 7;
      line(ctx, c + Math.cos(rad) * (r - len), c + Math.sin(rad) * (r - len), c + Math.cos(rad) * (r + 2), c + Math.sin(rad) * (r + 2), rng, 0.6);
    }
  });
}

// ───────────────────────────── astéroïdes, tirs, ennemis ─────────────────────────────

export function asteroidTexture({ r, seed }) {
  const side = Math.ceil((r * 2 + 12) * SCALE);
  return drawCanvas(side, side, (ctx, w) => {
    const rng = makeRng(seed);
    const c = w / 2, R = r * SCALE;
    const n = 9 + Math.floor(rng() * 3);
    const pts = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2, k = 0.78 + rng() * 0.3;
      return [c + Math.cos(a) * R * k, c + Math.sin(a) * R * k];
    });
    const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
    wash(ctx, '#8a6f45', 0.35, path);
    hatch(ctx, path, [0, 0, w, w], { angle: -0.9, gap: 6, alpha: 0.5 }, rng);
    pen(ctx, 2.4, INK);
    polygon(ctx, pts, rng, { passes: 2, j: 2 });
    pen(ctx, 1.4, INK, 0.8);
    for (let k = 0; k < 2; k++) {
      const x = c + (rng() - 0.5) * R * 0.8, y = c + (rng() - 0.5) * R * 0.8;
      circle(ctx, x, y, R * (0.1 + rng() * 0.1), rng, { passes: 1 });
    }
  });
}

/** Vaisseau ennemi : machine volante à ailes de chauve-souris (croquis rouille). Regarde vers +x. */
export function enemyTexture() {
  return drawCanvas(180, 150, (ctx, W, H) => {
    const rng = makeRng(42);
    const cx = W / 2, cy = H / 2;
    const wing = (dir) => {
      const p = [[cx - 6, cy], [cx - 40, cy + dir * 20], [cx - 70, cy + dir * 62], [cx - 36, cy + dir * 48], [cx - 14, cy + dir * 66], [cx + 6, cy + dir * 40], [cx + 24, cy + dir * 12]];
      const path = () => { ctx.beginPath(); p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
      wash(ctx, RUST, 0.3, path);
      pen(ctx, 2.4, INK); polygon(ctx, p, rng, { passes: 2 });
      pen(ctx, 1.3, INK, 0.7);
      [[-40, 20], [-70, 62], [-14, 66]].forEach(([dx, dy]) => line(ctx, cx - 6, cy, cx + dx, cy + dir * Math.abs(dy), rng, 1));
    };
    wing(-1); wing(1);
    const body = () => { ctx.beginPath(); ctx.ellipse(cx + 6, cy, 46, 14, 0, 0, Math.PI * 2); };
    wash(ctx, '#b9843f', 0.5, body);
    pen(ctx, 2.6, INK); ctx.beginPath(); ctx.ellipse(cx + 6, cy, 46, 14, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx + 8, cy + 1, 45, 13, 0.02, 0, Math.PI * 2); ctx.stroke();
    pen(ctx, 1.8, INK);
    line(ctx, cx - 40, cy, cx - 70, cy - 4, rng); line(ctx, cx - 70, cy - 4, cx - 66, cy - 16, rng); line(ctx, cx - 70, cy - 4, cx - 66, cy + 8, rng);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx + 30, cy - 2, 4, 0, Math.PI * 2); ctx.fill();
    pen(ctx, 1.4, INK, 0.8);
    for (let i = -2; i <= 2; i++) line(ctx, cx + i * 14, cy - 12, cx + i * 14 + 4, cy + 12, rng, 0.6);
  });
}

export function bulletTexture({ enemy = false } = {}) {
  return drawCanvas(40, 40, (ctx, W) => {
    const rng = makeRng(enemy ? 5 : 9), c = W / 2;
    ctx.fillStyle = enemy ? RUST : INK;
    ctx.beginPath(); ctx.arc(c, c, enemy ? 9 : 6, 0, Math.PI * 2); ctx.fill();
    pen(ctx, 2, enemy ? RUST : INK, 0.8);
    circle(ctx, c, c, enemy ? 13 : 10, rng, { passes: 1, wobble: 0.08 });
  });
}

export function inkDotTexture() {
  return drawCanvas(32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    g.addColorStop(0, 'rgba(58,40,19,0.8)'); g.addColorStop(1, 'rgba(58,40,19,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
  });
}

export function shockwaveTexture() {
  return drawCanvas(128, 128, (ctx, W) => {
    const rng = makeRng(77);
    pen(ctx, 5, INK, 0.9);
    circle(ctx, W / 2, W / 2, 54, rng, { passes: 2, wobble: 0.05 });
  });
}

export function debrisTexture() {
  return drawCanvas(32, 32, (ctx) => {
    const rng = makeRng(13);
    pen(ctx, 3, INK, 0.9);
    polygon(ctx, [[6, 20], [14, 5], [26, 12], [20, 26]], rng, { passes: 1, j: 2 });
  });
}

// ───────────────────────────── carte du monde ─────────────────────────────

function star(ctx, x, y, s, rng) {
  pen(ctx, 1.2, INK, 0.5 + rng() * 0.3);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI + rng() * 0.2;
    line(ctx, x - Math.cos(a) * s, y - Math.sin(a) * s, x + Math.cos(a) * s, y + Math.sin(a) * s, rng, 0.5);
  }
}

/** Grande planche de fond : cadre, graduations, étoiles, routes, rose des vents, annotations. */
export function worldTexture({ halfW, halfH, planets, home }) {
  const S = 1.15;
  const W = Math.ceil(halfW * 2 * S), H = Math.ceil(halfH * 2 * S);
  const X = (x) => (x + halfW) * S, Y = (y) => (halfH - y) * S;
  return drawCanvas(W, H, (ctx) => {
    const rng = makeRng(2024);

    // routes en pointillés depuis Agora
    pen(ctx, 1.4, INK, 0.35); ctx.setLineDash([2, 9]);
    for (const p of planets) {
      ctx.beginPath(); ctx.moveTo(X(home.x), Y(home.y));
      const mx = (home.x + p.x) / 2 + (p.y - home.y) * 0.12, my = (home.y + p.y) / 2 - (p.x - home.x) * 0.12;
      ctx.quadraticCurveTo(X(mx), Y(my), X(p.x), Y(p.y)); ctx.stroke();
    }
    ctx.setLineDash([]);

    // études géométriques autour d'Agora
    for (const [r, a] of [[210, 0.22], [380, 0.16], [620, 0.12]]) {
      pen(ctx, 1.2, INK, a); ctx.setLineDash([10, 14]);
      circle(ctx, X(home.x), Y(home.y), r * S, rng, { passes: 1, wobble: 0.006 });
    }
    ctx.setLineDash([]);
    pen(ctx, 1, INK, 0.12);
    for (let a = 0; a < 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      line(ctx, X(home.x), Y(home.y), X(home.x) + Math.cos(rad) * 700 * S, Y(home.y) + Math.sin(rad) * 700 * S, rng, 1.5);
    }

    // étoiles
    for (let i = 0; i < 150; i++) {
      const x = rng() * W, y = rng() * H;
      if (planets.concat([home]).some((p) => Math.hypot(x - X(p.x), y - Y(p.y)) < ((p.orbit ?? p.radius + 30) + 10) * S)) continue;
      star(ctx, x, y, 3 + rng() * 5, rng);
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = INK; ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.arc(rng() * W, rng() * H, 1 + rng() * 1.4, 0, Math.PI * 2); ctx.fill();
    }

    // cadre double + graduations
    pen(ctx, 3, INK, 0.9);
    const m = 6;
    polygon(ctx, [[m, m], [W - m, m], [W - m, H - m], [m, H - m]], rng, { passes: 2, j: 3 });
    pen(ctx, 1.4, INK, 0.7);
    polygon(ctx, [[m + 14, m + 14], [W - m - 14, m + 14], [W - m - 14, H - m - 14], [m + 14, H - m - 14]], rng, { passes: 1, j: 2 });
    ctx.font = `15px ${FONT_HAND}`; ctx.fillStyle = INK; ctx.globalAlpha = 0.7; ctx.textAlign = 'center';
    for (let x = -halfW + 100; x < halfW; x += 100) {
      line(ctx, X(x), m + 14, X(x), m + 24, rng, 0.4); line(ctx, X(x), H - m - 14, X(x), H - m - 24, rng, 0.4);
      ctx.fillText(String(Math.round(x / 10)), X(x), m + 42);
    }
    for (let y = -halfH + 100; y < halfH; y += 100) {
      line(ctx, m + 14, Y(y), m + 24, Y(y), rng, 0.4); line(ctx, W - m - 14, Y(y), W - m - 24, Y(y), rng, 0.4);
      ctx.fillText(String(Math.round(y / 10)), m + 44, Y(y) + 5);
    }

    // cartouche de titre
    ctx.globalAlpha = 0.9; ctx.fillStyle = INK; ctx.textAlign = 'center';
    ctx.font = `40px ${FONT_TITLE}`;
    ctx.fillText('Carte du ciel de Platon', W / 2, 96);
    ctx.font = `22px ${FONT_HAND}`; ctx.globalAlpha = 0.7;
    ctx.fillText('— étude des routes entre les mondes du savoir —', W / 2, 126);
    pen(ctx, 1.6, INK, 0.7); line(ctx, W / 2 - 230, 140, W / 2 + 230, 140, rng, 2);

    // rose des vents
    const rx = W - 130, ry = H - 130;
    pen(ctx, 2, INK, 0.8); circle(ctx, rx, ry, 50, rng, { passes: 1 }); circle(ctx, rx, ry, 36, rng, { passes: 1 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, len = i % 2 ? 44 : 74;
      line(ctx, rx, ry, rx + Math.cos(a) * len, ry + Math.sin(a) * len, rng, 1);
    }
    ctx.font = `22px ${FONT_TITLE}`; ctx.globalAlpha = 0.85; ctx.fillText('N', rx, ry - 82);

    // écriture « en miroir », clin d'œil à Léonard
    ctx.save();
    ctx.translate(210, H - 60); ctx.scale(-1, 1);
    ctx.font = `24px ${FONT_HAND}`; ctx.globalAlpha = 0.5; ctx.textAlign = 'left';
    ctx.fillText('platon formation', 0, 0);
    ctx.restore();

    // annotations en marge
    ctx.font = `22px ${FONT_HAND}`; ctx.globalAlpha = 0.7; ctx.textAlign = 'left';
    ctx.fillText('ici, des astéroïdes…', X(-100), Y(300));
    ctx.fillText('(évite-les !)', X(-85), Y(270));
    ctx.fillText('départ : Agora', X(70), Y(-90));
  });
}
