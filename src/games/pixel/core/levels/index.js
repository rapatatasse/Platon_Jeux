import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';
import level4 from './level4.js';
import level5 from './level5.js';
import level6 from './level6.js';
export { buildLevel } from './builder.js';

/** Ordre des niveaux. Ajouter un niveau = créer levelN.js et l'ajouter ici. */
export const LEVELS = [level1, level2, level3, level4, level5, level6];

export const LEVEL_COUNT = LEVELS.length;

/** Définition du niveau n (1-based) ou null si le jeu est terminé. */
export function getLevelDef(n) {
  return LEVELS[n - 1] ?? null;
}

/** Texte lisible d'un objectif. */
export function goalLabel(goal) {
  return {
    collect: 'Cubes jaunes ramassés',
    sandwich: 'Violets écrasés (sandwich)',
    shoot: 'Violets abattus (tir)',
    gates: 'Portes traversées',
  }[goal.type] ?? goal.type;
}
