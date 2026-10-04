/**
 * Données pédagogiques du jeu « Les Inventeurs » : pays, inventeurs, inventions, dates.
 * Fichier à modifier librement pour ajouter des pays ou des inventions (aucun code à toucher).
 *
 * iso        code pays à 2 lettres, doit exister dans worldGeo.js (voir public/images/world.svg)
 * name       nom affiché sur la carte
 * locative   « en France », « au Japon », « aux États-Unis »… (pour la phrase de livraison)
 * inventions liste de { inventor, invention, year, circa?, description }
 *   invention : avec son article (« le téléphone »)
 *   plural    true si l'inventeur est un groupe (« viennent d'inventer »)
 *   year      année (négatif = avant J.-C.), circa: true pour « vers »
 */
export const COUNTRIES = [
  { iso: 'FR', name: 'France', locative: 'en France', inventions: [
    { inventor: 'Blaise Pascal', invention: 'la machine à calculer (Pascaline)', year: 1642, description: 'Pour aider son père comptable, Pascal construit une machine à engrenages qui additionne et soustrait.' },
    { inventor: 'Louis Braille', invention: 'l\'alphabet Braille', year: 1829, description: 'Un système de points en relief qui permet aux personnes aveugles de lire avec les doigts.' },
    { inventor: 'Nicéphore Niépce', invention: 'la photographie', year: 1826, circa: true, description: 'Après des heures de pose, une plaque d\'étain garde l\'image de la vue depuis sa fenêtre.' },
    { inventor: 'Auguste et Louis Lumière', plural: true, invention: 'le cinématographe', year: 1895, description: 'Les frères Lumière projettent les premiers films devant un public payant, à Paris.' },
    { inventor: 'Louis Pasteur', invention: 'le vaccin contre la rage', year: 1885, description: 'Pasteur soigne avec succès le jeune Joseph Meister, mordu par un chien enragé.' },
  ] },
  { iso: 'IT', name: 'Italie', locative: 'en Italie', inventions: [
    { inventor: 'Bartolomeo Cristofori', invention: 'le piano', year: 1700, circa: true, description: 'Un clavier dont les marteaux frappent les cordes permet de jouer doucement ou fort, selon la touche.' },
    { inventor: 'Evangelista Torricelli', invention: 'le baromètre', year: 1643, description: 'Un tube de mercure renversé permet de mesurer le poids de l\'air.' },
    { inventor: 'Alessandro Volta', invention: 'la pile électrique', year: 1800, description: 'Un empilement de disques de cuivre et de zinc produit le premier courant électrique continu.' },
    { inventor: 'Guglielmo Marconi', invention: 'la radio (télégraphie sans fil)', year: 1895, description: 'Marconi envoie des signaux à distance sans aucun fil, près de Bologne.' },
  ] },
  { iso: 'DE', name: 'Allemagne', locative: 'en Allemagne', inventions: [
    { inventor: 'Rudolf Diesel', invention: 'le moteur Diesel', year: 1897, description: 'Un moteur à combustion très efficace, qui allume le carburant par la simple compression de l\'air.' },
    { inventor: 'Otto Lilienthal', invention: 'le planeur', year: 1891, description: 'Cet ingénieur réalise les premiers vols planés réguliers, en s\'inspirant des oiseaux.' },
    { inventor: 'Konrad Zuse', invention: 'le premier ordinateur programmable (Z3)', year: 1941, description: 'Une machine capable de suivre un programme, construite dans l\'appartement de ses parents à Berlin.' },
    { inventor: 'Johannes Gutenberg', invention: 'l\'imprimerie à caractères mobiles', year: 1450, circa: true, description: 'Des lettres en métal réutilisables permettent d\'imprimer des livres en grand nombre, à Mayence.' },
    { inventor: 'Karl Benz', invention: 'l\'automobile à moteur', year: 1886, description: 'Le brevet de la « Motorwagen » est déposé : c\'est la première voiture à essence.' },
    { inventor: 'Wilhelm Röntgen', invention: 'la radiographie (rayons X)', year: 1895, description: 'Röntgen photographie les os de la main de sa femme grâce à des rayons invisibles.' },
  ] },
  { iso: 'GB', name: 'Royaume-Uni', locative: 'au Royaume-Uni', inventions: [
    { inventor: 'John Logie Baird', invention: 'la télévision', year: 1926, description: 'Baird montre à Londres les premières images animées transmises à distance.' },
    { inventor: 'Isaac Newton', invention: 'le télescope à miroir', year: 1668, description: 'Un miroir remplace la lentille, ce qui permet de construire des télescopes plus puissants et plus courts.' },
    { inventor: 'Alexander Fleming', invention: 'la pénicilline', year: 1928, description: 'Une moisissure oubliée dans une boîte de culture détruit les bactéries : c\'est le premier antibiotique.' },
    { inventor: 'James Watt', invention: 'la machine à vapeur à condenseur séparé', year: 1769, description: 'Watt améliore la machine à vapeur, moteur de la révolution industrielle.' },
  ] },
  { iso: 'CH', name: 'Suisse', locative: 'en Suisse', inventions: [
    { inventor: 'Tim Berners-Lee', invention: 'le World Wide Web', year: 1989, description: 'Au CERN, il imagine un système de pages reliées entre elles : le Web est né.' },
    { inventor: 'Georges de Mestral', invention: 'le Velcro (bande auto-agrippante)', year: 1941, description: 'Après une promenade, il observe les fruits de bardane accrochés à son pantalon et s\'en inspire.' },
  ] },
  { iso: 'ES', name: 'Espagne', locative: 'en Espagne', inventions: [
    { inventor: 'Manuel Jalón', invention: 'la serpillière à essorage (fregona)', year: 1956, description: 'Un seau avec un système d\'essorage qui évite de se mouiller les mains pour laver le sol.' },
    { inventor: 'Narcís Monturiol', invention: 'le sous-marin Ictíneo', year: 1859, description: 'Un des premiers sous-marins capables de plonger et de remonter, construit à Barcelone.' },
    { inventor: 'Juan de la Cierva', invention: 'l\'autogire', year: 1923, description: 'Un aéronef à rotor libre qui ouvre la voie à l\'hélicoptère.' },
  ] },
  { iso: 'US', name: 'États-Unis', locative: 'aux États-Unis', inventions: [
    { inventor: 'Alexander Graham Bell', invention: 'le téléphone', year: 1876, description: 'La voix voyage par un fil électrique : Bell dépose le brevet du téléphone.' },
    { inventor: 'Samuel Morse', invention: 'le télégraphe électrique et le code Morse', year: 1837, circa: true, description: 'Des points et des traits envoyés par un fil permettent de transmettre des messages très loin.' },
    { inventor: 'Thomas Edison', invention: 'l\'ampoule électrique à filament durable', year: 1879, description: 'Après des milliers d\'essais, Edison trouve un filament qui éclaire pendant des heures.' },
    { inventor: 'Les frères Wright', plural: true, invention: 'l\'avion', year: 1903, description: 'Wilbur et Orville réalisent le premier vol motorisé et contrôlé, à Kitty Hawk.' },
  ] },
  { iso: 'CA', name: 'Canada', locative: 'au Canada', inventions: [
    { inventor: 'Joseph-Armand Bombardier', invention: 'l\'autoneige (motoneige)', year: 1937, description: 'Un véhicule à chenilles qui roule sur la neige, né dans le village de Valcourt.' },
    { inventor: 'Frederick Banting et Charles Best', plural: true, invention: 'l\'insuline', year: 1921, description: 'À Toronto, ils isolent l\'hormone qui permet de soigner le diabète.' },
  ] },
  { iso: 'MX', name: 'Mexique', locative: 'au Mexique', inventions: [
    { inventor: 'Luis Miramontes', invention: 'la pilule contraceptive', year: 1951, description: 'Ce jeune chimiste réalise à Mexico la synthèse de la molécule à la base de la pilule.' },
    { inventor: 'Guillermo González Camarena', invention: 'la télévision en couleur', year: 1940, description: 'Il invente un système qui permet de voir les images télévisées en couleur.' },
  ] },
  { iso: 'BR', name: 'Brésil', locative: 'au Brésil', inventions: [
    { inventor: 'Roberto Landell de Moura', invention: 'la transmission de la voix sans fil', year: 1900, description: 'À São Paulo, ce prêtre scientifique fait voyager la voix par les ondes.' },
  ] },
  { iso: 'AR', name: 'Argentine', locative: 'en Argentine', inventions: [
    { inventor: 'Juan Vucetich', invention: 'l\'identification par les empreintes digitales', year: 1891, description: 'Il crée la première méthode pour classer les empreintes digitales et identifier les personnes.' },
    { inventor: 'Luis Agote', invention: 'la transfusion sanguine avec conservation du sang', year: 1914, description: 'Grâce au citrate de sodium, le sang ne coagule plus et peut être transfusé sans donneur à côté.' },
    { inventor: 'László Bíró', invention: 'le stylo à bille', year: 1943, description: 'Le brevet du stylo à bille moderne, à encre épaisse qui sèche vite, est déposé en Argentine.' },
  ] },
  { iso: 'CN', name: 'Chine', locative: 'en Chine', inventions: [
    { inventor: 'Zhang Heng', invention: 'le sismographe', year: 132, description: 'Un vase de bronze avec des dragons qui lâchent une bille pour indiquer la direction d\'un tremblement de terre.' },
    { inventor: 'Cai Lun', invention: 'le papier', year: 105, circa: true, description: 'Fabriqué à partir de chiffons, d\'écorces et de filets de pêche, il remplace la soie et le bambou pour écrire.' },
    { inventor: 'Bi Sheng', invention: 'l\'imprimerie à caractères mobiles', year: 1040, circa: true, description: 'Il invente des caractères en terre cuite que l\'on peut assembler et réutiliser, bien avant Gutenberg.' },
  ] },
  { iso: 'JP', name: 'Japon', locative: 'au Japon', inventions: [
    { inventor: 'Hidetsugu Yagi', invention: 'l\'antenne Yagi (antenne de télévision en râteau)', year: 1926, description: 'Une antenne directive qui capte très bien les ondes radio et de télévision.' },
    { inventor: 'Momofuku Ando', invention: 'les nouilles instantanées', year: 1958, description: 'Des nouilles précuites qu\'il suffit de plonger dans l\'eau chaude.' },
    { inventor: 'Kokichi Mikimoto', invention: 'la perle de culture', year: 1893, description: 'Il réussit à faire fabriquer des perles par des huîtres élevées par l\'homme.' },
  ] },
  { iso: 'IN', name: 'Inde', locative: 'en Inde', inventions: [
    { inventor: 'Sushruta', invention: 'la chirurgie plastique', year: -600, circa: true, description: 'Ce médecin indien décrit comment reconstruire un nez, dans un traité de médecine très ancien.' },
    { inventor: 'Brahmagupta', invention: 'les règles de calcul avec le zéro', year: 628, circa: true, description: 'Le mathématicien indien traite le zéro comme un vrai nombre et explique comment calculer avec lui.' },
  ] },
  { iso: 'RU', name: 'Russie', locative: 'en Russie', inventions: [
    { inventor: 'Alexandre Popov', invention: 'le récepteur radio', year: 1895, description: 'Il présente un appareil qui capte les ondes de l\'orage, ancêtre du récepteur radio.' },
    { inventor: 'Dmitri Mendeleïev', invention: 'le tableau périodique des éléments', year: 1869, description: 'Il classe les éléments chimiques et laisse des cases vides pour ceux qu\'on n\'a pas encore découverts.' },
  ] },
  { iso: 'NL', name: 'Pays-Bas', locative: 'aux Pays-Bas', inventions: [
    { inventor: 'Willem Kolff', invention: 'le rein artificiel (dialyse)', year: 1943, description: 'Une machine qui nettoie le sang quand les reins ne fonctionnent plus.' },
    { inventor: 'Christiaan Huygens', invention: 'l\'horloge à pendule', year: 1656, description: 'Le balancier rend les horloges bien plus précises.' },
    { inventor: 'Hans Lippershey', invention: 'la lunette astronomique', year: 1608, description: 'Cet artisan lunetier dépose la première demande de brevet pour un instrument qui rapproche les objets lointains.' },
  ] },
  { iso: 'SE', name: 'Suède', locative: 'en Suède', inventions: [
    { inventor: 'Anders Celsius', invention: 'l\'échelle de température Celsius', year: 1742, description: 'Une échelle entre l\'eau qui gèle et l\'eau qui bout, divisée en 100 degrés.' },
    { inventor: 'Alfred Nobel', invention: 'la dynamite', year: 1867, description: 'Un explosif stable et maniable, utilisé pour percer des tunnels et des routes. Nobel créera plus tard les prix Nobel.' },
  ] },
  { iso: 'NO', name: 'Norvège', locative: 'en Norvège', inventions: [
    { inventor: 'Erik Rotheim', invention: 'la bombe aérosol', year: 1927, description: 'Un récipient sous pression qui diffuse un liquide en fines gouttelettes.' },
  ] },
  { iso: 'FI', name: 'Finlande', locative: 'en Finlande', inventions: [
    { inventor: 'Linus Torvalds', invention: 'le système Linux', year: 1991, description: 'Un étudiant d\'Helsinki écrit un système d\'exploitation libre, aujourd\'hui utilisé partout.' },
  ] },
  { iso: 'DK', name: 'Danemark', locative: 'au Danemark', inventions: [
    { inventor: 'Godtfred Kirk Christiansen', invention: 'la brique LEGO à tenons', year: 1958, description: 'Le système d\'emboîtement par tenons et tubes qui rend les briques solides et combinables à l\'infini.' },
  ] },
  { iso: 'HU', name: 'Hongrie', locative: 'en Hongrie', inventions: [
    { inventor: 'János Irinyi', invention: 'l\'allumette silencieuse', year: 1836, description: 'Une allumette qui s\'enflamme sans explosion : l\'ancêtre de nos allumettes.' },
    { inventor: 'Ernő Rubik', invention: 'le Rubik\'s Cube', year: 1974, description: 'Un professeur d\'architecture crée un casse-tête en cubes mobiles pour enseigner la géométrie.' },
  ] },
  { iso: 'TR', name: 'Turquie', locative: 'en Turquie', inventions: [
    { inventor: 'Al-Jazari', invention: 'les automates et horloges à eau', year: 1206, description: 'Cet ingénieur décrit des machines étonnantes dans son « Livre des procédés mécaniques ingénieux ».' },
  ] },
  { iso: 'EG', name: 'Égypte', locative: 'en Égypte', inventions: [
    { inventor: 'Imhotep', invention: 'la pyramide à degrés', year: -2650, circa: true, description: 'L\'architecte du pharaon Djoser construit la première grande pyramide, à Saqqarah.' },
    { inventor: 'Ibn al-Haytham', invention: 'la chambre noire et l\'optique moderne', year: 1021, circa: true, description: 'Au Caire, il explique comment la lumière entre dans l\'œil et fait naître les images.' },
  ] },
  { iso: 'IQ', name: 'Irak', locative: 'en Irak', inventions: [
    { inventor: 'Les Sumériens', plural: true, invention: 'l\'écriture cunéiforme', year: -3300, circa: true, description: 'Des signes en forme de coins gravés dans l\'argile : l\'une des plus anciennes écritures du monde.' },
  ] },
  { iso: 'ZA', name: 'Afrique du Sud', locative: 'en Afrique du Sud', inventions: [
    { inventor: 'Ferdinand Chauvier', invention: 'le nettoyeur de piscine (Kreepy Krauly)', year: 1974, description: 'Un petit robot qui se déplace au fond de la piscine et aspire les saletés.' },
    { inventor: 'Pettie Petzer et Johan Jonker', plural: true, invention: 'le Hippo Roller', year: 1991, description: 'Un bidon qui se fait rouler pour transporter beaucoup plus d\'eau qu\'un seau porté sur la tête.' },
  ] },
  { iso: 'AU', name: 'Australie', locative: 'en Australie', inventions: [
    { inventor: 'Lawrence Hargrave', invention: 'le cerf-volant à caissons', year: 1893, description: 'Sa structure en boîtes tient dans les airs et inspire les premiers avions.' },
    { inventor: 'L\'équipe du CSIRO', plural: true, invention: 'le Wi-Fi', year: 1992, description: 'Des chercheurs australiens mettent au point la technique qui permet les réseaux sans fil.' },
    { inventor: 'David Warren', invention: 'la boîte noire d\'avion', year: 1957, description: 'Elle enregistre les voix et les données de vol pour comprendre les accidents et améliorer la sécurité.' },
  ] },
  { iso: 'NZ', name: 'Nouvelle-Zélande', locative: 'en Nouvelle-Zélande', inventions: [
    { inventor: 'Colin Murdoch', invention: 'la seringue jetable', year: 1956, description: 'Une seringue en plastique à usage unique, plus hygiénique et facile à utiliser.' },
    { inventor: 'Bill Hamilton', invention: 'le jet-boat', year: 1954, description: 'Un bateau propulsé par un jet d\'eau, capable de naviguer dans des rivières très peu profondes.' },
  ] },
  { iso: 'KR', name: 'Corée du Sud', locative: 'en Corée du Sud', inventions: [
    { inventor: 'Jang Yeong-sil', invention: 'le pluviomètre', year: 1441, description: 'Un instrument en bronze qui mesure la quantité de pluie tombée, pour aider les paysans.' },
    { inventor: 'Le roi Sejong', invention: 'l\'alphabet coréen (hangeul)', year: 1443, description: 'Un alphabet logique, conçu pour que tout le monde apprenne à lire facilement.' },
  ] },
  { iso: 'BE', name: 'Belgique', locative: 'en Belgique', inventions: [
    { inventor: 'Ernest Solvay', invention: 'le procédé Solvay (fabrication de la soude)', year: 1861, description: 'Une méthode industrielle pour fabriquer la soude, utilisée pour le verre, le papier et le savon.' },
    { inventor: 'Adolphe Sax', invention: 'le saxophone', year: 1846, description: 'Ce facteur d\'instruments de Dinant mélange la puissance des cuivres et la douceur des bois.' },
  ] },
  { iso: 'CZ', name: 'Tchéquie', locative: 'en Tchéquie', inventions: [
    { inventor: 'Otto Wichterle', invention: 'la lentille de contact souple', year: 1959, description: 'Une lentille en gel qui reste souple et confortable sur l\'œil.' },
    { inventor: 'Prokop Diviš', invention: 'le paratonnerre', year: 1754, description: 'Ce prêtre installe une tige métallique reliée à la terre pour protéger les bâtiments de la foudre.' },
  ] },
  { iso: 'AT', name: 'Autriche', locative: 'en Autriche', inventions: [
    { inventor: 'Josef Madersperger', invention: 'la machine à coudre', year: 1814, description: 'Ce tailleur de Vienne construit une machine qui coud avec une aiguille percée à la pointe.' },
  ] },
  { iso: 'IE', name: 'Irlande', locative: 'en Irlande', inventions: [
    { inventor: 'Nicholas Callan', invention: 'la bobine d\'induction', year: 1836, description: 'Ce prêtre et physicien irlandais invente la bobine qui transforme un petit courant en forte tension.' },
  ] },
  { iso: 'GR', name: 'Grèce', locative: 'en Grèce', inventions: [
    { inventor: 'Des savants grecs', plural: true, invention: 'le mécanisme d\'Anticythère, un calculateur d\'astres', year: -100, circa: true, description: 'Un ensemble d\'engrenages en bronze qui prévoit les positions du Soleil et de la Lune.' },
  ] },
  { iso: 'PE', name: 'Pérou', locative: 'au Pérou', inventions: [
    { inventor: 'Les peuples des Andes', plural: true, invention: 'le quipu (cordelettes à nœuds pour compter)', year: -2500, circa: true, description: 'Des cordes nouées gardent en mémoire des nombres et des informations. Les plus anciennes ont été retrouvées au Pérou, et les Incas les ont utilisées jusqu\'à la conquête espagnole.' },
  ] },
  { iso: 'IL', name: 'Israël', locative: 'en Israël', inventions: [
    { inventor: 'Dov Moran', invention: 'la clé USB', year: 2000, description: 'Une petite mémoire que l\'on branche sur un ordinateur pour transporter ses fichiers.' },
  ] },
];

/** « vers 1450 », « en 1895 », « vers 3300 av. J.-C. » */
export function whenPhrase({ year, circa }) {
  const label = year < 0 ? `${-year} av. J.-C.` : String(year);
  return circa ? `vers ${label}` : `en ${label}`;
}
