/** Générateur pseudo-aléatoire déterministe (mulberry32). Même graine => même monde (utile en multi). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Combine plusieurs entiers en une graine. */
export function hashSeed(...nums) {
  let h = 2166136261;
  for (const n of nums) {
    h ^= (n | 0) + 0x9e3779b9;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
