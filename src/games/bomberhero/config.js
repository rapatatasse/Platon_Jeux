// ═══════════════════════════════════════════════════════════════════════════
//  RÉGLAGES DU JEU — modifie ces valeurs pour changer les règles
// ═══════════════════════════════════════════════════════════════════════════
export const GAME = {
  width: 15,                // largeur de l'arène (en cases, nombre impair)
  height: 13,               // hauteur de l'arène (en cases, nombre impair)
  blockDensity: 0.78,       // part des cases libres remplies de pierres fissurées
  chestsPerQuarter: 2,      // coffres par quart d'arène (l'arène est symétrique : même chance pour tous)
  bonusChance: 0.24,        // chance qu'une pierre cassée laisse un bonus
  roundsToWin: 3,           // manches à gagner pour remporter la partie
  roundEndDelay: 2.2,       // secondes avant l'annonce de la fin de manche
  suddenDeathAt: 60,        // durée d’une manche en secondes avant que le sol s’effondre (0 = jamais)
  suddenDeathStep: 0.22,    // secondes entre deux cases qui se ferment
  // Arène réduite selon le nombre de joueurs (les autres réglages restent ceux ci-dessus).
  sizes: { 2: { width: 11, height: 9, chestsPerQuarter: 1 } },
  player: {
    speed: 3.6,             // cases par seconde
    speedBonus: 0.45,       // gain de vitesse par bonus « bottes »
    maxSpeed: 6.2,
    bombs: 1,               // bombes posables en même temps
    maxBombs: 6,
    range: 2,               // portée des flammes (en cases)
    maxRange: 8,
  },
  bomb: { fuse: 2.4, slideSpeed: 9 },
  flame: { duration: 0.45 },
  powers: {
    ice:   { range: 7, freeze: 3.2 },
    push:  { range: 5, slide: 4, force: 12 },
    ray:   { flame: 0.3, delay: 0.08 },
    fire:  { range: 5, delay: 0.13, duration: 1.4 },
    slow:  { duration: 5.5, factor: 0.5 },
    haste: { duration: 6, factor: 1.7 },
  },
};

export const POWERS = {
  ice:   { name: 'Glace',         icon: '❄', color: '#8fd6ff', hint: 'Fige le premier adversaire en ligne' },
  push:  { name: 'Poussée',       icon: '➤', color: '#ffd37a', hint: 'Repousse bombe ou adversaire' },
  fire:  { name: 'Flamme',       icon: '▲', color: '#ff9a3c', hint: 'Mur de flammes devant toi' },
  ray:   { name: 'Rayon',         icon: '✦', color: '#ff7a8a', hint: 'Rayon qui brise tout en ligne' },
  slow:  { name: 'Ralentisseur',  icon: '⌛', color: '#b79bff', hint: 'Ralentit tous les adversaires' },
  haste: { name: 'Rapidité',      icon: '»',  color: '#8cf0b0', hint: 'Cours beaucoup plus vite' },
};
/** Niveaux des robots : délai de réaction, vitesse relative, étourderies, attente entre deux actions. */
export const BOT_LEVELS = {
  facile:    { name: 'Facile',    think: 0.38, speed: 0.6,  blunder: 0.15, bombDelay: 3.5, powerDelay: 2.5 },
  normal:    { name: 'Normal',    think: 0.16, speed: 0.82, blunder: 0.12, bombDelay: 1.4, powerDelay: 0.8 },
  difficile: { name: 'Difficile', think: 0.05, speed: 1,    blunder: 0,    bombDelay: 0,   powerDelay: 0 },
};

/** Niveau des gardiens du mode Aventure (caractère utilisé dans la description des étages). */
export const ENEMY_LEVELS = { 1: 'facile', 2: 'normal', 3: 'difficile' };
export const ENEMY_COLOR = '#9b59d0';

export const POWER_IDS = Object.keys(POWERS);

/**
 * Joueurs : touches (event.code pour flèches / pavé numérique, caractère pour les lettres) et couleur.
 * Le héros de chaque joueur se choisit dans le menu parmi les images public/images/bomberheroes/joueurN.png.
 */
const K = (up, down, left, right, bomb, power) => ({ up, down, left, right, bomb, power });
export const PLAYERS = [
  { name: 'Joueur 1', color: '#e0584a', keys: K(['ArrowUp'], ['ArrowDown'], ['ArrowLeft'], ['ArrowRight'], ['NumpadDecimal', 'Period'], ['Numpad3', 'Digit3']),
    label: { move: '← ↑ → ↓', bomb: '.', power: '3' } },
  { name: 'Joueur 2', color: '#4f8fe0', keys: K(['z'], ['s'], ['q'], ['d'], ['b'], ['n']),
    label: { move: 'Z Q S D', bomb: 'B', power: 'N' } },
  { name: 'Joueur 3', color: '#4fb878', keys: K(['i'], ['k'], ['j'], ['l'], ['u'], ['o']),
    label: { move: 'I J K L', bomb: 'U', power: 'O' } },
  { name: 'Joueur 4', color: '#e8c23a', keys: K(['t'], ['g'], ['f'], ['h'], ['r'], ['y']),
    label: { move: 'T F G H', bomb: 'R', power: 'Y' } },
];
