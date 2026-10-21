import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';
import level4 from './level4.js';
import level5 from './level5.js';
import level6 from './level6.js';
import level7 from './level7.js';
import level8 from './level8.js';
import level9 from './level9.js';
export { buildLevel } from './builder.js';

/** Ordre des niveaux. Ajouter un niveau = créer levelN.js et l'ajouter ici. */
export const LEVELS = [level1, level2, level3, level4, level5, level6, level7, level8, level9];

export const LEVEL_COUNT = LEVELS.length;

/**
 * Définition du niveau n (1-based) ou null si le jeu est terminé.
 * `test` : 0 = niveau de base, i >= 1 = i-ème variante de `tests`.
 */
export function getLevelDef(n, test = 0) {
  const base = LEVELS[n - 1];
  if (!base) return null;
  if (!test) return base;
  const variant = base.tests?.[test - 1];
  return variant ? { ...base, ...variant } : null;
}

/** Liste des tests d'un niveau (le niveau de base en premier) : [{ index, name }]. */
export function levelTests(n) {
  const base = LEVELS[n - 1];
  if (!base) return [];
  return [{ index: 0, name: 'Niveau de base' }, ...(base.tests ?? []).map((t, i) => ({ index: i + 1, name: t.name }))];
}

/** Texte lisible d'un objectif. */
export function goalLabel(goal) {
  return {
    collect: 'Cubes jaunes ramassés',
    shoot: 'Violets abattus (tir)',
    gates: 'Portes traversées',
    purples: 'Violets détruits',
    shape: 'Formation réalisée',
  }[goal.type] ?? goal.type;
}
