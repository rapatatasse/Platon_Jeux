// Réglages globaux du jeu. Modifier ici = modifier partout.

export const TICK_MS = 500;          // durée d'un "pas" du monde (temps réel)
export const CHUNK_SIZE = 16;        // taille d'un morceau de plateau (rangement + rendu par paquets)
export const VIEW_CHUNKS = 4;        // rayon (en chunks) dessiné autour du joueur
export const BULLET_SPEED = 3;       // cases parcourues par une balle à chaque tick
export const BULLET_RANGE = 40;      // portée max d'une balle (en cases)
export const START_BULLETS = 3;
export const MAX_QUEUE = 500;        // nb max de commandes en attente (protège des boucles infinies)
export const LEVEL_TRANSITION_TICKS = 6;  // durée (en ticks) de l'animation de réussite d'un niveau

// Types de cases du monde (le rouge n'est jamais dans le monde : c'est le joueur)
export const CELL = Object.freeze({
  YELLOW: 'yellow',
  PURPLE: 'purple',
  WHITE: 'white',
});

export const COLORS = Object.freeze({
  red: 0xff2d2d,
  yellow: 0xffd400,
  purple: 0x9b30ff,
  white: 0xf0f0f0,
  bullet: 0x4ff0ff,
  gate: 0x2fa8ff,
  gatePassed: 0x5ef28a,
  ground: 0x161826,
  grid: 0x2c3150,
  gridCenter: 0x3d4470,
});

// Convention d'axes (identique partout : terminal, fire, moveyellow, CubesOffsets) :
//   X = gauche/droite, Y = HAUTEUR (empilement, jamais < 0), Z = profondeur (+1 = vers le bas de l'écran)
//   terminal : [x, z, fire, moveyellow] -> le déplacement n'a pas de composante Y

// Voisins à 6 faces (utilisé pour la connectivité des cubes jaunes)
export const NEIGHBORS6 = Object.freeze([
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
]);
