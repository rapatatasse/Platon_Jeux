Problèmes
#	Gravité	Constat	Correctif

S2	Faible (jouabilité)	Une boucle infinie (while(true){}) fige l'onglet : le bouton STOP vide seulement la file de commandes.	Avec un Worker, l'exécution peut être arrêtée via worker.terminate()après un délai de 1 à 2 s.
S3	Faible	HSTS absent.	Strict-Transport-Security: max-age=31536000. N'ajouter includeSubDomainsqu'après vérification des autres sous-domaines.
S4	Élevée (domaine platonformation.com)	Ni SPF ni DMARC alors que la messagerie est sur Google Workspace (MX Google). Pas de clé DKIM trouvée au sélecteur google. N'importe qui peut envoyer des emails usurpant @platonformation.com.	Ajouter v=spf1 include:_spf.google.com ~all, activer DKIM dans la console Google, puis _dmarc en p=none avant de durcir.
S5	Faible	Pas d'enregistrement CAA.	Ajouter 0 issue "letsencrypt.org".
S8	Info	La CSP pourrait être complétée : base-uri 'self', form-action 'self', object-src 'none'. style-src 'unsafe-inline' reste toléré. Pas de security.txt. three.js est en r170 : aucune CVE connue, mise à jour conseillée.	Ajouts simples.



PIXEL n'a presque aucun contenu indexable. Le HTML ne contient que des conteneurs vides : pas de H1, pas de texte, pas d'image. Une fois le JS exécuté, on n'obtient que l'interface du terminal (~690 caractères). Ajouter une section HTML statique sous le jeu : un H1 (« PIXEL — apprendre le JavaScript en jouant »), ce qu'on apprend (fonctions, boucles), comment jouer, les niveaux, une FAQ et des liens vers les autres jeux.
Pas de version canonique, d'où du contenu dupliqué. /games/pixel, /games/pixel/, /games/pixel/index.html, /index.html et toute URL avec paramètres répondent 200. Ajouter <link rel="canonical"> sur chaque page et rediriger en 301 vers la version avec slash final.
PIXEL est injouable sur mobile. À 375 px de large, la scène 3D fait 0 px et le panneau latéral (420 px) déborde horizontalement. Google indexe la version mobile en priorité. Empiler la scène et le panneau sous 768 px, ou au minimum afficher un message « jouable uniquement sur ordinateur ».
Pas de sitemap.xml, ni de ligne Sitemap: dans robots.txt. Le site principal n'en a pas non plus (404).
Le site principal ne renvoie pas vers les jeux : aucun lien vers jeux.platonformation.com sur la page d'accueil de www. Ajouter un lien dans le menu ou le pied de page.
Priorité moyenne

Partage social : PIXEL n'a ni Open Graph, ni Twitter Card, ni JSON-LD. L'accueil n'a ni og:image, ni og:url, ni twitter:card, donc les partages s'affichent sans image. Créer une image 1200×630 par jeu.
Pas de favicon : 404 sur /favicon.ico, ainsi que sur apple-touch-icon et le manifest. Le favicon apparaît dans les résultats Google.
JSON-LD incomplet : les VideoGame n'ont ni url, ni image, ni gamePlatform/applicationCategory, ni offers (price: 0). L'organisation n'a ni logo ni sameAs. Ajouter un JSON-LD VideoGame sur chaque page de jeu.
Longueurs : le title de l'accueil fait 97 caractères (tronqué vers 60) et la description 189 (au-delà de ~160). Ceux de PIXEL sont corrects.
Page 404 : elle renvoie du text/plain brut. Faire une vraie page HTML avec des liens vers les jeux.
Priorité basse

Poids des fichiers :
vaisseau.png pèse 305 Ko : en WebP ou AVIF, viser moins de 50 Ko.
Les 3 polices font 157 Ko : sous-ensembles et preload possibles.
Les MP3 font ~3,8 Mo chacun.
Les requêtes partielles (Range) ne sont pas gérées : le serveur renvoie 200 au lieu de 206. Or Safari/iOS exige ces requêtes pour l'audio, donc la musique risque de ne pas jouer sur iPhone. À vérifier sur un vrai appareil.
Cache : pas d'ETag ni de Last-Modified sur le HTML, donc pas de réponses 304. Les images sont en cache 1 h seulement. Les fichiers sont compressés en gzip, pas en brotli.
Accessibilité :
Les champs de saisie n'ont pas de label : terminal, arguments, zone de code.
Un H2 vide se trouve dans la fenêtre de l'accueil.
Le contraste de l'accueil est correct.
Référencement par les IA : ajouter un llms.txt qui présente les jeux, le public visé et les compétences travaillées.##