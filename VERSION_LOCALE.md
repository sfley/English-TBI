# English TBI local — version 2.1 pour Windows

L’accueil présente vos **séquences** et vos **séances enregistrées**. Les thèmes sont
la réserve de cartes ; chaque séance enregistre les cartes précises qu’elle utilise.
Aucun Git, compte ou jeton n’est nécessaire sur le PC.

## Installer ou mettre à jour

1. Téléchargez le ZIP, puis clic droit > **Extraire tout**.
2. Pour une mise à jour, fermez l’ancienne application et copiez son dossier
   **donnees_locales** dans le nouveau dossier, à côté de **DEMARRER.bat**.
   Gardez l’ancien dossier jusqu’à vérification. Ne copiez pas son `.venv`.
3. Double-cliquez sur **DEMARRER.bat**. Python 3.10 ou plus doit être installé.
   Si nécessaire : https://www.python.org/downloads/windows/ ; sur un PC administré,
   demandez l’installation au responsable informatique.
4. Le premier lancement installe les dépendances dans `.venv` (Internet nécessaire).
   Le navigateur s’ouvre ensuite sur l’accueil. Laissez la fenêtre du lanceur ouverte.

Les anciennes sélections et ressources enregistrées par thème sont récupérées comme
**séances indépendantes** portant la mention « Séance récupérée ». Les anciens fichiers
restent intacts. Vos thèmes, images et sons sont conservés.

## Préparer une séquence

Cliquez sur **Nouvelle séquence**. Renseignez le titre, le niveau, l’objectif commun,
les notes et l’état : **À préparer · Prête · Réalisée**. Ajoutez si besoin des ressources
communes, puis enregistrez. Vous retrouvez la séquence sur l’accueil.

Depuis sa carte, **Ajouter une séance** crée une séance rattachée. Les flèches ↑ ↓
permettent de réordonner les séances. Le numéro d’ordre est également modifiable
sur la fiche de séance. **Modifier la séquence** permet de reprendre ses informations.

## Supprimer une séance ou une séquence

Sur l’accueil, le bouton **Supprimer** demande une confirmation avant toute action.
Supprimer une séance retire uniquement cette séance.
Supprimer une séquence conserve ses séances comme **séances indépendantes** ; les
ressources communes sont reprises dans ces séances pour conserver leur utilisation.
Les thèmes et les fichiers de ressources ne sont pas supprimés.
Les anciennes préparations récupérées puis supprimées ne réapparaissent pas au redémarrage.
Aucune corbeille ni commande de restauration n’est ajoutée à l’interface.

## Préparer une séance

Une séance peut appartenir à une séquence ou rester indépendante pour un rituel ponctuel.
Donnez-lui un nom, un objectif, une consigne, une durée indicative et un état.

- Ajoutez un ou plusieurs thèmes et cochez les mots retenus (2 à 60 cartes au total).
- **Choisir ce nombre** sélectionne des cartes à la préparation, pas au lancement.
- Ajoutez les ressources de la séance et réordonnez-les avec les flèches.
- Cliquez sur **Enregistrer la séance** : elle apparaît sur l’accueil.
- **Dupliquer** crée une copie avec ses cartes et ses ressources, que vous pouvez adapter.

Les images et les sons sont copiés dans un instantané propre à la séance.
Modifier un thème ensuite ne change pas une séance déjà prête. Pour reprendre
volontairement les nouvelles images et les nouveaux sons, cochez **Actualiser…**
sur la fiche. Si une carte a été retirée du thème, l’éditeur l’indique et refuse
une actualisation impossible ; l’ancienne séance demeure utilisable.

Une modification non enregistrée déclenche une confirmation avant de quitter la fiche.

## Faire classe

Sur l’accueil, **Lancer** ouvre la séance : consigne, aperçu des cartes, sept activités,
ressources communes de la séquence et ressources de la séance dans l’ordre choisi.

Le jeu utilise exactement les cartes enregistrées. **Retour à ma séance** retrouve
la fiche et son rituel ; celle-ci permet de retourner à la séquence ou à l’accueil.
Les boutons **Préparer · Jouer · Imprimer** conservent le contexte de la séance.

Dans les jeux, la barre d’activité est compacte et **Réglages** ouvre un panneau
centré, contenu dans l’écran et défilant si nécessaire. Les réglages d’affichage,
le contraste élevé, **Recommencer**, les commandes sonores et le plein écran restent
accessibles. Le panneau se repositionne aussi lorsque la fenêtre est redimensionnée.
En plein écran, **Menu** permet de retrouver la navigation principale.

## Chansons, vidéos, jeux et fiches de préparation

Ajoutez des liens HTTP/HTTPS ou des fichiers MP3, MP4, WebM, OGG et PDF (64 Mo maximum).
Donnez un titre et une catégorie à chaque ressource. Vous pouvez reprendre une ressource
déjà associée à un thème, ou en ajouter une nouvelle. Les flèches définissent l’ordre.
Les fichiers locaux ne démarrent pas automatiquement ; un changement de page arrête
la lecture. Les liens Internet s’ouvrent dans un nouvel onglet à votre demande.
Préférez MP3 et MP4 H.264/AAC pour la compatibilité entre navigateurs.

## Imprimer

Depuis une séance, **Imprimer** reprend ses cartes enregistrées.
Vous pouvez également accéder à **Mes thèmes**, puis imprimer un thème librement.

- **Planche économique élèves** : six colonnes, de 1 à 40 séries. Trois séries de
  18 cartes tiennent sur une A4 avec des marges hautes/basses de 5 mm. Pour les 17 fruits,
  24 élèves donnent 8 feuilles. Les mots sont facultatifs.
- **Grandes cartes collectives** : 2, 4, 6 ou 8 cartes par A4.
- **Loto** : de 1 à 30 grilles, avec 4, 6 ou 9 cases ; deux grilles par A4.
  La séance doit contenir au moins autant de cartes que de cases.

Choisissez **Préparer les pages**, puis **Imprimer / Enregistrer en PDF**.
Réglages navigateur : A4 portrait, échelle 100 %, sans en-têtes ni pieds de page.

## Ajouter ou modifier des thèmes

**Mes thèmes** ouvre l’éditeur des fruits, animaux et thèmes personnels.
Ajoutez des images PNG/JPEG/WebP, vérifiez les mots puis générez les voix via gTTS,
ou importez les MP3. La génération vocale utilise Internet et envoie les mots à
Google Translate, sans compte ni clé. Chaque voix peut être réécoutée et régénérée.
Les requêtes HTTPS conservent la vérification des certificats. En cas d’indisponibilité,
vos cartes restent dans l’éditeur ; vous pouvez réessayer ou importer vos MP3.

À l’enregistrement, les images sont copiées en PNG **187 × 187**, sans déformation,
dans `flashcards/nom-du-theme/`, les sons dans `audio/nom-du-theme/`, et `cards.js`
est actualisé. Les originaux fournis et les anciennes archives sont sauvegardés
sous `donnees_locales/originaux/` et `donnees_locales/avant_migration_187/`.

L’export/import ZIP des thèmes reste disponible. Il transporte le vocabulaire,
les images et les sons du thème ; il ne transporte pas une séquence ou ses séances.

## Sauvegarder et transférer

Sauvegardez **donnees_locales en entier** : il contient les thèmes, les fichiers de
ressources et les préparations. Les séquences et séances sont sous **progressions/**,
avec leurs instantanés de cartes sous **progressions/snapshots/**.

Pour transférer votre travail, copiez ce dossier complet à côté de DEMARRER.bat dans
une autre installation de cette version. N’assemblez pas deux dossiers de travail
sans sauvegarde préalable : des fichiers de même nom peuvent correspondre au même objet.
Le site déjà publié sur La Forge reste indépendant de cette version locale.

## Validation et limites

Vérifications sous Python 3.12 et Chromium sur Linux :

- 25 tests Python : thèmes et ZIP, séquences et séances, ordre, duplication,
  plusieurs thèmes, persistance au redémarrage, reprise des anciennes préparations,
  protection des instantanés après modification d’un thème et validation des données.
- Parcours navigateur : création de séquence et de séance nommée, six cartes précises,
  ressource de rituel, lancement, panneau Réglages à 1366 × 768 et 640 × 600,
  retour à la séance, impression, duplication, réordonnancement et protection des saisies.
- Suites existantes de l’éditeur, des médias, des flashcards/loto et du jeu libre.

Le lanceur Windows n’est pas exécuté nativement sur la machine Linux de préparation.
Le TTS distant reste à vérifier sur votre PC : l’accès Google est refusé dans le cloud ;
les tests déterministes simulent la réponse audio. Les médias fournis et les instantanés
sont décodés dans le navigateur. Aucun exécutable `.exe` autonome n’est fourni.

Pour les développeurs : installer `local/requirements.txt`, puis exécuter
`python -m unittest discover -s tests -p 'test_*.py'`.
Les tests navigateur utilisent Playwright et Chromium ; certains utilisent aussi
FFmpeg, pdfinfo et pdftotext. Ces outils ne sont pas requis pour faire classe.
Utiliser des données de test fraîches pour chaque scénario qui crée ou renomme des objets.
