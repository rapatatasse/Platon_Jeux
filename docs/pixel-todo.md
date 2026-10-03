je veux que tu me fasse une jeu avec  Three.js

Le jeu sera en 3D
Plusieurs evolution du jeu possible lors des passage de niveau

Au debut vue du jeux par dessus.

Grand plateau grille. vue assez simple un peut rero mais tres intuitif.

histoire : on dirige un pixel rouge qui va grandire en touchant d'autre pixel coloré petit a petit on pourra optimiser joueur en le rendant plus gros  et plus haut dans les niveau suivant afin de se developper plus vite mais aussi de ne pas se faire manger.

le but est d'apprendre a faire des fonctions et des boucles en js.

Le joueur dirige un pixel rouge centrale qui se deplace sur le plateau.
creer une fonction qui permet de generer un niveau aleatoire avec placemen statique pour le 1ere niveau des pixel.
Creer des fichier séparer autant que possible afin par la suite de gere l'interface graphique et les diff logique metier.


## 1ere niveau
On arrive sur une vue en 3D sur un plateau plat de 100 pixel par 100 pixel.
On peut direger le pixel rouge centrale qui se deplace sur le plateau le plateau ne dois pas avoir de limite le pixel rouge reste au centre et se creer au fure et a mesure du deplacement.
Pour diriger le pixel rouge nous avons acces a un fenetre dans le cote droit ou l'on peux soit :

- ecrire directement dans le terminal
- creer des fonction JS que l'on peux enregistrer et lancer par un bouton dans ce cas la fonction est appeller dans le terminal 


### Convention des axes (la même partout : terminal, fire, moveyellow, CubesOffsets)
- X = gauche (-1) / droite (+1)
- Y = HAUTEUR : 0 = posé au sol, 1 = un cran au-dessus, etc. (jamais négatif : rien sous le sol)
- Z = profondeur sur le plateau : -1 = vers le haut de l'écran, +1 = vers le bas de l'écran (comme un canvas)
Le plateau est le plan X/Z. Le pixel rouge est toujours en Y = 0 : on ne peut pas monter ou descendre
en se déplaçant, seul l'empilement des cubes jaunes utilise Y.
Un cube ne flotte jamais : s'il n'a rien sous lui en Y-1 il retombe (gravité).

Le terminal accepte l'array suivante :
[x, z, fire, moveyellow]
x doit être -1, 0 ou 1 et z doit être -1, 0 ou 1 : cela déplace le pixel rouge et les pixels jaunes rattachés à lui
(le déplacement n'a pas de composante Y).

exemple : on va à droite seulement
[1, 0]
exemple : on va vers le bas de l'écran seulement
[0, 1]
exemple : on va à droite et on tire à gauche
[1, 0, [-1, 0, 0]]
exemple : on ne bouge pas et on tire vers le haut (en Y, au-dessus de nous)
[0, 0, [0, 1, 0]]

On peut récupérer du terminal à tout moment 2 variables :
- BulletsCount = nombre de pixels balle
- CubesOffsets = localisation des pixels jaunes par rapport au pixel rouge (le rouge est l'origine 0,0,0)
    exemple :
    const CubesOffsets = [
    { x: 0, y: 1, z: 0 },   // Juste au-dessus du rouge (empilé)
    { x: 0, y: 2, z: 0 },   // Deux crans au-dessus
    { x: 0, y: 0, z: 1 },   // Devant le rouge, au sol (vers le bas de l'écran)
    { x: 0, y: 0, z: -1 },  // Derrière le rouge, au sol (vers le haut de l'écran)
    { x: -1, y: 0, z: 0 },  // À gauche du rouge, au sol
    { x: 1, y: 1, z: 0 }    // À droite ET un cran plus haut : ne tient que si { x: 1, y: 0, z: 0 } existe, sinon il tombe
    ];
    { x: 0, y: -1, z: 0 } est INTERDIT : y < 0 = sous le sol -> message d'erreur.
Le pixel rouge ne peut pas changer de place, il n'est pas prévu dans les variables.

fire = [x, y, z] : tire une balle dans la direction x, y, z (chaque valeur -1, 0 ou 1 ; y = vers le haut/bas en hauteur)
moveyellow = [id, [x, y, z], ...] : indique quels pixels de CubesOffsets sont déplacés et leur nouvel offset {x, y, z}
    exemple : [0, 0, null, [0, [0, 1, 0]]]  -> le cube n°0 vient se poser au-dessus du rouge
    exemple : [0, 0, null, [0, [1, 0, 0], 1, [-1, 0, 0]]]  -> le cube 0 à droite, le cube 1 à gauche, au sol

Si apres tout les deplacements un cube jaune n'est plus attache au groupe alors il est detruit (prevoir bruit et animation de destruction).

mettre ses exemple dans une fonction test en debut de jeu.


mettre des message d'erreure si la sortie n'est pas bonne.

Dans le premier niveau il y a d'autre pixel jaune et des pixel violet et blanc qui bloque le deplacement des pixel.

Lorsque le joueur touche un pixel jaune celui ci s'ajoute par dessus.(prevoir bruit et animation).

Lors d'un tire le pixel balle se deplace dans la direction x,y,z et detruit le 1er pixel qu'il rencontre  si il y en a un. On ne peux tirer que seulement si bullet > 0 sinon ne fait rien.(prevoir bruit et animation de destruction).

lorsque l'on avance et touchons un pixel violet cela detruit le pixel rouge le joueur a perdu, s'il touche un pixel jaune celui ci est détruit.
si le pixel violet est entourer par 2 cotés ( gauche ou droite, devant ou deriere) par des pixels jaune ou rouge il est detruit mais si coupe la forme seul les pixel rattaché au pixel rouge reste les autres sont detruit
Si le pixel violet touche une pixel jaune sur lequel un autre pixel jaune est present celi si le remplace et permet de combler le trou. cela est viable quel que soit le niveau des pixel.




La destruction d'un pixel violet permet de gagner un pixel balle (Bullet increment BulletsCount de 1)
Si un pixel 




plus on avance dans le temps plus cela doit creer des difficulte :

Création de plusieur pixel violet regroupé puis aligné puis aligner en hauteur en hauteur.




