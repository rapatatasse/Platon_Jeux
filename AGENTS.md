# Notes projet (pour les agents et les humains)

- Plateforme multi-pages Vite 7 + Three.js 0.170, modules ES, DOM natif, aucun framework UI. Langue du code/UI : français.
- Commandes : `npm run dev` (port 5173), `npm test` (node --test, logique uniquement), `npm run build`, `npm start` (sert `dist/`).
- `vite.config.js` : `root = src/`. Pages : hub (`src/index.html`) et `src/games/<jeu>/index.html`. Un nouveau jeu = page dans `pages` + entrée dans `src/shared/games.js` (source unique du catalogue, du SEO et des planètes du hub).
- Code commun dans `src/shared/` (createRenderer, loop, Keyboard, Music, SoundBox, events/Emitter, loadTextures, canvasTexture, chrome). Ne pas dupliquer ces briques dans un jeu.
- Séparation stricte : tout dossier `core/` (hub, pixel) ne doit importer ni Three.js ni le DOM. Le rendu écoute les évènements émis par la logique (`Emitter`), documentés en tête du fichier de règles.
- Toujours ajouter un test dans `tests/` quand une règle change.
- Hub : repère x droite / y haut. Commandes : ↑ avancer, ↓ demi-tour, ←/→ tourner, Espace tirer. L'entrée en orbite ouvre une modale (`ui/OrbitModal.js`), le jeu est lancé uniquement via `SpaceGame.enterGame()`.
- PIXEL : axes X gauche/droite, **Y = hauteur** (0 = sol), Z = profondeur. Cartes finies bordées de murs, un fichier par niveau (`levels/levelN.js`). Aucun contrôle clavier (tout passe par le terminal), gravité obligatoire (`Rules.settle`).
- Pirates : paramètres de jeu dans `config.js`, un module par responsabilité (bateau, ennemis, bataille, carte, ui).
- Images/audio dans `public/` (servis à la racine). Notes d'origine et ressources non utilisées dans `docs/`.
- Test connu en échec depuis le projet d'origine : « objectif sandwich / tir » (PIXEL).
