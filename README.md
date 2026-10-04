# Platon Jeux

Plateforme de jeux éducatifs en Three.js, par [Platon Formation](https://www.platonformation.com).
La page d'accueil est elle-même un jeu : on pilote un vaisseau sur une carte du ciel (style croquis de Léonard de Vinci) et on entre dans l'orbite d'une planète pour lancer le jeu correspondant.

| Planète | Jeu | Contenu |
|---|---|---|
| PIXEL | `/games/pixel/` | Apprendre le JavaScript (fonctions, boucles) en pilotant un pixel en 3D |
| Pirates des Tables | `/games/pirates/` | Apprendre les multiplications en abordant des navires |
| Les Inventeurs | `/games/inventeurs/` | Géographie et histoire des inventions : livrer 20 inventions en 5 minutes en volant vers le bon pays |
| 2 autres | — | « En téraformation » (bientôt) |

## Commandes

Prérequis : Node.js 20+.

```bash
npm install        # une seule fois
npm run dev        # développement : http://localhost:5173
npm test           # tests de la logique (node --test)
npm run build      # génère dist/
npm start          # sert dist/ en production (port = variable PORT, 3000 par défaut)
```

`npm serve` n'existe pas : en local, utiliser `npm run dev`, ou `npm run build` puis `npm start` pour tester la version de production.

## Contrôles

- Hub : **↑** avancer, **↓** demi-tour, **←/→** tourner, **Espace** tirer. Entrer dans l'anneau d'une planète ouverte ouvre une modale où Platon présente le jeu (bulle de BD) avec les boutons « Entrer dans le jeu » (Entrée) et « Rester dans l'espace » (Échap).
- Les Inventeurs : mêmes commandes que le hub (**↑** avancer, **↓** demi-tour, **←/→** tourner), touches **1 à 5** pour choisir le pays, **Entrée** pour continuer.
- Pirates : flèches (ou manette), `Échap` = pause.
- PIXEL : tout passe par le terminal à droite (`help()`).

Dans le hub : 5 PV (régénération lente, retour à Agora sans pénalité si 0), astéroïdes à détruire, et 2 vaisseaux ennemis maximum qui chassent le joueur avec des tirs lents et imprécis.

## Structure

```
src/
  index.html            page d'accueil (hub) + catalogue + section Platon Formation
  hub/                  le jeu d'accueil
    core/SpaceGame.js   logique pure (sans Three.js ni DOM) -> testée dans tests/hub.test.js
    render/             Three.js + dessins canvas « croquis » (sketch.js)
    ui/                 HUD et guide Platon
  games/
    pixel/              core/ (logique pure), render/, ui/, api/
    pirates/            modules ES (config, bateau, ennemis, bataille, carte, ui…)
    inventeurs/         main.js (RÉGLAGES en tête de fichier), inventions.js (pays, inventeurs, dates),
                        worldGeo.js (généré depuis world.svg), core/ (logique pure), render/
  shared/               code commun : createRenderer, loop, Keyboard, Music, SoundBox, ShipPhysics,
                        sketch (dessins « croquis »), theme.css/js (style parchemin commun),
                        events (Emitter), loadTextures, canvasTexture, chrome (barre « retour »),
                        games.js (catalogue = source unique)
public/                 images/ (vaisseau, Platon, bateaux) et audio/
docs/                   notes d'origine (todo), présentation PIXEL, ressources non utilisées
scripts/buildWorld.mjs     world.svg -> src/games/inventeurs/worldGeo.js
vite-plugins/platonSeo.js   catalogue HTML, JSON-LD, sitemap.xml, robots.txt
server.js               serveur Node de production
tests/                  pixel.test.js, hub.test.js
```

Règle d'architecture : chaque `core/` ne dépend ni de Three.js ni du DOM ; le rendu écoute les évènements émis par la logique.

## Jeu « Les Inventeurs » : régler et enrichir

- **Niveaux** : tableau `levels` du bloc `GAME` (niveau 1 normal ; 2 boussole cassée, fumée et aiguille folle mais km exacts ; 3 carte sans noms ni rond de destination et boussole réduite aux km, via `compass: 'ok' | 'broken' | 'kmOnly'`). Accès direct : `?niveau=2`. Chaque niveau peut redéfinir `deliveriesToWin` et `timeLimitSec`.
- **Règles** (nombre d'inventions, durée, nombre de pays proposés, vitesse du vaisseau, zoom) : bloc `GAME` au début de `src/games/inventeurs/main.js`.
- **Contenu pédagogique** : `src/games/inventeurs/inventions.js`. Pour ajouter une invention, ajouter une entrée `{ inventor, invention, year, description }` à un pays ; pour un nouveau pays, ajouter son code ISO à 2 lettres (il doit exister dans la carte).
- **Carte** : `public/images/world.svg` (Simplemaps, licence MIT, mention d'attribution conservée). Si elle change : `node scripts/buildWorld.mjs` régénère `worldGeo.js`. Aucun autre fichier de carte n'est nécessaire.

## Ajouter un jeu

1. Créer `src/games/<jeu>/index.html` et `main.js` (utiliser `shared/` : `createRenderer`, `startLoop`, `Keyboard`, `Music`, `mountGameChrome`).
2. Déclarer la page dans `vite.config.js` (`pages`).
3. Ajouter l'entrée dans `src/shared/games.js` (`status: 'open'`, position de planète). Le hub, le catalogue, le JSON-LD et le sitemap se mettent à jour tout seuls.
4. Pour transformer une planète « en téraformation » : passer son `status` à `'open'` et renseigner `url`, `tagline`, `description`, `audience`.

## Déploiement Infomaniak (Node.js)

```bash
SITE_URL=https://votre-domaine.tld npm run build
npm start
```

- `SITE_URL` (adresse publique finale, sans slash final) active `canonical`, `og:url`, `og:image`, `sitemap.xml` et l'URL dans `robots.txt`. Sans lui, ces éléments sont omis.
- Envoyer `dist/`, `server.js` et `package.json` ; démarrer avec `npm start` (Infomaniak fournit `PORT`). Aucune dépendance d'exécution : `node server.js` suffit.
- `server.js` ajoute cache long sur les fichiers hachés, gzip et en-têtes de sécurité (CSP, nosniff…).

## Référencement (Google)

- Titre, description, Open Graph, `lang="fr"` et données structurées (`EducationalOrganization`, `WebSite`, `ItemList` de `VideoGame`).
- Le catalogue est du vrai HTML (indexable) généré depuis `games.js`, y compris sans clavier ni WebGL.
- Liens sortants vers www.platonformation.com (nav, section dédiée, pied de page).
- À faire côté Platon Formation : lien depuis platonformation.com vers ce site, inscription à Google Search Console (soumettre `sitemap.xml`).

## Propriété intellectuelle

Le code envoyé au navigateur ne peut jamais être totalement caché. Mesures en place : pas de source maps, code minifié, mention « Tous droits réservés », `"license": "UNLICENSED"`. Options pour aller plus loin :

1. **Obfuscation au build** (ex. `vite-plugin-javascript-obfuscator`) : freine la copie, au prix de la taille et des performances.
2. **Logique côté serveur** : garder les règles sensibles (ex. génération de niveaux) dans Node derrière une API.
3. **Licence explicite** dans le dépôt et dans les CGU, plus un dépôt daté (enveloppe Soleau INPI, ou dépôt chez un huissier/APP).
4. **Dépôt privé** et déploiement uniquement du dossier `dist/`.

## Points connus

- Un test de PIXEL échoue déjà dans le projet d'origine : « objectif sandwich / tir ».
- Pas de commandes tactiles dans le hub (le catalogue permet de lancer les jeux directement).


## installe avec SSH infomanik
1
Lancez un terminal.
2
Envoyez vos fichiers à l'aide de la commande scp en indiquant la source et la destination.
Commande SCP
```
scp -r localmachine/path_to_the_file H2HebszrhbX_tmp_1791141122@57-117936.ssh.hosting-ik.com:sites/jeux.
->
scp -r "C:/Users/user/Documents/02 cours stagiaires/00 Code/Platon Jeux/." "H2HebszrhbX_tmp_1791141122@57-117936.ssh.hosting-ik.com:sites/jeux/"
```
platonformation.com
Source locale: “localmachine/path_to_file” - à remplacer par l'emplacement de vos fichiers dans la commande scp ci-dessus.
Utilisateur + serveur:  H2HebszrhbX_tmp_1791141122@57-117936.ssh.hosting-ik.com
Chemin de destination:  sites/jeux.platonformation.com
3
Saisissez le mot de passe pour finaliser l'envoi des fichiers
Mot de passe
334hcclcVR^mrH0vkd
Une fois fait, revenez sur cette page et lancez l'installation.