creer un mini jeu de de pirates avec Three.js

logique du jeux possiblite de se deplacer avec les fleche  du clavier ou le jostique d'une manette le petit navire.

creer dans un fichier JS par des varibale de vistesse pour controler la vistesse de deplacement et de rotation.


creer en bas a droite une carte qui montre la position du bateau dans la grande carte.

on commence le jeu avec une map de 100x100 et le bateau au centre. 
1ere bateau est celui ci images\bateaux\bateau1.png (il est direction vers le haut)

fleche de l'avant fais avancer le bateau 
fleche de derriere fais reculer le bateau 
fleche de gauche fais tourner le bateau a gauche 
fleche de droite fais tourner le bateau a droite 

les autre bateau sont disposer aléatoirement sur la carte et avance doucement aléatoirement.

lorsque le bateau s'approche trop près d'un autre bateau, il y a une bataille..

Bataille : 
le but est de resoudre des multiplications pour gagner la bataille.
bateau de niveau 1 = multiplication de 2
bateau de niveau 2 = multiplication de 3
bateau de niveau 3 = multiplication de 4
etc...
le joueur devra resoudre 1 multiplication en 10 secodes

lorsque l'on gagne une bataille, le bateau ennemi est detruit et le joueur gagne 10 points.
lorsque l'on perd une bataille, le joueur perd 10 points.
tous les 50 points, le joueur monte d'un niveau et l'image de sont bateau passe au niveau superieure.

rajoute le maximum de chose pour que le jeu soit stimulant et amusant.
tu peux me faire de proposition.

differencie bien les fichier js par exemple : 
- main.js : fichier principal
- bateau.js : fichier pour la logique du bateau
- bataille.js : fichier pour la logique de la bataille
- carte.js : fichier pour la logique de la carte
- etc...
