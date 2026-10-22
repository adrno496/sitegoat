# Rapport de validation Sitegoat V9 — 22 octobre 2026

Application 2.1.0, contrat documentaire V7 conservé. Référence initiale 8714baa2affbe54140cf903a62305e819503ab8b. Exécutions locales sur Node v24.21.0, npm 11.19.0, Playwright 1.64.0, Vitest 5.0.4 ; versions exactes installées dans `docs/evidence/v9/dependencies.json`. Aucun npm install ni nouvelle dépendance. Profils navigateur jetables, cloud local désactivé, proxy de test bloquant le réseau externe. Aucune donnée personnelle de production ouverte.

## Référence avant refonte

| Commande réelle | Verdict | Résultat |
|---|---|---|
| `npm run lint` | PASS | Code initial sans erreur ESLint |
| `npm run typecheck` | PASS | Compilation TypeScript |
| `npm run build` | PASS | Vite et PWA injectManifest |
| `npm test` | PASS | 310 tests, 26 fichiers |
| `npm run test:performance` | PASS | 4 tests, 2 fichiers |
| `npm run test:e2e` | PASS | 244 réussis, 1 ignoré préexistant, 245 cas, 14,5 min |
| Archive + comparaison aux blobs Git initiaux | PASS | 765 fichiers suivis comparés, zéro divergence ; .env.example exclu volontairement |

Les logs ont été capturés avant modifications. La suite E2E de référence utilisait le dist initial et ses fichiers de test initiaux ; les premières modifications des sources locales ne remplaçaient pas ce bundle. Preuves finales empaquetées sous [docs/evidence/v9](docs/evidence/v9). Les copies texte versionnées retirent seulement les espaces de fin de ligne et lignes blanches finales ; les sorties brutes restent intactes à l’extérieur du dépôt. Logs complets, y compris les échecs intermédiaires : `/Users/dreano/Downloads/sitegoat-v9-rollback-20261022/evidence`.

## Validation de la version livrée

| Commande réelle | Verdict | Résultat |
|---|---|---|
| `npm run lint` | PASS | Inclut scripts et tests nouveaux |
| `npm run typecheck` | PASS | Types applicatifs et tests |
| `npm run build` | PASS | Bundle et service worker générés ; avertissement de taille de chunk, déjà présent initialement |
| `SITEGOAT_V9_REAL_HTML=… npm test` | PASS | 320 tests, 28 fichiers, y compris le vrai HTML fourni |
| `npm run test:performance` | PASS | 4 tests, 2 fichiers ; 47,73 s d’exécution globale, pas une mesure d’interaction utilisateur |
| Parcours ciblés V7/V8/V9, Chromium | PASS | 19 tests ; intégrité, snapshots, clavier/axe, zoom 200 %, 500/2000 articles, V9 réel, 60 brèves synthétiques |
| Suite E2E finale Chromium/WebKit/mobile | PASS | 256 réussis, 1 ignoré préexistant, 257 cas, 13,6 min |
| Contrôle V9 final renforcé, trois projets | PASS | 12 cas ; lecteur réel aux largeurs 360/768/1440, accordéon/source au clavier, quatre Markdown exacts, messages non autorisés et révision périmée refusés |

Reproduction complète :

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run test:performance
npm run test:e2e
# Facultatif : véritable fichier privé fourni, jamais ajouté au dépôt :
SITEGOAT_V9_REAL_HTML=/chemin/edition-v9.html npm test
SITEGOAT_V9_REAL_HTML=/chemin/edition-v9.html npx playwright test tests/e2e/v9-workspace.spec.ts
```

Sans variable, le test unitaire du fichier réel est explicitement ignoré ; les parcours V9 utilisent leur fixture synthétique. La suite finale de cette mission reçoit le chemin réel. Les tests portant dans leur nom historique « lecture réelle 08/10/16 h » utilisent ici des fixtures V8 synthétiques, car les véritables V8 ne sont pas fournis. Ils ne sont pas présentés comme des validations de fichiers absents. Les deux parcours V9 d’import/lecture par projet importent le vrai fichier (6 parcours sur les 3 projets) ; les autres cas V9 couvrent les préférences et les 60 brèves synthétiques.

## P0 à P6 : preuves et limites

| Périmètre | Verdict | Ce qui a été effectivement vérifié |
|---|---|---|
| P0 audit, baseline, point de retour | PASS | Git réel, working tree initial propre, scripts/CI/déploiement documentés, archive SHA-256 et comparaison des fichiers |
| P1 contrat et original V9 fourni | PASS | SHA original exact, V7 inchangé, 18 articles, 10 instantanés économiques, 9 jalons, 4 prompts/hash et 19 brèves ; aucune dépendance aux imports intermédiaires |
| P1 sauvegardes/anciennes importations | PASS | ZIP conserve compagnon et original ; réextraction depuis une archive d’ancien client ; divergence du manifeste refusée ; récupération additive depuis un original ancien contrôlé |
| P1 ordre, idempotence et filiation | PASS | Historique V7 existant et nouveaux tests compagnon : ordre inverse, variantes, omissions conservées, promotion explicite sans titre dédupliqué |
| P1 lecteur interactif | PASS sur parcours exécutés | Recherche, filtre, accordéon, article/modal natif, Google/source via confirmation parent, tous les .md natifs identiques au contenu embarqué, original téléchargé identique aux octets fournis ; navigation de l’édition conservée |
| P1 isolation | PASS sur périmètre local | Cadre opaque allow-scripts seul après consentement ; accès parent.document, localStorage et parent.localStorage refusés ; requêtes de fenêtres étrangères et empreintes invalides refusées ; aucun auto-upload ajouté |
| P1 fichiers 08/10/12/14 | PASS sur fixtures | Huit vrais fichiers locaux distincts dans les fixtures V7 ; snapshot tardif seul => autres originaux non importés ; aucun faux match de créneau |
| Vrai V8 22/10/2026 14h | NON TESTÉ | Octets absents des fichiers fournis ; remplacé pour la preuve réelle par le V9 16h accessible, sans inventer un 14h |
| P2 Aujourd’hui | PASS | Aucun ancien bandeau/grille/diagnostic technique normal, bouton principal unique, aperçu par article, Développer, détail interne et Google ; univers et anciennes fonctions accessibles |
| P3 Accueil | PASS | Faits réellement importés, date d’import distincte du fait, changements déclarés, signaux conditionnels sourcés, lecture et accès rubriques |
| P3 graphiques | PASS structurel + PARTIAL données réelles | Tests de séries homogènes, révisions, unités/définitions/fréquences distinctes, sources officielles déclarées, périodes absentes non interpolées. Le vrai fichier isolé ne fournit pas deux périodes admissibles d’une même série : état vide correct. Pas de courbe IA/cyber/énergie inventée |
| P4 Articles | PASS | Recherche plein texte, filtres combinés univers/preuve/importance/dates, calendrier des faits, tri, pagination, détail intégral, corrections disponibles et Google encodé |
| P4 Actualité rapide | PASS | 19 titres réels, compteur, source/date/preuve déclarée, recherche et thèmes ; 60 titres synthétiques pour pagination 30+30 ; relation de promotion et historique en unité |
| P5 préférences/accessibilité | PASS automatique, PARTIAL humain | Persistance, reset, échec d’écriture, mode en mémoire, responsive, clavier, focus, axe clair/sombre et mouvement réduit ; lecteur d’écran humain non testé |
| P6 producteur | SPÉCIFIÉ, NON IMPLÉMENTÉ | Source de vérité du collecteur absente ; contrat JSON réel/export du schéma, registre, cycle différentiel, défaillances et rollback documentés ; aucun faux producteur ni tâche serveur créée |

La véracité des articles, la validité actuelle de chaque page source et la disponibilité de Google ne sont pas vérifiées en ligne. Le contrôle renforcé a été exécuté après la suite complète, sans modification du code applicatif ; seules les assertions du test ont été étendues. Un premier chargement de ce test renforcé a échoué sur une erreur de syntaxe de son insertion, corrigée avant les 12 réussites.

Les destinations, questions publiques encodées et protections d’ouverture sont testées sans autoriser le réseau tiers. Les statuts de preuve restent ceux déclarés par le producteur. Le contrôle d’une URL publique ne certifie pas un fait.

## Corrections issues des tests

Le premier test P1 a révélé un cycle d’import entre schéma, modèle et index : le schéma compagnon a été isolé dans `quickBriefsSchema.ts`. La fixture de test ajoutait initialement son compagnon à une balise body inexistante : elle a été corrigée ; les octets du vrai fichier ont toujours été lus tels quels. Un premier parcours réel supposait l’ordre producteur malgré le tri d’importance : l’assertion utilise désormais l’eventId affiché. Le label Densité a reçu un aria-label explicite.

La première régression Chromium (avant corrections) a donné 76 réussites, 8 échecs et 4 non exécutés par arrêt après seuil. Les causes ont été traitées : retour de navigation au rechargement, reprise déplacée vers Accueil, accès explicite aux nouveaux menus/diagnostics, outil de test qui refermait les détails déjà ouverts, attente d’un ancien détail inline devenu page interne et débordement réel du badge à zoom CSS 200 %. Les contrôles sur le texte complet, le focus, les sources, les originaux et les sauvegardes ont été conservés et adaptés à leur nouvelle localisation. Aucun test de sécurité ni budget V7 n’a été désactivé. Un passage intermédiaire de 9 cas V9 a été interrompu après le diagnostic du label Densité ; ce passage n’est pas un PASS.

## Sécurité, taille, captures et périmètres protégés

15 fichiers de contrat/stockage/axes snapshot/cloud/sync/Google/Future/SW/CI/CSP sont identiques à la référence, listés dans `protected-and-security.json`. Le modèle local et le lecteur changent explicitement pour le compagnon et les actions contrôlées. Aucun changement de version IndexedDB, SQL, configuration cloud, droits sandbox ou secrets. Le numéro applicatif passe à 2.1.0 ; les dépendances ne changent pas.

Scan de marqueurs de secrets connus sur src et dist : aucune occurrence détectée, sans lire de fichier d’environnement. Ceci n’est pas une garantie générale contre tous les formats de secrets. Marqueurs spécifiques du véritable HTML fourni absents du bundle. L’original réel et ses prompts ne sont pas ajoutés à public, dist ou Git.

Build PWA final : précache 40 entrées, 1459,27 Kio. La taille n’est pas un benchmark de temps de chargement. Le build conserve l’avertissement de gros chunk préexistant. Les mesures de capacité 500/2000 articles proviennent des parcours E2E synthétiques ; leur JSON est joint aux résultats Playwright, sans prétendre mesurer un téléphone physique.

Huit captures locales sous `docs/evidence/v9/screenshots` utilisent exclusivement des données synthétiques, aux largeurs 360/768/1440 pour Accueil/Aujourd’hui et 1440 pour brèves/paramètres. Les captures du vrai fichier restent uniquement dans le dossier local de résultats de test et ne sont pas publiées dans Git.

Limites restantes : collecteur/registre externes absents, pas d’historique IA homogène importé, pas de lecteur d’écran humain/téléphone physique, pas de données personnelles ni synchronisation cloud de production testées. L’activation des scripts conserve le compromis connu de navigation possible du propre cadre ; elle reste réservée aux fichiers de confiance. Le relais Blob natif est limité à 200000 octets et aux contenus Markdown reconnus ; pour un prompt plus volumineux, utiliser la rubrique Prompts du site ou exporter l’original. Les fonctionnalités nécessitant origine partagée, clipboard du cadre ou ressources réseau bloquées ne sont pas promises ; l’export original et les outils parent restent disponibles.

## Publication autorisée et rollback

L’utilisateur a ensuite demandé explicitement commit, push sur main et production à la fin. Le push est conditionné aux résultats finaux ; main est déjà ouvert dans un autre worktree, qui ne doit pas être modifié. La publication utilise donc une avance rapide `HEAD:main` depuis le checkout de travail validé, sans force-push. La confirmation publique après publication (commit, statut Vercel/CI et smoke test isolé) sera conservée hors Git dans `/Users/dreano/Downloads/sitegoat-v9-rollback-20261022/evidence/production.json`, afin de pouvoir identifier le commit contrôlé après sa création sans cycle de hash dans le rapport. Si ce fichier est absent, aucune preuve de publication ne doit être supposée. Le compte rendu final donne le résultat effectivement observé.

[Retour arrière sans perte](RISQUES_ET_ROLLBACK_V9.md) · [Guide](GUIDE_UTILISATEUR_V9.md) · [Liste des fichiers](FICHIERS_MODIFIES_V9.md).

## Complément 2.1.1 — actualité rapide sans plafond de quantité

À la demande de l’utilisateur, suppression du maximum de 500 éléments dans le contrat compagnon et de la cible éditoriale de 20–60 titres. Toutes les nouveautés distinctes peuvent être incluses : 100, 600 ou davantage, dans le budget de taille existant. Le dépassement de 512 Kio du compagnon reste un refus explicite, jamais une troncature silencieuse. Le HTML reste limité à 10 Mio ; le V7 et son budget restent inchangés.

La liste affiche initialement 30 titres pour la fluidité, avec « Afficher 30 titres de plus » et « Tout afficher ». La recherche porte sur tous les titres. Tests réels de cette révision : lint PASS ; build TypeScript/PWA PASS (40 entrées, 1459,44 Kio) ; 322 tests unitaires PASS, dont import et indexation sans troncature de 100 et 600 brèves synthétiques ; 12 parcours E2E PASS sur Chromium, WebKit et Chromium mobile, dont import de 100 brèves, recherche de la 100e, affichage intégral et filtre de 50 résultats. Les parcours de lecture du vrai HTML fourni sont rejoués avec ses 19 titres inchangés. Preuves : `docs/evidence/v9/quantity-{lint,build,unit,e2e}.txt` et `quantity-e2e.json`.

La suite complète de 257 cas et les 4 contrôles de performance ci-dessus concernent la 2.1.0 ; ils ne sont pas présentés comme rejoués localement sur cette correction. La CI GitHub de la 2.1.0 (commit 2f974253f1a978ffd432d010bffa9d9675f26dfb, run 39810117157) est terminée avec succès. La nouvelle publication déclenche sa propre CI ; la preuve de production externe en conserve le statut observé. Aucune nouvelle migration ni dépendance.
