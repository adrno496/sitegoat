# Le Futur — refonte de l’atlas, P0 et P1

Référence : 5e61d02ca4403e2f117c1a349e35366924228d37, dépôt adrno496/sitegoat. Validation locale sur codex/future-atlas-ui. Après cette validation, l’utilisateur a explicitement demandé le commit et le push sur main ; aucun déploiement manuel n’est demandé. Résultat local vérifié ; acceptation conditionnelle aux contrôles manuels signalés.

## Référence et sauvegarde

Racine vérifiée : /Users/dreano/Downloads/veille/veille, distincte du dossier personnel ; remote GitHub attendu. Arbre propre au départ. Archive des fichiers suivis : /tmp/journal360-atlas-baseline-5e61d02.tar, SHA-256 48ce67e8364c991ef186cd038de3b572986c0f070accb8032fcebedd5220c4c0. Copie isolée dans /tmp/journal360-atlas-baseline-5e61d02, dépendances existantes réutilisées sans modification du lockfile ni lecture de secrets.

Les données du profil utilisateur et de production n’ont pas été ouvertes/exportées. Elles ne sont pas incluses dans l’archive Git. Les captures et benchmarks utilisent de nouveaux contextes de navigateur et le seul exemple synthétique fourni (3 scénarios, 6 jalons, 1 signal, 3 actions). Aucun export de données privées réelles n’a été effectué. Les ZIP de test sont créés et restaurés par les parcours existants sur des bases isolées.

## P0 — premier diff

Accueil éditorial et zone de reprise en premier, résumé calculé sur les dernières versions, navigation secondaire et accès aux sauvegardes sous « Sauvegarde et ressources ». Les filtres se replient sur mobile et gardent recherche, statut, horizon, décision éditoriale, favoris et pagination. Typographie de lecture 16 px, cibles principales 44 px et focus explicite. Les styles restent dans future.css et sont limités à l’espace Le Futur.

Premier contrôle local : typecheck, lint, build et 263 tests unitaires réussis (p0-checks-3.log). Les deux premiers contrôles ont détecté un nom local masquant document et un alias inutilisé ; ils ont été corrigés, les échecs sont conservés dans les logs.

## P1 — atlas interactif

FutureTimeline : horizons réels, repères 2027/2030/2035/2040+, années intermédiaires conservées, précédent/suivant et flèches/Home/End. Jalons paginés par 12, avec accès à tous les éléments et relations exclusivement déclarées.

FutureScenarioCompare : trois trajectoires côte à côte sur desktop, autres trajectoires séparées, vue compacte/détaillée, objections et sources dépliables. Aucune courbe quantitative ou probabilité fabriquée.

FutureSignals : quatre statuts avec texte et symbole, sources et dates déclarées. Les champs absents (critères explicites de confirmation/réfutation, inconnues structurées) sont indiqués « Non renseigné ». Les objections et déclencheurs des scénarios ne sont pas assimilés à des preuves du signal.

FutureActions : feuille de route par horizon, statuts locaux, résultats, test décisif, effort documenté seulement. Une sauvegarde explicite confirme la persistance ; un échec garde le brouillon et n’augmente pas la progression.

FutureDetail, FutureSources et FuturePersonalNotes conservent versions, historique, exports, original, aperçu isolé, revues personnelles, notes et décisions. hooks.ts et selectors.ts isolent la lecture réactive et les calculs. Aucun schéma, importeur, migration, mécanisme ZIP ou synchronisation n’a été réécrit. Les empreintes de 16 fichiers protégés sont identiques à la référence (protected-files.json). Aucune dépendance ajoutée.

Les seules animations de l’atlas sont des transitions opacity/transform de 200 ms déclenchées par un changement de période. Elles respectent le choix du fichier, la commande Animations : Réduites et prefers-reduced-motion. Aucun mouvement automatique durable. L’aperçu isolé utilise en plus une feuille de style statique appartenant à l’application ; le JSON, les originaux et l’export HTML portable ne changent pas.

## Vérifications

Les logs et captures se trouvent dans [evidence/future-atlas](evidence/future-atlas/). L’index des résultats est [validation.json](evidence/future-atlas/validation.json). Le diff des sources, tests et outils, y compris les nouveaux fichiers, est fourni dans source.patch ; source-files.json identifie les fichiers vérifiés par SHA-256.



| Contrôle | Statut | Preuve / portée |
| --- | --- | --- |
| Référence : lint, typecheck, build | PASS | baseline.log |
| Référence : unitaires / E2E / performance | PASS | 259 unitaires ; 157 E2E réussis, 1 ignoré ; 4 benchmarks. |
| Diff final : typecheck, lint, build | PASS | preview-motion-fixed.log et all-future-final.log ; avertissement de bundle principal >500 kB préexistant. |
| Unitaires finaux | PASS | 263 tests, dont invariants 0/1/nombreux éléments et les deux injections de données. |
| Parcours Le Futur complets | PASS | 42 tests, Chromium / WebKit / Pixel 7 émulé (all-future-final.log). |
| Suite globale finale | PASS | 181 réussis, 1 ignoré, 0 échec et 0 flaky ; 608,997 s. validated-full.log. |
| Benchmarks finaux | PASS | 4 tests, dont 1 000 dossiers Le Futur ; 34,02 s. |
| Imports, versions, originaux, ZIP | PASS sur parcours testés | HTML/JSON valides, conflits et fichiers hostiles ; ancien ZIP restauré, export JSON strictement égal au dossier initial. |
| Clavier, focus, reflow, contraste | PASS sur parcours testés | Axe WCAG A/AA, y compris tags WCAG 2.2 ; 320/390/768/1440 ; cibles mesurées ; import annulable par Escape ; Enter/Espace/Tab et flèches/Home/End ; retour à une carte ou au titre de liste. |
| Réduction de mouvement | PASS | Préférence système, commande persistante et aperçu statique ; contrôle négatif détecte une animation injectée puis repasse après retrait. |
| Erreurs de stockage | PASS sur simulations | Quota : écriture refusée, brouillon conservé et progression inchangée, reprise puis rechargement ; base Le Futur indisponible : erreur visible et Bibliothèque accessible. |
| Test des tests | PASS | 2 injections de données (jalon futur observé et preuve absente) + 2 mutations temporaires du DOM (contrôle inaccessible et animation persistante). Retours conformes vérifiés. |
| Autres onglets : géométrie/styles | PASS sur 8 vues stables vides | Bibliothèque, Articles, IA majeur, Sentinel, desktop/mobile, après chargement de la CSS Le Futur. 16 fichiers protégés identiques. |
| Autres onglets : PNG strict | PARTIAL / contrôle strict FAIL conservé | 4 mobiles identiques ; chacun des 4 desktop diffère de 3 pixels sur une extrémité du titre. Titres, contrôles et positions mesurés identiques ; pas de promesse d’identité au pixel près. Voir comparaison et pixel-differences.json. |
| Zoom | PARTIAL | Agrandissement CSS de l’atlas à 200 % et reflow étroit vérifiés ; le zoom natif du navigateur sur appareil réel n’a pas été automatisé. |
| Lecteur d’écran humain, téléphone physique, compréhension en 30 s | NON TESTÉ | Arbres d’accessibilité et émulation fournis, sans équivalence avec VoiceOver/TalkBack ou un essai utilisateur. |
| Données réelles, sauvegarde de profil de production | NON TESTÉ | Données utilisateur non ouvertes ; aucune archive Git ne les sauvegarde. |
| Publication et CI distante | LIVRAISON AUTORISÉE | Commit et push sur main demandés après validation ; consulter GitHub Actions pour le résultat du commit livré. Aucun déploiement manuel ni configuration de services modifiée. |

## Performances avant/après

Mesures reproductibles via scripts/measure-future-atlas.mjs contre les prévisualisations locales. Un seul dossier synthétique ; 5 navigations chaudes, RPC Playwright inclus, puis 40 frames de défilement scripté. Checkpoints du tas JavaScript via CDP, pas un pic de mémoire totale. Les scripts avant/après sont exécutés successivement avant la suite E2E.

| Largeur | Entrée médiane, avant → après | Ouverture dossier, avant → après | Tas JS, avant → après | Frame p95, avant → après |
| --- | --- | --- | --- | --- |
| 1440 | 56,4 → 57,6 ms | 50,1 → 47,9 ms | 10,47 → 10,78 Mo | 16,8 → 16,7 ms |
| 768 | 55,5 → 56,9 ms | 51,7 → 47,0 ms | 10,47 → 10,59 Mo | 16,7 → 16,7 ms |
| 390 | 55,8 → 56,4 ms | 51,7 → 48,1 ms | 10,75 → 10,69 Mo | 16,7 → 16,8 ms |

TaskDuration sur l’ensemble navigation/captures/défilement : 1440 px : 0,229 → 0,264 s ; 768 px : 0,224 → 0,259 s ; 390 px : 0,224 → 0,243 s. Le surcoût observé est déclaré ; 5 mesures ne permettent pas de garantir l’absence de différence perceptible. Défilement demandé : 40 × 110 px ; trajet réel desktop 4 275 → 4 400 px (la référence atteint sa fin de page), autres largeurs 4 400 px avant/après. Débit commandé observé : environ 6 400–6 600 px/s ; ce résultat n’est pas un geste tactile humain.

Les mesures utilisent le même Chromium desktop redimensionné, sans simulation d’un CPU mobile. Le LCP/CLS concerne le shell initial, pas l’entrée SPA : LCP 148–156 ms ; CLS 0–0,011. Les mesures à froid, sur réseau lent et sur appareil physique restent NON TESTÉES. Les petits échantillons ne sont pas une certification Core Web Vitals ou 60 fps.

JS principal : 874 054 octets avant/après ; CSS globale 40 665 octets avant/après. Vue chargée à la demande : JS 29 579 → 49 698 octets (gzip niveau 9 : 9 476 → 14 568) ; CSS 2 477 → 14 011 octets (gzip : 932 → 3 261). Précache 1 040,84 → 1 071,75 Kio, toujours 20 entrées. Aucune dépendance ajoutée. [Poids bruts](evidence/future-atlas/bundle-sizes.json) et [mesures navigateur](evidence/future-atlas/browser-comparison.json).

Les quatre benchmarks de stockage restent séparés des mesures UI ; celui de Le Futur exerce 1 000 dossiers et un aller-retour ZIP. Le mécanisme de ZIP en mémoire est inchangé et peut consommer beaucoup de RAM. Il ne prouve pas la tenue de l’atlas sur un appareil physique avec 1 000 gros dossiers.

Pour reproduire : npm run typecheck ; npm run lint ; npm run build ; npm test ; npm run test:e2e ; npm run test:performance. Pour les mesures UI : lancer les previews de la copie de référence et du dossier actuel sur deux ports distincts, puis node scripts/measure-future-atlas.mjs http://127.0.0.1:PORT DOSSIER_SORTIE. Le script refuse une URL distante et bloque les requêtes externes.

## Échecs détectés et traités

Les contrôles initiaux ont détecté le conflit du nom document et un alias inutilisé. Le typage d’un test de style injecté a été corrigé. Les premiers E2E ont exposé un libellé implicite d’Animations ambigu pour getByLabel, puis les menus natifs Safari de moins de 24 px : libellé explicite et contrôles avec appearance:none, hauteur 48 px.

Les tests clavier ont ensuite corrigé des hypothèses de test : deux boutons Effacer les filtres ont la même action et doivent être sélectionnés dans leur panneau ; l’import doit être attendu jusqu’à la fermeture réelle du dialogue. Le helper ne doit pas supposer que l’import ferme le dossier ouvert. Aucun de ces échecs n’a été ignoré ou supprimé.

Le retour à une liste filtrée après retrait d’un favori vise maintenant le titre de la liste quand la carte disparaît. L’aperçu isolé neutralise ses animations CSS. Le premier ajout de ce style a touché l’export au lieu de l’aperçu ; l’assertion sur l’animation l’a détecté et l’emplacement a été corrigé, export rétabli. Les premières suites globales ont été interrompues pour intégrer ces points ; leurs sorties 130 ne sont pas des PASS.

## Limites et retour arrière

Les tests automatisés et les arbres d’accessibilité ne constituent pas un audit WCAG global ni un essai VoiceOver/TalkBack humain. La compréhension en moins de 30 secondes doit être évaluée auprès d’utilisateurs. Les mesures headless, mémoire JavaScript et défilement scripté ne représentent pas un téléphone physique. Le chargement du résumé lit les derniers snapshots par lots de 25 puis n’en garde que les compteurs ; aucune lecture n’est déclenchée par le scroll.

Pour revenir au code de référence sans écraser ce travail : ouvrir une copie de l’archive ou un nouveau worktree détaché de 5e61d02. Ne pas lancer reset --hard, git clean ou une suppression IndexedDB. Les formats de données restent identiques ; le code de référence sait toujours lire les mêmes dossiers et ZIP. Avant toute opération sur un profil réel, sauvegarder les journaux et Le Futur séparément depuis leurs interfaces, puis tester une copie de l’archive. Le diff et ses preuves restent révisables dans le commit livré à la demande de l’utilisateur. Le test décisif restant est un essai sur téléphone réel (Safari et lecteur d’écran), avec zoom natif, puis un utilisateur non expert retrouvant les quatre informations en moins de 30 secondes. L’acceptation reste conditionnelle sur ces points.

Références utilisées : [cibles](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [animation](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions), [focus](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum). Les tests visent les parcours décrits, sans déclaration de conformité globale.

Captures : [avant desktop](evidence/future-atlas/before/home-1440.png), [après desktop](evidence/future-atlas/after/home-1440.png), [frise mobile](evidence/future-atlas/after/timeline-390-viewport.png), [scénarios sombre](evidence/future-atlas/after/scenarios-dark-1440.png). Les variantes tablette et les pages complètes sont dans before/after.
