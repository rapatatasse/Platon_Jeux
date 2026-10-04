import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Convertit public/images/world.svg (Simplemaps, licence MIT) en polygones JS :
 *   node scripts/buildWorld.mjs
 * Écrit src/games/inventeurs/worldGeo.js (coordonnées SVG, y vers le bas ; le jeu les convertit en repère monde).
 */
const SRC = 'public/images/world.svg';
const OUT = 'src/games/inventeurs/worldGeo.js';

// Les pays à îles multiples sont décrits par une « class » (nom anglais) au lieu d'un id ISO.
const CLASS_TO_ISO = {
  Argentina: 'AR', Australia: 'AU', Canada: 'CA', China: 'CN', Denmark: 'DK', France: 'FR', Greece: 'GR', Italy: 'IT', Japan: 'JP',
  'New Zealand': 'NZ', Norway: 'NO', 'Russian Federation': 'RU', Turkey: 'TR', 'United Kingdom': 'GB', 'United States': 'US',
};

const svg = readFileSync(SRC, 'utf8');
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/** Aplatit un attribut d (M, m, L, l, Z, z uniquement) en anneaux [x0,y0,x1,y1,...]. */
function rings(d) {
  const tokens = d.match(/[MmLlZz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const out = [];
  let ring = null, cmd = '', x = 0, y = 0, sx = 0, sy = 0, i = 0;
  const num = () => parseFloat(tokens[i++]);
  const push = () => ring.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) {
      cmd = tokens[i++];
      if (cmd === 'Z' || cmd === 'z') { if (ring?.length >= 6) out.push(ring); ring = null; x = sx; y = sy; continue; }
      if (cmd === 'M' || cmd === 'm') { if (ring?.length >= 6) out.push(ring); ring = []; const nx = num(), ny = num(); if (cmd === 'm') { x += nx; y += ny; } else { x = nx; y = ny; } sx = x; sy = y; push(); cmd = cmd === 'm' ? 'l' : 'L'; continue; }
    }
    if (!ring) { ring = []; x = sx; y = sy; push(); }
    const nx = num(), ny = num();
    if (cmd === 'l') { x += nx; y += ny; } else { x = nx; y = ny; }
    push();
  }
  if (ring?.length >= 6) out.push(ring);
  return out;
}

const geo = {};
for (const m of svg.matchAll(/<path\b[^>]*>/g)) {
  const tag = m[0];
  const d = attr(tag, 'd');
  if (!d) continue;
  const id = attr(tag, 'id'), cls = attr(tag, 'class'), name = attr(tag, 'name') ?? cls;
  const key = id ?? CLASS_TO_ISO[cls] ?? cls;
  if (!key) continue;
  (geo[key] ??= { name, rings: [] }).rings.push(...rings(d));
}

const body = Object.entries(geo).map(([k, v]) => `  ${JSON.stringify(k)}: { name: ${JSON.stringify(v.name)}, rings: ${JSON.stringify(v.rings)} }`).join(',\n');
const license = `/*
 * Données générées par scripts/buildWorld.mjs à partir de public/images/world.svg.
 * Carte du monde © Simplemaps.com (Pareto Software, LLC), licence MIT — https://simplemaps.com
 * Ne pas modifier à la main.
 */`;
writeFileSync(OUT, `${license}\nexport const MAP_SIZE = { width: 2000, height: 857 };\n\nexport const GEO = {\n${body},\n};\n`);
console.log(`${Object.keys(geo).length} pays, ${Object.values(geo).reduce((n, g) => n + g.rings.length, 0)} anneaux -> ${OUT}`);
