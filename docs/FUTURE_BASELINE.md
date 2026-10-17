# Référence avant évolution — 17 octobre 2026

## Source retenue et état distant (lecture seule)

| Variante | HEAD | Décision |
| --- | --- | --- |
| journal360-pwa / main local | 7a000d5 | Ancien lecteur 2.0.5 ; branche locale en retard. |
| journal360-reader-release | 7a000d5 | Même base, pas les correctifs Google suivants. |
| journal360-v6-worktree | 0de1c33 | Correctif Google 2.0.6, ancêtre de la source retenue. |
| journal360-claude-fix | 7df8910 | Contient 71f3052 (2.0.7), Articles, navigation ciblée, IA majeur et Sentinel. Base retenue pour préserver les changements de cette conversation. |

Remote confirmé par `git ls-remote` : `adrno496/sitegoat`, main distant `71f3052`, branche de travail distante `7df8910`. Les quatre dossiers sont des worktrees du même historique ; aucune fusion nécessaire. Aucun dépôt de pronostics utilisé. La version du package seule n'est pas le critère de sélection.

Le shell public `https://sitegoat.vercel.app` répond HTTP 200 ; références `/assets/index-CdAZAwLy.js` et `/assets/index-DsfJfvS7.css`, identiques aux noms du dernier build connu de 7df8910. Cette correspondance ne certifie ni le commit déployé ni les parcours en production. Aucun changement distant ni lecture de secrets. Plan et facturation du compte : NON TESTÉ.

Branche locale créée : `codex/le-futur-local` (renommée après le choix utilisateur). Référence de retour : `7df89109842b1dfdc2e987f67d0077be86368f84`.
Copie des seuls fichiers suivis : `/tmp/journal360-ai-radar-baseline-7df8910.tar` ; SHA-256 `a4f0d93e8924a41004d0c5b21e997abfd9bfaa13bafc8e7df3d557d8542498b4`. Ce n'est pas une sauvegarde des données utilisateur IndexedDB ; aucun accès à celles-ci.

## Baseline isolée

Copie extraite dans `/tmp/journal360-ai-radar-baseline-7df8910`, sans `.env.local`, données navigateur ou Git privé. Node 24, npm 11.19.0. `npm ci --no-audit --no-fund` : PASS (531 packages). La première invocation avec `--prefix` depuis un autre dossier a échoué ; relancée depuis le bon cwd, sans modifier le lockfile, elle réussit. Ce premier échec de commande ne prouve pas un défaut du lockfile.

`typecheck`, `lint`, `build`, `test` : PASS avant modification du code fonctionnel. Baseline E2E : 136 PASS, 1 ignoré, 3 FAIL préexistants sur le même cas `v6-daily.spec.ts:127`, Chromium/WebKit/mobile. La date effacée puis rétablie gardait le bouton Enregistrer désactivé après un choix de version sans parent. Le correctif calcule la journée effective dans la condition du bouton, sans changer le regroupement. Baseline performances : 3 PASS (29,56 s). Résultats finaux dans FUTURE_TEST_REPORT.md. Logs conservés sous `baseline-logs/` dans la copie isolée.

Documents lus : ARCHITECTURE.md, SECURITY.md, README.md, TEST_REPORT.md, règles ONE_HTML_PER_DAY, rapports GOOGLE_NAVIGATION et GOOGLE_BUTTONS_V64, code d'import/lecteur/sauvegarde/synchronisation/service worker.

## Risques et ordre des travaux

| Risque | Mesure |
| --- | --- |
| Fusion par date avec un journal | Base Dexie Le Futur indépendante ; refus explicite dans le parseur journal ; routage avant import. |
| HTML hostile / données faisant autorité | Schéma dédié strict, refus des scripts actifs, rendu React texte, iframe sans scripts ni same-origin ; sources importées non certifiées. |
| Perte des versions/notes | Versions et originaux immuables, transactions, sauvegarde IA séparée ; aucune purge. |
| Fuite de transcriptions | Local privé par défaut ; aucun envoi au collecteur ou LLM ; export privé explicite. |
| Fausse veille « live » | Aucun collecteur ni job activé ; fraîcheur non revendiquée. |
| Régression des huit onglets existants | Baseline isolée puis suite complète, Google, cumuls, offline, responsive, sauvegarde/sync. |
| Coûts et permissions distantes | Aucun push, déploiement, migration distante, abonnement ou tâche active. |

Ordre après remplacement de la mission : P0 import/stockage/UI, sécurité et sauvegarde ; P1 comparateur, recherche, exports et suivi personnel ; P2 ingestion authentifiée différée ; rapport et rollback.

Autorisation ultérieure : l’utilisateur a demandé explicitement « à la fin commit push sur le main ». Cette instruction remplace la restriction initiale sur le push automatique ; aucun push forcé, changement cloud ni déploiement manuel n’est prévu.
