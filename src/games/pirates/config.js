// ============================================================
//  config.js — Variables de vitesse et paramètres du jeu
// ============================================================
export const CONFIG = {

    // ── Carte ──
    MAP_SIZE: 200,          // demi-côté : la carte va de -50 à +50

    // ── Joueur ──
    PLAYER_SPEED:          0.14,   // unités / frame à 60fps
    PLAYER_REVERSE_SPEED:  0.07,
    PLAYER_ROTATION_SPEED: 0.038,  // radians / frame

    // ── Caméra ──
    CAMERA_VIEW_SIZE:  18,   // demi-hauteur en unités monde (zoom)
    CAMERA_SMOOTHING:  0.10, // lerp de suivi du joueur (0 = instantané)

    // ── Ennemis ──
    ENEMY_COUNT:               72,   // 12 par niveau × 6 niveaux
    ENEMY_SPEED_MIN:           0.008,
    ENEMY_SPEED_MAX:           0.028,
    ENEMY_ROTATION_SPEED:      0.012,
    ENEMY_DIR_CHANGE_INTERVAL: 3500,  // ms entre deux changements de cap

    // ── Bataille ──
    BATTLE_DISTANCE:   5.5,   // distance en unités pour déclencher la bataille
    BATTLE_TIME:       20,    // secondes pour répondre
    BATTLE_MULTIPLIER_MAX: 12,// ? × n   (n ∈ [1..BATTLE_MULTIPLIER_MAX])

    // ── Score / Niveaux ──
    // Points nécessaires pour atteindre les niveaux 2, 3, 4, 5, 6, 7, 8, 9
    NIVEAU_SEUILS:     [50, 100, 170, 270, 300, 450, 560, 660, 850],
    MAX_PLAYER_LEVEL:  9,    // 1 niveau de base + 9 seuils
    POINTS_LOSE:       10,   // points perdus sur défaite

    // ── Santé ──
    MAX_HEALTH: 3,

    // ── Îles ──
    ISLAND_COUNT:    10,
    ISLAND_MIN_SIZE: 3.5,
    ISLAND_MAX_SIZE: 7.5,
    ISLAND_LEVELS: [12, 13, 14], // tables des îles
    ISLAND_BATTLE_N_MIN: 2,      // facteur min de la question île
    ISLAND_BATTLE_N_MAX: 9,      // facteur max de la question île
    ISLAND_BONUS_SECONDS: 2,     // secondes gagnées comme bonus île

    // ── Manette ──
    GAMEPAD_DEADZONE: 0.15,

    // ── Taille des sprites ──
    PLAYER_SIZE: 3,   // largeur fixe — hauteur calculée depuis le ratio de la texture
    ENEMY_SIZE:  3,

    // ── Îles (cooldown après défi) ──
    TREASURE_COOLDOWN: 30000,  // ms avant de pouvoir re-défier la même île

    // ── Mode Nuit / Phase 2 ──
    NIGHT_SKY_COLOR:        0x040d1a,   // couleur de fond THREE.Color
    NIGHT_GLOW_COLOR:       '68,120,255',// RGB pour canvas (rgba(R,G,B,a))
    NIGHT_GLOW_INTENSITY:   0.55,       // opacité max du halo bateau
    NIGHT_GLOW_SIZE:        8,          // taille halo bateau (unités monde)
    NIGHT_ISLAND_GLOW_SIZE: 16,         // taille halo île
};
