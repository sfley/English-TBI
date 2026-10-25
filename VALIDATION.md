# Vérifications de la version préparée

L'application d'origine provient uniquement de `tbi/flashcards_tbi_test ok/`.
La version de travail unique se trouve dans le dépôt `sfley/English-TBI`.
L'archive d'origine n'a pas été modifiée (empreinte dans le README).

Corrections :

- Annulation commune des minuteurs, pauses et sons au changement d'activité,
  de thème et au redémarrage d'une manche.
- Les séquences audio vérifient l'annulation entre chaque son et chaque pause.
- Les verrous des jeux et boutons de lecture sont réinitialisés après annulation.
- Un identifiant `?game=` inconnu revient au tableau ; même les noms de propriétés
  héritées comme `__proto__` ne sont pas acceptés comme jeux.
- Les préférences locales invalides ou inaccessibles reviennent aux valeurs par défaut.
- Le jeu What's Missing? verrouille immédiatement une bonne réponse et empêche
  une deuxième réponse pendant le retrait de la carte.
- Les objets d'état des activités gardent leur identité après modification d'un
  réglage : les événements ne lisent plus des copies périmées.
- Zéro Vrai est conservé et produit uniquement des propositions fausses.
- Le raccourci Faux n'active pas simultanément le plein écran.

Tests automatisés dans Chromium : 30 contrôles, tous réussis à la racine du site.
Même suite exécutée sur la sortie statique préparée sous `/public/`, pour vérifier
les chemins relatifs utilisés par Pages : 30 contrôles réussis.
Ces contrôles comprennent les sept activités × deux thèmes, les entrées de
préférences malformées et l'accès refusé au stockage, les changements pendant
les transitions, les annulations de séquences et la valeur zéro Vrai.
Les 30 images et les 30 MP3 référencés sont présents et décodés par le navigateur.
Une lecture audio réelle a été démarrée puis arrêtée par un changement de jeu.
Aucune erreur JavaScript n'a été relevée pendant ces suites.

La construction de l'artefact Pages a été exécutée localement avec les commandes
prévues dans `.gitlab-ci.yml`. Le pipeline distant, l'URL publique La Forge et
le rendu/son sur le TBI de la classe ne sont pas encore vérifiés.
Les tests audio ne jugent pas la qualité pédagogique de la prononciation.
