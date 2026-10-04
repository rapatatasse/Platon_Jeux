/**
 * Géométrie du monde (pure, sans Three.js ni DOM).
 * Repère monde : x vers la droite, y vers le HAUT, origine au centre de la carte.
 * Les anneaux sont des tableaux plats [x0, y0, x1, y1, ...].
 */

/** Convertit les coordonnées SVG (y vers le bas) en repère monde, à l'échelle voulue. */
export function toWorldRing(ring, mapSize, scale) {
  const out = new Array(ring.length);
  for (let i = 0; i < ring.length; i += 2) {
    out[i] = (ring[i] - mapSize.width / 2) * scale;
    out[i + 1] = (mapSize.height / 2 - ring[i + 1]) * scale;
  }
  return out;
}

export function ringArea(ring) {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i += 2) {
    const j = (i + 2) % n;
    a += ring[i] * ring[j + 1] - ring[j] * ring[i + 1];
  }
  return a / 2;
}

/** Centre de gravité d'un anneau (formule du polygone), repli sur la moyenne des sommets. */
export function ringCentroid(ring) {
  const a = ringArea(ring);
  let cx = 0, cy = 0;
  for (let i = 0, n = ring.length; i < n; i += 2) {
    const j = (i + 2) % n;
    const f = ring[i] * ring[j + 1] - ring[j] * ring[i + 1];
    cx += (ring[i] + ring[j]) * f; cy += (ring[i + 1] + ring[j + 1]) * f;
  }
  if (Math.abs(a) < 1e-6) {
    const n = ring.length / 2;
    return { x: ring.filter((_, i) => i % 2 === 0).reduce((s, v) => s + v, 0) / n, y: ring.filter((_, i) => i % 2 === 1).reduce((s, v) => s + v, 0) / n };
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

/** Test « point dans polygone » (règle pair/impair). */
export function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Assemble les données pédagogiques (inventions.js) et la géométrie (worldGeo.js).
 * Retourne { halfW, halfH, countries: [{ iso, name, locative, inventions, rings, centroid, bbox }] }.
 */
export function buildWorld({ countries, geo, mapSize, scale = 2 }) {
  const out = countries.map((c) => {
    const g = geo[c.iso];
    if (!g) throw new Error(`Pays « ${c.name} » (${c.iso}) absent de worldGeo.js`);
    const rings = g.rings.map((r) => toWorldRing(r, mapSize, scale));
    const main = rings.reduce((best, r) => (Math.abs(ringArea(r)) > Math.abs(ringArea(best)) ? r : best));
    const xs = main.filter((_, i) => i % 2 === 0), ys = main.filter((_, i) => i % 2 === 1);
    return {
      iso: c.iso, name: c.name, locative: c.locative, inventions: c.inventions,
      rings, mainRing: main, centroid: ringCentroid(main),
      bbox: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
    };
  });
  return { halfW: (mapSize.width / 2) * scale, halfH: (mapSize.height / 2) * scale, scale, countries: out };
}

export function countryContains(country, x, y) {
  return country.rings.some((r) => pointInRing(x, y, r));
}
