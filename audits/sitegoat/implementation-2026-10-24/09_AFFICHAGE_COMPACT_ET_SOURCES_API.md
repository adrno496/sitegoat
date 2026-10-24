# Complément demandé : affichage compact et sources API

Ce complément suit la publication initiale `1a06ce7` et son V10 vert. L’utilisateur demande de poursuivre, de retirer les blocs « Publié le / Fait du / Vérification déclarée / Sourcé (déclaré) … », de ne garder que date/heure, de rendre les titres gras en préservant la disposition, puis d’utiliser les clés utiles de `Downloads/sentinel-ok`. « Tout ce qui peut être possible » n’autorise ni à exposer tous les secrets ni à appeler des services sans rapport avec la veille.

## Affichage

- Une seule ligne de date de publication et d’heure, calculée à Paris. Une date seule reste une date seule, sans inventer minuit, sans parenthèses de fuseau ni mention « heure non fournie ». Date absente/invalide : aucune fausse date de publication.
- Les lignes de fait, de vérification, de statut producteur et d’import ont été retirées des cartes et de la lecture courante. Le compteur d’actualisation locale redondant de l’accueil est retiré. Les titres sont en graisse 700, sans changement de grille ou de navigation principale.
- Les champs sources, les preuves, les dates UTC et les tris exacts restent intacts dans les données et les exports explicites. Aucun original HTML n’est réécrit. Les diagnostics avancés et les filtres restent disponibles.
- Cette consigne utilisateur remplace expressément l’exigence initiale SG-10 d’afficher les statuts à côté de tous les titres. Les tests d’affichage ont été adaptés à cette décision ; les tests des vocabulaires, des données, des instants et de l’intégrité restent maintenus.

Commits : `80b2af5` pour la lecture, `c6a3168` pour les sources, `80c0ff0` pour le routage local explicite, `1016911` pour la restriction au compte propriétaire.

## Sources réellement connectées

Dans **Actualité rapide → Sources**, la liste habituelle reste la vue par défaut. Aucun fournisseur n’est appelé en ouvrant l’application, en lisant un journal ou en saisissant une recherche. Ouvrir Sources consulte seulement la disponibilité du serveur ; **Récupérer** déclenche une source à la fois.

| Source | Usage | Clé | Vérification réelle initiale |
|---|---|---|---|
| Brave News | Actualités, recherche publique explicite | Serveur | 5 résultats |
| Tavily | Recherche Web basique, sans réponse IA ni texte intégral | Serveur | 5 résultats |
| Exa | Recherche rapide, cinq résultats et courts extraits | Serveur | 5 résultats |
| BCE | Six devises de référence face à l’euro | Aucune | 6 taux datés |
| CISA | Douze dernières entrées du catalogue de vulnérabilités exploitées | Aucune | 12 entrées |
| GitHub | Versions publiques VS Code / Node / React / Ollama | Aucune | 5 versions par dépôt |

Les trois clés sont reprises du coffre central Sentinel via son lecteur, en mémoire, sans affichage. Elles sont ajoutées comme variables **sensibles Production** à Vercel (`provider-key-transfer.json`), sans `VITE_`, sans copie dans un fichier du dépôt ou dans localStorage. Aucun secret Sentinel d’origine n’est modifié/révoqué. Les autres clés du coffre restent en place : aucun CRM, contact nominatif, scan actif, service de crawl ou génération IA ajouté.

Les trois moteurs payants nécessitent la session Supabase du compte privé configuré pour la bibliothèque. Seule la recherche saisie dans ce formulaire est transmise ; aucun titre du journal, HTML, note, fichier, chemin local ou session n’est ajouté à la requête fournisseur. La requête est bornée à 200 caractères ; les motifs de clé, e-mail, chemin utilisateur macOS/lecteur Windows et valeurs connues des trois clés sont refusés. Cette détection n’est pas une classification générale de toute donnée personnelle : l’utilisateur doit saisir un sujet public.

Les résultats sont du texte non fiable : React les échappe, les liens privés/dangereux sont filtrés, aucun HTML ou instruction n’est exécuté et le serveur ne suit aucun lien renvoyé par un moteur. Endpoints fixes, redirects refusés, réponses limitées à 4 Mio/12 secondes, sortie réduite à douze entrées au plus. Les erreurs ne renvoient jamais la réponse brute d’un fournisseur ou une valeur de clé.

Cache serveur 15 minutes/50 recherches au plus ; cadences par utilisateur ou IP. **Ces compteurs vivent par processus : ils ne garantissent pas un plafond de dépenses distribué sur Vercel.** Aucun abonnement acheté ; trois recherches de diagnostic ont utilisé les quotas existants, coût en euros et quotas restants non mesurés. Aucun repli automatique vers un second moteur après échec.

Les dix résultats de récupération les plus récents sont conservés localement pour consultation hors ligne. C’est un cache public distinct, sans modification de bibliothèque ou version de base ; il n’est pas inclus dans les trois sauvegardes personnelles existantes et peut être reconstruit par récupération. Une erreur/quota réseau garde les données précédentes. L’original et les sauvegardes de journaux restent indépendants de ce cache.

## Vérifications et incidents

- Dix-huit tests ciblés unitaires PASS, puis un seizième contrôle ajouté sur le compte propriétaire ; donc seize nouveaux sur authentification, origine, schéma, clé réfléchie, requête privée, endpoint fixe, réponse volumineuse, quota, cache et projection des neuf sources.
- Six scénarios navigateur ciblés de dates/navigation PASS ; puis trois scénarios Sources PASS. La suite complète est consignée dans `check-followup-final.log` et son reçu final.
- Les API ont réellement répondu : `provider-live-smoke.json`. Le premier endpoint historique `facebook/react` renvoyait 301 ; le dépôt canonique `react/react` a été vérifié puis utilisé, sans autoriser les redirects. Aucun faux succès sur le premier refus.
- Le premier mock API était intercepté par le service worker ; le test de mocks est désormais isolé avec service worker bloqué. Il vérifie la persistance après reload et la lecture hors ligne après remontage. Le test de production séparé vérifie le **vrai rechargement hors ligne avec service worker et source BCE réelle**, sans mock.
- Une première assertion comparait la carte triée au premier élément brut ; elle compare désormais l’événement affiché à son identifiant source. Une sélection de formulaire utilise son rôle/nom accessible. Aucune assertion de contenu ou de sécurité supprimée.
- Le probe local a d’abord utilisé un port refusé par Fetch, puis 4191 : catalogue 200, neuf sources, clé absente du JSON, privé sans session 401, origine tierce 403. Aucun appel fournisseur pour ce probe.
- Scan des fichiers versionnés/build contre 26 valeurs distinctes connues du coffre : aucune correspondance. Ce contrôle ciblé ne prétend pas détecter tous les secrets inconnus.

Pour le mode local explicitement connecté : fournir les variables serveur dans un fichier `.env.local` ignoré, puis `JOURNAL360_ALLOW_CLOUD_LOCAL=1 npm run preview`. Le mode de test/hors ligne conserve les API bloquées par défaut. Ne jamais mettre de clé dans une variable `VITE_` ou un HTML. `.env.example` reste un modèle sans secret, complété sans retirer sa configuration précédente.

Un dernier contrôle négatif a démontré qu’accepter tout utilisateur valide du projet serait trop large pour les clés du propriétaire. Le serveur exige désormais aussi l’adresse du compte privé déjà configuré ; un autre compte est refusé même si un résultat est en cache. Le contrôle rouge avant correction est `source-owner-red.log`, puis les unitaires complets sont rejoués. Cette correction est uniquement serveur ; le bundle navigateur/E2E demeure inchangé.

## Publication et limites finales

Validation locale finale : **361 unitaires PASS / 1 skip historique ; 292 E2E PASS / 1 skip historique**, aucun FAIL, retries 0. Le `npm run check` complet contient le point de contrôle 360 unitaires ; après le renforcement serveur du propriétaire, lint/typecheck et les 361 unitaires complets ont été rejoués. Le bundle navigateur n’a pas changé entre ces deux points ; les E2E portent sur ce même bundle. Le routage local explicite a son probe HTTP distinct.

La publication du complément sera une avance rapide non forcée de main. Le bundle public sera comparé au build local, puis le V10 sera retesté dans trois profils vierges avec la source BCE réelle et son cache hors ligne. Les reçus finaux sont `production-deployment-followup.json` et `production-v10-followup.json`.

Le login réel de la bibliothèque et les recherches payantes complètes en production ne sont pas testés avec le compte personnel : authentification couverte en tests isolés, refus anonyme vérifié et réponses fournisseurs réelles vérifiées séparément. Aucune migration de bibliothèque ni test sur session personnelle. SG-03 reste partiel pour la mémoire des très gros corpus et les appareils physiques restent non certifiés.

Rollback : pour retirer seulement ce complément, préparer sur une branche de rollback des reverts dans l’ordre `1016911`, `80c0ff0`, `c6a3168`, `80b2af5`, puis vérifier interface, formats et restauration sur profil vierge. Pour retirer l’accès aux fournisseurs, supprimer uniquement les trois **copies ajoutées** aux variables Production Vercel et redéployer ; ne pas révoquer les originaux de Sentinel ni toucher aux variables Supabase préexistantes. Ce rollback n’a pas été exécuté. Les journaux, notes et backups ne sont pas une étape du rollback.


Références techniques primaires consultées : [Brave](https://api-dashboard.search.brave.com/api-reference/web/search/get), [Tavily](https://docs.tavily.com/documentation/api-reference/endpoint/search), [Exa](https://exa.ai/docs/reference/search), [BCE](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html), [GitHub Releases](https://docs.github.com/en/rest/releases/releases), [service workers Playwright](https://playwright.dev/docs/service-workers). Le flux JSON CISA a répondu ; sa page HTML de catalogue a refusé l’outil de lecture Web (403), sans contournement.
