# Version locale Windows

Commencez par [VERSION_LOCALE.md](VERSION_LOCALE.md), puis double-cliquez sur **DEMARRER.bat** dans le dossier extrait. Cette branche contient l’accueil des séquences et séances enregistrées, l’éditeur de thèmes, les sept activités et les impressions. La version locale 2.0 conserve une copie des cartes et sons dans chaque séance préparée.

---

# Anglais sur TBI

Application statique HTML/CSS/JavaScript, avec sept activités : Visual Board, Listen,
What's Hidden?, Memory Match, Sequence, What's Missing? et True or False.
Deux thèmes : fruits (17 cartes) et wild animals (13 cartes).
Les 30 images et les 30 enregistrements audio sont inclus ; aucun service externe,
compte élève, serveur applicatif ou secret n'est nécessaire au fonctionnement.

## Utilisation et développement

Ouvrir `index.html` dans un navigateur moderne. Pour les tests HTTP locaux :

```sh
node tools/serve.cjs
```

Le serveur local de développement utilise le port 8080. La publication ne nécessite
ni Node.js, ni Python, ni Flask, ni Gunicorn. Autoriser la lecture sonore par un clic
ou une touche dans le navigateur. Le son n'est pas lancé automatiquement au chargement.
Les préférences TBI/contraste restent facultatives et peuvent être bloquées.

## Vérification

Les tests de navigateur nécessitent Node.js, Playwright et Chromium. Dans
l'environnement préparé, lancer le serveur ci-dessus, puis :

```sh
node tests/browser.cjs
```

Pour une autre installation, installer Playwright dans un répertoire d'outils
extérieur au site ; adapter `NODE_PATH` et `CHROMIUM_PATH` si nécessaire.
`TEST_URL` permet de tester le site publié sous un sous-répertoire.
Les tests couvrent les activités, les deux thèmes, les préférences invalides ou
inaccessibles, les transitions, l'annulation sonore, zéro Vrai et le décodage des médias.
Le contrôle automatisé du son vérifie le décodage et la lecture du navigateur ;
il ne remplace pas un essai d'écoute sur les haut-parleurs du TBI.

## GitHub puis La Forge Apps Éducation

Le dépôt GitHub est le dépôt de transit. La publication finale se fait depuis
un projet GitLab sur La Forge, avec le fichier `.gitlab-ci.yml` fourni.
Le pipeline `pages` publie uniquement `index.html`, `styles.css`, `cards.js`,
`js/`, `audio/` et `flashcards/` dans l'artefact `public/`, sur la branche par défaut.
Les chemins relatifs fonctionnent aussi lorsque le site est publié sous un
sous-répertoire. Les outils de test et la documentation ne sont pas publiés.

Une fois le bon projet La Forge identifié : importer/synchroniser le dépôt GitHub,
vérifier que la branche contenant l'application est la branche par défaut,
puis attendre la réussite du pipeline Pages. L'adresse définitive est celle
indiquée par La Forge dans Déployer > Pages. Elle doit encore être vérifiée après
publication. Ne pas inventer d'URL de projet ou de site.

Ne jamais saisir de jeton dans une conversation ou dans les fichiers du site.
Utiliser les connexions sécurisées disponibles et les écrans d'authentification
de GitHub et de La Forge. Aucun envoi forcé n'est requis.

## Origine de cette version

Application extraite exclusivement de `tbi/flashcards_tbi_test ok/` dans
l'archive `english.zip`. L'archive est conservée sans modification.
SHA-256 : `a0c520256946fad8fd38505840b89f10cd125762084f38b3d42903b2b6c8bc04`.
Les anciennes applications, métadonnées Windows, dépôt Git imbriqué vide et
script Python de génération ne sont pas repris dans le site de travail.
Le doublon audio non référencé `grappes.mp3` a été écarté ; `grapes.mp3` est utilisé.
Les documents joints à l'archive sont des ressources, pas des instructions
remplaçant la demande de l'enseignant.
