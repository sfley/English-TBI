# English TBI — bêta locale 3 pour Windows

Cette bêta rassemble la préparation pédagogique, les jeux et les impressions dans
un même parcours. Les données restent sur votre ordinateur. Le site publié sur La
Forge reste indépendant : GitLab Pages ne peut pas exécuter le serveur local Python.

## Installer ou mettre à jour

1. Téléchargez le ZIP de cette branche, puis clic droit > **Extraire tout**.
2. Pour une mise à jour, fermez l’ancienne application. **Copiez son dossier
   `donnees_locales` en entier dans le nouveau dossier**, à côté de `DEMARRER.bat`.
   Gardez l’ancienne installation jusqu’à vérification. Ne copiez pas `.venv`.
3. Double-cliquez sur **DEMARRER.bat**. Python 3.10 ou plus doit être installé
   (https://www.python.org/downloads/windows/).
4. La première installation des dépendances utilise Internet. Ensuite, laissez
   la fenêtre du lanceur ouverte pendant l’utilisation de l’application.

Les thèmes et les préparations des versions précédentes sont conservés. Les anciennes
préparations par thème sont récupérées comme séances indépendantes, sans modifier leurs
fichiers d’origine. Les nouvelles informations pédagogiques sont facultatives.

## Retrouver et lancer une séance

L’**Accueil** montre les séances directement sous leur séquence. Chaque ligne propose
**Préparer · Jouer · Imprimer**. Cliquez sur **Jouer** pour démarrer immédiatement avec
les cartes enregistrées, dans la dernière activité utilisée sur ce navigateur.
Le bouton **Reprendre** retrouve la dernière séance utilisée.

La recherche porte sur le nom de séance, la séquence et l’objectif. La recherche et
la position dans la page sont conservées au retour, si le navigateur autorise son
stockage local. L’application fonctionne aussi quand ce stockage est bloqué.

Les quatre menus restent stables : **Accueil · Préparer · Jouer · Imprimer**.
Depuis une séance, les trois derniers conservent cette séance. Sans séance ouverte,
Jouer et Imprimer vous invitent à choisir une séance sur l’accueil.

Les actions secondaires sont dans **⋯** : déroulé, duplication, déplacement et
suppression. Supprimer demande une confirmation. Supprimer une séquence garde ses
séances indépendantes, leurs cartes, leurs documents communs et leurs critères de
réussite hérités. Aucun thème n’est supprimé et aucune corbeille n’est ajoutée à l’interface.

## Préparer une séquence

**Nouvelle séquence** ouvre une fiche : titre, niveau, projet final et objectif commun.
Le bloc repliable des objectifs permet de renseigner :

- entrée culturelle ;
- activités langagières ;
- lexique, structures et phonologie ;
- critères de réussite et notes personnelles.

Les documents communs sont accessibles dans les séances. Vous pouvez aussi joindre
votre fiche de préparation existante en PDF ou par un lien.

Après l’enregistrement, retrouvez les séances sur la fiche de séquence. Les suggestions
**Découvrir · Comprendre · S’entraîner · Réaliser le projet** préremplissent une nouvelle
séance ; vous choisissez ses cartes et adaptez son déroulé. Elles n’imposent ni un
nombre de séances ni une progression officielle. La place de l’écrit dépend du cycle.

## Préparer une séance sur une seule page

Cliquez sur le nom d’une séance ou sur **Préparer**. La fiche réunit :

1. nom, séquence, objectif du jour et phrase modèle ;
2. consigne, durée, suivi, critères et notes dans un bloc repliable ;
3. cartes des thèmes choisis, avec le compteur de sélection ;
4. documents et liens, y compris ceux communs à la séquence ;
5. étapes du déroulé, facultatives et réordonnables.

Une séance utilise **2 à 60 cartes**, provenant d’un ou plusieurs thèmes. **Choisir ce
nombre** effectue le tirage pendant la préparation. Les images et les sons sont
copiés dans la séance : modifier un thème ne change pas une séance déjà préparée.
La commande **Actualiser** reprend volontairement les modifications des thèmes.

**Enregistrer** reste sur la fiche et confirme la sauvegarde. **Enregistrer et jouer**
lance le jeu directement. Les modifications non enregistrées déclenchent une
confirmation avant de quitter la page. Dupliquer copie les cartes et le déroulé.

## Suivre le déroulé en classe

Le raccourci **Déroulé** présente les étapes dans l’ordre : **Précédent · Suivant**.
Chaque étape peut afficher une consigne pour une activité sans écran, ouvrir l’un des
jeux ou présenter un document / lien. Le modèle **Rituel → Découverte → Entraînement →
Bilan** est entièrement modifiable. Les durées sont indicatives : aucun minuteur
ne fait passer automatiquement à l’étape suivante.

Le déroulé reprend à la dernière étape consultée sur ce navigateur. La phrase modèle
et les critères de réussite restent accessibles. Les productions orales sont validées
par l’enseignant ; l’application ne fait pas de reconnaissance vocale ni d’évaluation
individuelle automatique.

## Documents et liens

Depuis l’accueil ou **Préparer → Documents et liens**, retrouvez les documents des
thèmes, séquences, séances et étapes. Recherchez un titre ou une préparation, filtrez
par type et par thème, puis ouvrez le document ou associez-le à une séance existante.

Dans la préparation d’une séance, **Ajouter ou organiser les documents et liens**
permet d’importer un fichier ou de saisir un lien HTTP/HTTPS. Types disponibles :
chanson, vidéo, jeu en ligne, fiche de préparation, autre. Les fichiers acceptés sont
MP3, MP4, WebM, OGG et PDF, jusqu’à 64 Mo. Les documents déjà ajoutés à un thème peuvent
être repris. Le titre peut être renommé et l’ordre ajusté.

Les liens externes s’ouvrent à votre demande dans un nouvel onglet. Ils ne sont pas
mis en cache : Internet peut être nécessaire. Les fichiers importés sont conservés
sur le PC. Aucun média ne démarre au chargement d’une page ; une seule lecture locale
peut fonctionner à la fois. Les lectures s’arrêtent au changement de page ou d’étape.

## Jouer : onze activités

Les sept activités d’origine restent disponibles : Visual Board, Listen, What’s
Hidden?, Memory Match, Sequence, What’s Missing?, True or False.

Quatre activités complètent cette bêta :

- **Bingo au TBI** : tirage sonore sans répétition, image masquée puis révélée,
  historique et fin du tirage. Utilisez les grilles papier de la même séance.
- **Défi oral** : nommer l’image ou réutiliser la phrase modèle. L’enseignant valide
  et fait passer à la carte suivante ; le mot et le son peuvent être révélés.
- **Sondage de classe** : compter les réponses en touchant les cartes, afficher les
  barres et annuler la dernière réponse. Aucun nom d’élève n’est enregistré.
- **Défi par équipes** : deux équipes alternent ; validation +1 ou passage sans point.
  Une protection évite de compter deux réponses lors d’un double clic rapide.

Scores, sondages et tirages sont temporaires et repartent à zéro après rechargement.
Les nouvelles activités utilisent les cartes et sons de la séance enregistrée.

La barre de jeu conserve le choix d’activité, le plein écran et le retour à la séance.
Dans les activités d’origine, **Réglages** reste centré et défile si nécessaire.
**Documents** ouvre un panneau sur place. Son ouverture interrompt les sons et
minuteurs ; sa fermeture réinitialise la manche de l’activité d’origine afin de
reprendre avec un état cohérent. Le lien vers le déroulé retrouve la bonne étape.

## Imprimer : neuf supports

Les cartes de la séance sont reprises automatiquement. Choisissez le support, puis
**Préparer les pages → Imprimer / Enregistrer en PDF**.

| Support | Présentation |
| --- | --- |
| Flashcards | Planche économique élèves ou 2, 4, 6, 8 grandes cartes par A4 |
| Loto | 4, 6 ou 9 cases, deux grilles par page, jusqu’à 30 grilles |
| Dominos image–mot | Une chaîne où chaque mot correspond à une autre image |
| Cartes à plier | Image et mot côte à côte, à découper, plier et coller dos à dos |
| Mini-livre | Couverture et petites pages numérotées, à découper et agrafer |
| Fiche élève | Relier, entourer, numéroter sous la dictée ou écrire |
| Cartes de manipulation | Petites cartes à découper pour trier et jouer |
| Planche enseignant | Toutes les cartes sur une page, avec la phrase modèle |
| Fiche de préparation | Objectifs, déroulé, cartes, documents et critères |

La planche économique garde **3 séries de 18 cartes sur une A4** ; 24 séries des
17 fruits font 8 pages. Les séances plus longues sont réparties en parties sans perdre
de cartes. Les autres supports sont générés une fois : utilisez le nombre de copies
de la fenêtre d’impression pour distribuer plusieurs exemplaires.

Réglages d’impression : **A4 portrait, échelle 100 %, sans en-têtes ni pieds de page**.
Les cartes à plier utilisent une impression simple face ; pas de recto verso automatique.
Pour entourer ou numéroter, l’enseignant choisit les mots à dicter. Le mini-livre est
un ensemble de pages à découper, sans imposition pour pliage en livret.

## Thèmes, images et voix

**Préparer → Thèmes et cartes** ouvre les deux thèmes fournis et les thèmes personnels.
Images PNG/JPEG/WebP, redimensionnées à **187 × 187 pixels** sans déformation.
Les sons sont générés avec gTTS ou importés en MP3. Les fichiers sont rangés dans
`flashcards/nom-du-theme/` et `audio/nom-du-theme/`, puis `cards.js` est actualisé.
Les originaux et archives précédentes restent conservés dans `donnees_locales`.

Le TTS nécessite Internet et envoie les mots à Google Translate, sans compte ni clé.
Les certificats HTTPS restent vérifiés. Si le service est indisponible, les cartes
sont conservées ; vous pouvez importer les MP3. L’export/import ZIP d’un thème contient
ses cartes et ses voix, pas les séquences ou les documents associés.

## Sauvegarder tout le travail

Sur l’accueil, **Sauvegarder tout** télécharge un ZIP contenant `donnees_locales` :
thèmes, fichiers, séquences, séances, instantanés et archives conservées. La date du
dernier téléchargement est affichée sur ce navigateur. Les vidéos peuvent rendre
la sauvegarde volumineuse.

Pour restaurer ou transférer : fermez l’application, gardez une copie de l’installation
actuelle, extrayez la sauvegarde, puis placez son dossier **donnees_locales** à côté de
**DEMARRER.bat** dans une installation de cette version ou plus récente. **Ne fusionnez
pas deux dossiers de données.** Le lancement reconstitue les fichiers des thèmes.
La restauration passe par cette copie de dossier ; aucun import global automatique
n’est proposé dans la bêta.

## Vérifications et limites de la bêta

Vérification sur Linux avec Python 3.12 et Chromium : tests Python des données,
objectifs, étapes, suppression, compatibilité et restauration ; parcours navigateur
des onze activités, de la navigation, des documents, des sons et des neuf supports
PDF A4. Les deux thèmes fournis, leurs 30 images et leurs 30 MP3 sont chargés et
décodés réellement. Les cas 54 cartes sur une A4 et 60 cartes par séance sont vérifiés.

Le lanceur n’a pas été exécuté nativement sous Windows dans cet environnement.
Le service TTS distant reste à essayer sur votre PC ; les tests déterministes utilisent
une réponse audio simulée. Un essai sur l’imprimante et le TBI de la classe complétera
les vérifications de cette bêta. Aucun exécutable `.exe` autonome n’est fourni.

Développeurs : `python -m pip install -r local/requirements.txt`, puis
`python -m unittest discover -s tests -p 'test_*.py'`.
Les tests navigateur utilisent Playwright, Chromium et, pour certains, FFmpeg,
pdfinfo et pdftotext. Ils utilisent des dossiers temporaires dédiés, jamais les
préparations réelles de l’enseignant. Ces outils ne sont pas requis pour faire classe.
