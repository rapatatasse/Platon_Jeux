import { drawCanvas } from '../../../shared/canvasTexture.js';
import { INK, RUST, FONT_TITLE, FONT_HAND, makeRng, line, circle, polygon, pen, wash } from '../../../shared/sketch.js';
import { pointInRing } from '../core/world.js';

const WASHES = ['#b8453a', '#3f8f8a', '#c9a24f', '#7d6a3a', '#8a5a3c', '#5f7f4a'];
const PX_PER_UNIT = 0.9;   // résolution de la texture : reste sous 4096 px de large

/**
 * Carte du monde « croquis » : continents contourisés à main levée, pays jouables lavés de couleur et nommés,
 * graticule, vagues, cadre et rose des vents. Les polygones viennent de worldGeo.js (coordonnées SVG, y vers le bas).
 */
export function mapTexture({ geo, mapSize, world, playable, showNames = true }) {
  const k = world.scale * PX_PER_UNIT;               // SVG -> pixels du canvas
  const W = Math.ceil(mapSize.width * k), H = Math.ceil(mapSize.height * k);
  const toPx = (ring) => { const p = []; for (let i = 0; i < ring.length; i += 2) p.push([ring[i] * k, ring[i + 1] * k]); return p; };
  const flat = (pts) => pts.flat();

  return drawCanvas(W, H, (ctx) => {
    const rng = makeRng(77);
    const all = Object.entries(geo).map(([iso, g]) => ({ iso, name: g.name, polys: g.rings.map(toPx) }));
    const land = all.flatMap((c) => c.polys.map(flat));

    // graticule (méridiens / parallèles)
    pen(ctx, 1.2, INK, 0.16); ctx.setLineDash([10, 14]);
    for (let i = 1; i < 12; i++) { ctx.beginPath(); ctx.moveTo((W / 12) * i, 0); ctx.lineTo((W / 12) * i, H); ctx.stroke(); }
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, (H / 6) * i); ctx.lineTo(W, (H / 6) * i); ctx.stroke(); }
    ctx.setLineDash([]);
    pen(ctx, 1.8, INK, 0.22); ctx.setLineDash([3, 10]);
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.setLineDash([]);

    // vagues dans l'océan
    pen(ctx, 1.6, INK, 0.3);
    for (let n = 0, tries = 0; n < 200 && tries < 1500; tries++) {
      const x = 40 + rng() * (W - 80), y = 120 + rng() * (H - 200);
      if (land.some((r) => pointInRing(x, y, r))) continue;
      n++;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8, y - 6, x + 16, y); ctx.quadraticCurveTo(x + 24, y + 6, x + 32, y); ctx.stroke();
    }

    // terres : lavis + contour tremblé
    const playIdx = new Map(playable.map((c, i) => [c.iso, i]));
    for (const c of all) {
      const idx = playIdx.get(c.iso);
      c.polys.forEach((pts) => {
        const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
        wash(ctx, '#fff6d6', 0.5, path);
        if (idx !== undefined) wash(ctx, WASHES[idx % WASHES.length], 0.26, path);
        pen(ctx, idx !== undefined ? 2.2 : 1.5, INK, idx !== undefined ? 0.95 : 0.7);
        polygon(ctx, pts, rng, { passes: idx !== undefined ? 2 : 1, j: 1.3 });
      });
    }

    // noms des pays jouables
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const c of showNames ? playable : []) {
      const w = (c.bbox.maxX - c.bbox.minX) * PX_PER_UNIT;
      const size = Math.max(15, Math.min(30, w * 0.2));
      const x = (c.centroid.x + world.halfW) * PX_PER_UNIT, y = (world.halfH - c.centroid.y) * PX_PER_UNIT;
      ctx.font = `${size}px ${FONT_TITLE}`;
      ctx.strokeStyle = 'rgba(255,246,214,0.9)'; ctx.lineWidth = 5; ctx.globalAlpha = 1;
      ctx.strokeText(c.name, x, y);
      ctx.fillStyle = INK; ctx.fillText(c.name, x, y);
    }

    // cadre, titre, rose des vents
    pen(ctx, 3.5, INK, 0.95);
    polygon(ctx, [[6, 6], [W - 6, 6], [W - 6, H - 6], [6, H - 6]], rng, { passes: 2, j: 3 });
    pen(ctx, 1.5, INK, 0.7);
    polygon(ctx, [[22, 22], [W - 22, 22], [W - 22, H - 22], [22, H - 22]], rng, { passes: 1, j: 2 });
    ctx.fillStyle = INK; ctx.globalAlpha = 0.9;
    ctx.font = `46px ${FONT_TITLE}`; ctx.fillText('Mappemonde des inventeurs', W / 2, 62);
    ctx.font = `24px ${FONT_HAND}`; ctx.globalAlpha = 0.7; ctx.fillText('— à chaque pays son génie —', W / 2, 98);
    const rx = W - 140, ry = H - 130;
    pen(ctx, 2, INK, 0.8); circle(ctx, rx, ry, 52, rng, { passes: 1 }); circle(ctx, rx, ry, 38, rng, { passes: 1 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, len = i % 2 ? 46 : 76; line(ctx, rx, ry, rx + Math.cos(a) * len, ry + Math.sin(a) * len, rng, 1); }
    ctx.font = `24px ${FONT_TITLE}`; ctx.globalAlpha = 0.85; ctx.fillStyle = RUST; ctx.fillText('N', rx, ry - 88);
  });
}
