# Journal 360 — correction de la lecture des éditions

Rapport historique : la projection documentaire décrite ici a été retirée à la demande suivante. Voir [Lecture du HTML d'origine](JOURNAL360_ORIGINAL_HTML.md) pour le comportement actuel.

Date : 21 octobre 2026. Référence : `85d280e238c89e8ad47c3776128e82277d5557a0`.
Branche réversible : `codex/fix-unified-edition-reading`.

## Défaut reproduit et correction

Les HTML réels de 08 h, 10 h et 16 h contiennent une enveloppe vide dont les scripts construisent le magazine à partir de `script#unifiedData`. Le lecteur sécurisé désactive justement ces scripts : son centre restait vide. Les anciens tests vérifiaient le titre et les articles natifs de l'application, sans vérifier les récits visibles dans le cadre importé. Ce contrôle était insuffisant.

Le lecteur produit maintenant une présentation documentaire statique lorsque les récits complets ne sont pas déjà présents dans le HTML. Il utilise exclusivement les données passant le validateur existant, avec construction du DOM par `textContent`. Il restitue les récits, limites, actions, sources, données économiques, jalons, annexes Future et prompts Markdown intégraux. Un sommaire local permet de naviguer entre les articles. L'ouverture d'un article sélectionné place son récit en premier et conserve les autres.

Les octets originaux, leur empreinte et leur sauvegarde restent inchangés. Le mode sécurisé conserve `sandbox=""`, la CSP restrictive et zéro script. Les magazines statiques existants gardent leur présentation. Le mode interactif existant reste explicite. Cette présentation sécurisée ne reproduit pas les commandes JavaScript propres au producteur ; les commandes de l'application conservent notamment les téléchargements `.md` et les questions Google.

Dans Aujourd'hui, Développer étend la carte sur toute la largeur de la zone de lecture et amène son titre dans la vue. Réduire restaure la grille et le focus du titre. La couverture PARTIAL ne prétend plus qu'une contradiction existe lorsqu'aucun conflit local n'est établi. L'avertissement documentaire reste visible une seule fois, au-dessus des diagnostics.

## Données réelles vérifiées

| Édition du 21 octobre | Articles | Données économiques | Jalons IA/Futur | Dossiers Future | Prompts |
| --- | ---: | ---: | ---: | ---: | ---: |
| 08 h | 4 | 4 | 5 | 0 | 2 |
| 10 h | 8 | 4 | 6 | 0 | 3 |
| 16 h | 16 | 7 | 8 | 0 | 3 |

Les empreintes des fichiers locaux sont dans [input-files.json](evidence/reading-fix/input-files.json). Leurs contenus ne sont pas copiés dans le dépôt. Le statut PARTIAL du producteur demeure PARTIAL. Les créneaux 12/14 h non importés ne deviennent ni des articles manquants ni une autonomie dégradée. Aucune certification factuelle des nouvelles n'est ajoutée.

## Résultats vérifiables

| Contrôle | Verdict | Preuve |
| --- | --- | --- |
| Reproduction sur code de référence figé | PASS : 5 tests échouent, 1 passe, défaut détecté | [baseline-unit.txt](evidence/reading-fix/baseline-unit.txt) |
| Lint, typage et build | PASS | [lint](evidence/reading-fix/final-lint.txt), [typage](evidence/reading-fix/final-typecheck.txt), [build](evidence/reading-fix/final-build.txt) |
| Suite unitaire complète | PASS : 310 tests, 26 fichiers | [final-unit.txt](evidence/reading-fix/final-unit.txt) |
| Nouveaux tests unitaires sur les vrais HTML | PASS : 6 tests | [real-unit.txt](evidence/reading-fix/real-unit.txt) |
| Nouveaux parcours sur les vrais HTML, Chromium/WebKit/mobile | PASS : 15 tests | [real-browser.txt](evidence/reading-fix/real-browser.txt), [JSON](evidence/reading-fix/real-browser.json) |
| Suite navigateur complète | EN COURS | Journal conservé à la fin de l'exécution |
| Schémas, stockage, sauvegardes, sync, Google, Future, SW, API et configuration | PASS : 27 fichiers protégés inchangés | [protected.json](evidence/reading-fix/protected.json) |
| Recherche de préfixes de secrets, fichiers modifiés et build | PASS sur ce périmètre ; audit global PARTIAL | [secrets.json](evidence/reading-fix/secrets.json) |

Les parcours réels importent chaque fichier seul dans une base navigateur isolée, passent hors ligne puis vérifient chaque récit complet dans le cadre, le sommaire, l'absence d'exécution des scripts et chaque prompt intégral. Un parcours importe aussi 08/10/16 h ensemble, contrôle les 16 articles, les diagnostics et les octets des téléchargements Markdown. La suite existante couvre les imports historiques/JSON/Future, les sauvegardes/restaurations, la synchronisation simulée, la recherche et les questions Google, la PWA et les protections du lecteur.

Échecs intermédiaires conservés : [initial-browser-failures.txt](evidence/reading-fix/initial-browser-failures.txt). Deux sélecteurs de tests étaient ambigus/inexacts ; ils ont été corrigés avec l'identifiant du prompt et le libellé réel du bouton retour. Une fixture 16 h omettait une annexe Future antérieure : le garde-fou signalait correctement INCOMPLETE ; la fixture a été corrigée, sans affaiblir le garde-fou. Aucun nouveau test désactivé. Le seul test ignoré de la suite complète est le test tactile natif WebKit préexistant. Aucune régression détectée dans ces suites. Verdict global : PASS sur le périmètre fonctionnel testé ; les limites NON TESTÉ et l’audit global de secrets PARTIAL restent explicites.

Le scanner global historique détecte un contrôle positif synthétique inchangé dans `tests/googleAiSession.unit.test.ts`. Il n'est pas présenté comme PASS global. La vérification de cette correction porte sur les nouveaux fichiers, les fichiers modifiés et `dist`, sans lire les `.env` ni les profils.

## Présentation, performance et limites

Captures synthétiques contrôlées visuellement : [lecture bureau](evidence/reading-fix/safe-article-desktop.png), [lecture mobile](evidence/reading-fix/safe-article-mobile.png), [carte développée](evidence/reading-fix/expanded-today.png), [édition](evidence/reading-fix/safe-reader-desktop.png).

Build : JavaScript 1 018 633 → 1 025 394 octets (+6 761) ; CSS 63 326 → 63 410 octets (+84) ; précache 1 427,48 → 1 434,16 Kio. Aucune dépendance ajoutée. [Mesures](evidence/reading-fix/bundle.json). Il s'agit de tailles de build, pas d'un benchmark temporel ou d'une mesure sur téléphone physique.

NON TESTÉ : profil personnel de production, données privées du cloud, appareil physique et lecteur d'écran réel. La synchronisation et les appels Google sont testés avec les simulations existantes ; aucune donnée personnelle ni migration distante n'est utilisée. La présentation dynamique originale exige toujours l'activation volontaire du mode interactif.

## Sauvegarde et rollback

Sauvegarde locale du code avant modification : `/tmp/sitegoat-reader-reference-85d280e.tar`, SHA-256 `d7ea3267550cc5dd7a5e68311b7386c1f5044bba2a5e361df80613bc47ed2f3a`.

Les fichiers applicatifs testés sont identifiés dans [source-files.json](evidence/reading-fix/source-files.json). Les anciens artefacts générés par les tests sont restaurés à leur version de référence avant commit ; les nouvelles preuves restent dans `docs/evidence/reading-fix/`. Aucune archive importée n'est supprimée. Aucune migration n'est nécessaire. Pour revenir en arrière : créer un revert du commit de cette correction, tester puis publier ce revert ; les données IndexedDB et sauvegardes restent compatibles. Ne pas effacer les données du navigateur pour mettre à jour la PWA.
