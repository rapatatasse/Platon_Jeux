## Jeu pixel :
- Rajouter un mode test niveau ou l'on ne peux lancer qu'une fonctioncomme dans coding game pour voir si les objectif sont atteint sans que le joueur puisse intervenir en placant les objet differement
garder dans le cache les reussite des niveau et mettre une modale pour lister les niveau et le nombre de test reussi par niveau


- rajouter varibale scanner 
lorsque l'on interroge le scan il renvoi un json de cette forme scan les bloc proche du pixel rouge avec cette logique Le niveau 1 donne une portée de 1 case.
Chaque jaune au dessus du rouge ajoute +1 de portée.:
```
[
    {
        "type": "violet",
        "coordinates": [[0,1],[1,-1]] //signifie qu'il y a deux pixel violet a cote du pixel rouge
    },
    {
        "type": "jaune",
        "coordinates": [[3,0]] //signifie qu'il y a un pixel jaune a 3 case de distance du pixel rouge est visible si seulement dexu pixel jane au dessu sdu pixel rouge
    }
]
```
- modifier bouton help qui ouvert une nouvelle page avec explication des fonctionnalités plus mettre une bibliotheque standart qui excplique les base du JS (les varibale les condition les fonctions...)


- Refaire les niveau dans cette logique :
NIVEAU 1 :
permet de tester la recuperation de la varible Gates et de se deplacer en fonction avec  fonction run(x, z)
juste se deplacer vers une porte positionner plus haut a droite.
test 1 : mettre la porte a un autre endroit
test 2 : calculer le nombre de pas necessaire pour atteindre la porte

Niveau 2 :
couloir en L qui tourne simpleavec mur et porte au bout largeur du couloir 5 case.
test 1 : mettre la porte a un autre endroit
test 2 : mettre le couloir qui tourne dans un autre sens
test 3 : calculer le nombre de pas necessaire pour atteindre la porte

Niveau 2 :
labyrinthe simple avec un seul couloir en serpent avec porte au bout 
but voir si arrive par condition a changer de direction si son pixel n'avance pas afin de ne pas rester bloquer.

test 1 : mettre la porte a un autre endroit
test 2 : mettre le labyrinthe dans un autre sens
test 3 : calculer le nombre de pas necessaire pour atteindre la porte

Niveau 4 : 
permet de tester l'interrogation du scanner
et aller recupere 8 cube jaune

test 1 : mettre les 8 cube jaune a un autre endroit
test 2 : mettre des murs entre les cube jaune et le pixel rouge

Niveau 5 : 
tester le tir sur les cube violet on a une balle
aller a la porte sans toucher les cube violet 
mettre les cube violet en ligne qui barre le passage pour aller jusqu'a la porte

test 1 : mettre le pixel rouge en bas a gache et porte en haut a droite


Niveau 6 : 
Multi kill on 3 balles : 
tirer sur les 3 cube violet qui sont empilés les uns sur les autres pour les faire tomber et aller a la porte

test 1  : mettre 4 cube viollet et 4 balles

Niveau 7 : 
Faire une croix avec pixel jaune jeu commande avec rouge et 8 jaune au dessus de lui
permet de tester CubesOffsets et de changer leur placement avec moveyellow

Niveau 8 : 
tuer un pixel violet avec ecrassement.
jeu 3*3 case pixel violet à droite a deux de distance
commence le jeu avec pixel rouge et deux pixel jaune au dessus de lui

test 1 : mettre le pixel violet a gauche
test 2 : mettre le pixel violet en haut a droite


Niveau 9 :
tir en mouvement : 
debut avec 
tirer sur les cube violet qui defilent de droite a gauche et rebondisse sur la paroie.
pas besoin de se deplacer mais de tirer sur le cube violet en sachant que le cube bonge avant l'action du joueur.
debut du jeux avec 10 balles et 3 viollet a tuer

test 1 : mettre 2 cube viollet et 2 balles
