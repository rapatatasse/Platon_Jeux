/**
 * Catalogue des jeux de la plateforme (source unique pour le hub, la navigation et le SEO).
 * status 'open' = jouable, 'building' = planète « en téraformation ».
 * Pour ajouter un jeu : ajouter une entrée ici + une page dans vite.config.js.
 */
export const GAMES = [
  {
    id: 'pixel',
    name: 'PIXEL',
    tagline: 'Apprends le JavaScript en pilotant un pixel',
    description: 'Un jeu de logique en 3D : écris des fonctions et des boucles JavaScript pour guider ton pixel rouge à travers les niveaux.',
    audience: 'Ados et adultes — initiation au code JavaScript',
    seoTitle: 'PIXEL : apprendre le JavaScript en jouant | Platon Jeux',
    seoDescription: 'Apprends les fonctions et les boucles JavaScript dans PIXEL, un jeu de logique en 3D où tu guides un pixel rouge à travers des niveaux.',
    image: '/images/vaisseau.png',
    url: '/games/pixel/',
    status: 'open',
    planet: { x: -260, y: -120, radius: 70, orbit: 135, hue: 'ink' },
  },
  {
    id: 'pirates',
    name: 'Pirates des Tables',
    tagline: 'Apprends les multiplications en abordant des navires',
    description: 'Navigue sur les mers, affronte des bateaux ennemis et résous des multiplications avant la fin du temps imparti.',
    audience: 'Enfants — tables de multiplication',
    seoTitle: 'Pirates des Tables : réviser les multiplications',
    seoDescription: 'Révise les tables de multiplication dans un jeu de pirates en 3D : navigue, affronte des navires et résous les calculs à temps.',
    image: '/images/pirates/bateaux/bateau1.png',
    url: '/games/pirates/',
    status: 'open',
    planet: { x: 300, y: 140, radius: 62, orbit: 125, hue: 'sea' },
  },
  {
    id: 'inventeurs',
    name: 'Les Inventeurs',
    tagline: 'Fais le tour du monde pour rendre leurs inventions aux inventeurs',
    description: 'Un savant fou a effacé toutes les inventions ! Pilote le vaisseau de Platon, trouve le bon pays sur la carte et découvre qui a inventé quoi, et quand. Objectif : 20 inventions livrées en 5 minutes, sur 3 niveaux de plus en plus difficiles (boussole cassée, carte effacée).',
    audience: 'Tous âges — géographie et histoire des inventions',
    seoTitle: 'Les Inventeurs : géographie et histoire en jeu',
    seoDescription: 'Explore le monde avec Platon, retrouve les pays et découvre qui a créé des inventions célèbres dans ce jeu éducatif de géographie et d’histoire.',
    image: '/images/vaisseau.png',
    url: '/games/inventeurs/',
    status: 'open',
    planet: { x: 40, y: -400, radius: 58, orbit: 118, hue: 'globe' },
  },
  { id: 'soon-2', name: 'Planète Algèbre', status: 'building', planet: { x: -520, y: 260, radius: 44, orbit: 92, hue: 'sand' } },
  { id: 'soon-3', name: 'Planète Langues', status: 'building', planet: { x: 560, y: -330, radius: 52, orbit: 100, hue: 'sand' } },
];

export const SITE = {
  name: 'Platon Formation',
  url: 'https://www.platonformation.com',
  version: '1.2',
};

export const AUTHOR = {
  name: 'Chaffanjon J.',
  url: 'https://rapatatasse.github.io/portfolio/',
};
