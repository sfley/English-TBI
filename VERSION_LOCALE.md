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

## Préparer un thème

1. Donnez un nom au thème et choisissez l'anglais britannique ou américain.
2. Choisissez ou déposez des images PNG, JPEG ou WebP. Leur nom propose le mot anglais.
3. Corrigez les mots et indiquez les sources/droits des ressources.
4. Cliquez sur **Générer les sons manquants**, ou importez un MP3 pour chaque carte.
   Vous pouvez régénérer un seul mot et écouter chaque son avant validation.
5. Cliquez sur **Enregistrer le thème**, puis **Jouer avec ce thème**.

Prévoyez de 2 à 60 cartes, chacune avec un mot, une image et un MP3.
La valeur de chaque fichier est limitée à 8 Mo. Les images sont copiées,
réorientées et normalisées en PNG 512 × 512 ; les fichiers d'origine restent intacts.
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

## Enregistrer, exporter, transporter

- Les thèmes sont conservés sous forme de ZIP dans **donnees_locales**, à côté du lanceur.
- **Exporter en ZIP** permet d'obtenir une sauvegarde ou de transporter un thème.
- Sur un autre ordinateur équipé de la version locale, **Importer un thème ZIP**
  ajoute ce thème. L'import crée une copie et n'écrase pas les thèmes existants.
- Pour une sauvegarde complète, copiez le dossier **donnees_locales** sur un autre support.
- Une erreur d'import ou de génération ne supprime pas les thèmes déjà enregistrés.
- Les modifications en cours ne sont conservées qu'après **Enregistrer le thème**.
  Une confirmation vous protège lorsque vous quittez une fiche modifiée.

Le ZIP exporté utilise un format dédié : `manifest.json`, `images/` et `audio/`.
Il ne s'agit pas de l'archive `english.zip` d'origine. L'import des nouveaux thèmes
est disponible dans cette version locale ; il n'est pas encore ajouté au site en ligne.

## Validation et limites

Tests réalisés sur Python 3.12 et Chromium sous Linux :

- 10 tests Python : export/import, modification, redémarrage sur les données persistées,
  validation des fichiers, refus des chemins dangereux, protection des écritures locales,
  conservation des archives corrompues et gestion des erreurs TTS.
- 8 parcours de navigateur : création, MP3, sauvegarde, sept activités avec le nouveau
  thème, téléchargement réel du ZIP, import sans écrasement, rechargement, modification,
  erreur réseau et génération par lot avec réponse distante simulée.
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
