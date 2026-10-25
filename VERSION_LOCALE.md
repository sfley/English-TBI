# English TBI local — Windows

Cette version réunit les sept activités et un atelier visuel de création de thèmes.
Aucun Git, Flask, compte ou jeton n'est nécessaire sur votre ordinateur.
Le site déjà publié sur La Forge reste utilisable indépendamment.

## Premier démarrage

1. Téléchargez le ZIP de la version locale, puis faites clic droit > **Extraire tout**.
2. Ouvrez le dossier extrait et double-cliquez sur **DEMARRER.bat**.
3. Si Python manque, installez Python 3.10 ou plus depuis
   https://www.python.org/downloads/windows/ puis relancez **DEMARRER.bat**.
   Sur un ordinateur administré par l'école, demandez l'installation à son responsable.
4. Au premier lancement, le programme installe ses dépendances dans le sous-dossier
   `.venv` : Internet est nécessaire. L'atelier s'ouvre ensuite dans votre navigateur.
   Si le navigateur ne s'ouvre pas, l'adresse est indiquée dans la fenêtre du lanceur.

Gardez la fenêtre du lanceur ouverte pendant l'utilisation. Fermez-la pour arrêter.
L'application est accessible uniquement depuis cet ordinateur (adresse 127.0.0.1).
L'adresse utilise un port disponible ; lancez une seule instance à la fois.
Ne lancez pas le programme depuis l'intérieur du ZIP et ne déplacez pas les fichiers
séparément. Le dossier doit être accessible en écriture.

## Mettre à jour une première version locale

Fermez l’atelier, extrayez le nouveau ZIP dans un nouveau dossier et copiez le dossier
**donnees_locales** de l’ancienne version à côté du nouveau **DEMARRER.bat**, puis lancez-le.
Gardez l’ancien dossier jusqu’à vérification de vos thèmes. Les images et sons sont
recréés au bon endroit à partir des ZIP conservés. Ne copiez pas l’ancien dossier `.venv`.

## Préparer un thème

1. Donnez un nom au thème et choisissez l'anglais britannique ou américain.
2. Choisissez ou déposez des images PNG, JPEG ou WebP. Leur nom propose le mot anglais.
3. Corrigez les mots et indiquez les sources/droits des ressources.
4. Cliquez sur **Générer les sons manquants**, ou importez un MP3 pour chaque carte.
   Vous pouvez régénérer un seul mot et écouter chaque son avant validation.
5. Cliquez sur **Enregistrer le thème**, puis **Jouer avec ce thème**.

Prévoyez de 2 à 60 cartes, chacune avec un mot, une image et un MP3.
La valeur de chaque fichier est limitée à 8 Mo. Les images sont copiées,
réorientées et normalisées en PNG 187 × 187 ; les fichiers d'origine restent intacts.
La méthode de cadrage reprend celle de votre générateur Python initial.
Changer le mot invalide son ancien son pour éviter les associations incorrectes.
Changer la voix ne régénère pas les sons existants : utilisez le bouton de la carte.

Les sons sont générés par gTTS via Google Translate. Les mots sont donc envoyés à ce
service, sans clé ni compte. Une connexion Internet est nécessaire pour cette action.
Le service peut être indisponible ou limité. En cas d'erreur, vos cartes restent dans
l'atelier ; vous pouvez réessayer plus tard ou fournir vos MP3. Les requêtes HTTPS
conservent la vérification des certificats.

Les fruits et les animaux fournis, ainsi que les thèmes enregistrés avec leurs sons,
sont utilisables hors connexion après la première installation.

## Retrouver et modifier les thèmes fournis

**fruits** et **wild animals** apparaissent automatiquement dans « Mes thèmes » avec
leurs images et leurs sons. Cliquez sur **Modifier** pour les ouvrir dans l’éditeur.
Leurs ZIP d’origine sont conservés dans **donnees_locales/originaux/**.
Le nom affiché dans les jeux et sur les impressions est exactement celui choisi
(par exemple **Feelings**), sans préfixe « Local » ni identifiant ajouté.

## Séance et ressources

Le bouton **Séance et ressources** de chaque thème permet de choisir un nombre de
cartes, ou de cocher précisément les mots souhaités. Cliquez sur **Utiliser cette sélection**.
La sélection est enregistrée sur disque et partagée par les sept jeux et les impressions.
Le thème complet reste intact. Rechargez les onglets des jeux/impressions déjà ouverts
pour appliquer la nouvelle sélection. **Toutes les cartes**, puis **Utiliser cette sélection**,
permet de revenir au thème entier. Deux cartes minimum sont nécessaires.

Vous pouvez associer au même thème des chansons, vidéos, jeux en ligne, fiches de
préparation/de séance et autres ressources, avec un titre et des notes/source.
Les liens HTTP/HTTPS s’ouvrent dans un nouvel onglet sur demande. Les fichiers locaux
acceptés sont MP3, MP4, WebM, OGG et PDF, jusqu’à 64 Mo. Les sons/vidéos ne démarrent
pas automatiquement et s’arrêtent au changement de thème ou au départ de la page.
Certains codecs peuvent dépendre de votre navigateur ; préférez MP3 et MP4 H.264/AAC.

Les sélections sont enregistrées sous **donnees_locales/seances/**, et les fichiers
supplémentaires sous **donnees_locales/ressources/**. Sauvegardez **donnees_locales**
en entier pour les transporter : le ZIP exporté d’un thème contient ses cartes et leurs
sons, mais pas les ressources de rituel ni les sélections de séance.

## Flashcards et grilles de loto à imprimer

Dans « Mes thèmes », cliquez sur **Imprimer** à côté du thème souhaité.

- **Flashcards élèves — planche économique** : six colonnes de petites cartes,
  séries complètes regroupées sur les feuilles. Choisissez de 1 à 40 séries (par exemple
  le nombre d’élèves). Avec les 17 fruits, deux séries tiennent sur une seule feuille A4,
  comme dans votre modèle PDF : 24 élèves donnent 12 feuilles au lieu de 72 en grandes cartes.
  Les contours discrets aident à la découpe. Les mots sont facultatifs.
- **Grandes cartes collectives** : 2, 4, 6 ou 8 cartes par feuille A4, avec ou sans mots.
- **Loto** : grilles de 4, 6 ou 9 cases, de 1 à 30 grilles, deux grilles par feuille A4.
  Une même image n’apparaît qu’une fois par grille. Les dispositions sont différentes
  entre les grilles. Le thème doit contenir au moins autant de cartes que de cases.
- Cliquez sur **Préparer les pages**, puis sur **Imprimer / Enregistrer en PDF**.
- Dans le dialogue du navigateur : A4, portrait, échelle 100 %, sans les en-têtes
  ni les pieds de page du navigateur. Pour le loto, les flashcards du thème servent
  de cartes d’appel ou de pioche.

Les images et les fichiers d’impression restent sur votre ordinateur. Les PDF
sont enregistrés à l’endroit choisi dans le dialogue d’impression du navigateur.

## Enregistrer, exporter, transporter

- Les images sont enregistrées dans **flashcards/nom-du-theme/** et les MP3 dans
  **audio/nom-du-theme/**, comme les thèmes fournis. Par exemple :
  `flashcards/school-supplies/pencil.png` et `audio/school-supplies/pencil.mp3`.
- **cards.js** est mis à jour automatiquement pour que le thème soit aussi disponible
  en ouvrant directement `index.html`. Le nom du dossier reste stable si le thème est renommé.
- Les ZIP de sauvegarde et les métadonnées de l’atelier restent dans **donnees_locales**.
- Les anciens thèmes locaux sont convertis en 187 × 187 au démarrage ; leurs ZIP
  originaux sont conservés dans **donnees_locales/avant_migration_187/**.
- Un dossier existant n’est pas écrasé : un suffixe est ajouté si nécessaire.
- **Exporter en ZIP** permet d'obtenir une sauvegarde ou de transporter un thème.
- Sur un autre ordinateur équipé de la version locale, **Importer un thème ZIP**
  ajoute ce thème. L'import crée une copie et n'écrase pas les thèmes existants.
- Pour une sauvegarde complète, copiez le dossier complet de l’application sur un autre support (ou exportez chaque thème en ZIP).
- Une erreur d'import ou de génération ne supprime pas les thèmes déjà enregistrés.
- Les modifications en cours ne sont conservées qu'après **Enregistrer le thème**.
  Une confirmation vous protège lorsque vous quittez une fiche modifiée.

Le ZIP exporté utilise un format dédié : `manifest.json`, `images/` et `audio/`.
Il ne s'agit pas de l'archive `english.zip` d'origine. L'import des nouveaux thèmes
est disponible dans cette version locale ; il n'est pas encore ajouté au site en ligne.

## Validation et limites

Tests réalisés sur Python 3.12 et Chromium sous Linux :

- 16 tests Python : export/import, modification, redémarrage sur les données persistées,
  validation des fichiers, refus des chemins dangereux, protection des écritures locales,
  conservation des archives corrompues et gestion des erreurs TTS.
- 8 parcours de navigateur : création, MP3, sauvegarde, sept activités avec le nouveau
  thème, téléchargement réel du ZIP, import sans écrasement, rechargement, modification,
  erreur réseau et génération par lot avec réponse distante simulée.
- 6 contrôles supplémentaires : ouverture des deux thèmes fournis, affichage exact
  du nom Feelings, flashcards avec/sans mots, loto, validation des quantités et
  génération réelle de PDF A4 avec vérification du nombre de pages.
- 6 contrôles de séance supplémentaires : PDF économique A4 (deux séries de 17 fruits),
  24 séries sur 12 pages, sélection partagée par les sept jeux, persistance des liens/PDF
  lecture réelle de MP3/vidéo locale et prise en compte de la sélection pour l’impression/loto.
- 30 contrôles de non-régression sur les jeux et les médias fournis.

La réponse audio TTS distante est simulée dans les tests déterministes ; l'appel réel
à Google a été tenté avec la vérification TLS activée, mais la connexion est refusée
dans l'environnement cloud de préparation. La génération réelle reste à vérifier sur
le PC Windows. La préparation automatique réelle (création du venv, installation, démarrage) a aussi
été vérifiée sous Linux dans un dossier avec espaces et accents.
Le lanceur Windows est fourni mais ne peut pas être exécuté nativement
sur la machine Linux de préparation. Aucun exécutable autonome `.exe` n'est fourni.

Pour les développeurs :

```sh
python -m pip install -r local/requirements.txt
python -m unittest discover -s tests -p test_local.py -v
python local/server.py --no-browser --port 8092 --data-dir /tmp/english-local-test
# Puis, dans un autre terminal avec Playwright et Chromium :
node tests/local-browser.cjs
```

L’atelier, les jeux, la préparation de séance et l’impression partagent une feuille de style commune.
Les contrôles du TBI et le contraste élevé restent disponibles.
Les tests `print-browser.cjs` et `session-browser.cjs` utilisent aussi les outils développeur
`pdfinfo`, `pdftotext` et FFmpeg ; ces outils ne sont pas requis pour utiliser l’application.
