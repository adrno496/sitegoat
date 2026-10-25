# SITEGOAT — BILAN DES CORRECTIFS ET DE LA PUBLICATION

**Complément orange du 25 octobre :** voir [11_REPERES_ORANGE_DERNIERE_EDITION.md](11_REPERES_ORANGE_DERNIERE_EDITION.md) pour le repérage des nouveautés et modifications de la dernière édition, les 370 tests unitaires et les 18 tests navigateur ciblés réellement exécutés. Les résultats des publications antérieures ci-dessous restent historiques.

**Compléments utilisateur :** le rapport 09 décrit les dates compactes, titres gras et sources API, publiés au commit `051fae5` (CI verte). Le rapport 10 suit la reprise du 25 octobre : nouvel onglet En direct, suivi API activable et radar Banque mondiale/BCE. Il contient les dernières preuves, le fichier V10 réellement disponible et le rollback de ce complément. La consigne utilisateur remplace l’affichage systématique des statuts SG-10 ; les champs éditoriaux demeurent conservés. Dernier état : **366 unitaires et 301 E2E PASS**, deux skips historiques, aucun échec final ; CI `39a1d09` verte, production et V10 édition20 V2 : trois profils PASS. Le bilan de la publication initiale ci-dessous reste historique ; les dernières limites et preuves sont dans 10.

HEAD initial : `987b5637707ef0af05bb1900fa8e187a96848246`. Branche isolée : `codex/sitegoat-audit-v4-local`. Worktree : `/Users/dreano/Downloads/veille/sitegoat-implementation`. Le dépôt d’origine et ses audits sont conservés. HEAD de publication / résultat production : suivis dans le rapport 08 et les preuves de publication.

Les 14 constats sont traités dans le registre 01 ; aucun ID omis. Les dates et statuts sont contextualisés, la journée absente explicite, les filtres accessibles, les boutons Markdown attachés/détachés fonctionnels après confirmation parent. Les projections de sauvegarde sont vérifiées ; les recherches sont sérialisées sous Web Locks avec conflit visible et brouillon préservé. Les deux alertes dev ont une correction ciblée. Aucun original, état ou note personnel n’a été migré ou supprimé.

| Lot | Conclusion locale |
|---|---|
| A — fondations | PASS : baseline établie, SHA taille constante et mutants détectables |
| B — lecteur | PASS sur périmètre testé : confiance explicite, sandbox inchangée, 5 prompts réels natifs et replis dans 3 configurations |
| C — temps/preuves | PASS sur périmètre testé : instants Z/offset/DST, dates manquantes, minuit et focus |
| D — interface | PASS : filtres présents, sauvegarde Journaux nommée exactement |
| E — sauvegarde volumineuse | PARTIAL : chemin segmenté testé à 4001 petits fichiers, budget et erreurs ; mémoire globale non bornée et gros corpus mobile non certifié |
| F — intégrité/concurrence | PASS sur périmètre testé : projections, trois espaces personnels exercés, vrais onglets, restauration vide |
| G — maintenance | PASS local : installation propre, audit et check final verts |
| H — options | PASS pour l’étude des huit options ; O-02/O-07/O-08 réalisés, O-05 prototype léger ; O-01/03/04/06 reportés avec tests décisifs |

Tests finaux : **345 unitaires PASS / 0 FAIL / 1 skip ; 289 E2E PASS / 0 FAIL / 1 skip**. Le `npm run check` complet est vert, Chromium/WebKit/mobile émulé. Compléments : parser réel2, vrai HTML3, restauration personnelle3, session3, performance4 PASS. Six mutations critiques donnent toutes l’échec attendu dans des copies jetables. Les historiques et essais intermédiaires en échec restent documentés, sans suppression d’assertion.

Conservation : 13 exemples locaux relus et comparés à leurs SHA initiaux, inchangés ; référence 282997 octets, SHA `8ae5eb2bea9dde338b09ba73d3b0082d278fb0ebf9d1472a9db479e6e111e45c`. Les ZIP 1/2/3 restent reconnus. Pas de nouvelle version de base ni de migration automatique de bibliothèque. Ancien V7 sans projection : reconstruction depuis l’original avec avertissement ; titre personnel et notes conservés. Les HTML historiques sans contrat reconnu conservent leur contrat SHA mais ne sont pas certifiés par reconstruction éditoriale.

La sauvegarde personnelle annonce trois espaces séparés, pas une transaction globale : journaux, Futur, réglages/recherches. Sessions, tokens, cloud technique et permissions interactives sont exclus. Le JSON de réglages se restaure avec ce candidat ; une fois les clés relues/écrites, l’ancien client retrouve les mêmes formats. Les segments sont des ZIP historiques ; l’ancien client les relit un par un, en contrôlant l’inventaire manuellement.

Performance : recherche sur 1000 articles ~3–4 ms dans le protocole local ; import/index ~0,7–0,8 s. Démarrage sans corpus : trois froids par build, variation de ~175–260 ms baseline et ~202–214 ms candidat ; aucun gain causal revendiqué. L’essai 1095 versions/54 Mio bruts a atteint ~957 Mio RSS aux checkpoints Node : ce n’est pas une preuve de RAM acceptable sur téléphone. La segmentation évite un seul ZIP géant mais le snapshot et les blobs compressés restent en mémoire.

La plus forte objection est cette limite mémoire, suivie de l’absence de preuve cloud/appareil physique. Les contre-épreuves démontrent la détection des six barrières précises, pas l’absence générale de faille. Pas de RLS/bucket effectifs inspectés, de sync distante multi-appareil, de quota disque physique, d’arrêt OS ou de test iOS/Android réel. Pas de certification WCAG globale ni de lecteur d’écran/zoom navigateur natif complet. Un ancien client sans verrou ne doit pas écrire simultanément les recherches.

Commits locaux par étape :

```text
a8f0508 test(sitegoat): establish isolated baseline and constant-length SHA regression
ec1dff3 test(sitegoat): reproduce detached downloads with isolated browser harness
2d9aa03 fix(reader): relay detached Markdown with frame sessions and parent confirmation
5897543 fix(editorial): show publication and evidence dates and compare real instants
ab9a90f fix(interface): keep filters discoverable on every display profile
624e731 fix(reader): require first-use trust and prevent duplicate parent downloads
ef1ee29 fix(editorial): label historical edition dates explicitly
4df54bc fix(backup-ui): name journal backup scope and expose separate spaces
29a9e0c feat(backup): add bounded historical ZIP segments and atomic merged restore
5edaf80 fix(integrity): reconcile backup projections and serialize recurring searches
cc488d6 chore(deps): patch the two audited development dependency chains
b26198a fix(sitegoat): complete safety regressions and add explicit personal reading tools
```

Fichiers d’implémentation/tests/outils touchés :

```text
package-lock.json
playwright.config.ts
scripts/serve.mjs
scripts/sitegoat-browser-mutations.mjs
scripts/sitegoat-mutations.mjs
scripts/sitegoat-startup.mjs
src/App.tsx
src/data/unified.ts
src/features/ArticlesView.tsx
src/features/EventCard.tsx
src/features/ImportDialog.tsx
src/features/PersonalBackupTools.tsx
src/features/Reader.tsx
src/features/ReaderDefaults.tsx
src/features/SegmentedBackupTools.tsx
src/features/backup.ts
src/features/editorialPresentation.tsx
src/features/import.ts
src/features/personalSettingsBackup.ts
src/features/readerActions.tsx
src/features/readingExports.ts
src/features/segmentedBackup.ts
src/features/unified/EconomyRadar.tsx
src/features/unified/UnifiedWorkspace.tsx
src/features/v9/Dashboard.tsx
src/features/v9/QuickNews.tsx
src/features/v9/RecurringSearches.tsx
src/features/v9/preferences.tsx
src/features/v9/recurringSearchStorage.ts
tests/e2e/app.spec.ts
tests/e2e/v6-collections.spec.ts
tests/e2e/v6-future-atlas.spec.ts
tests/e2e/v6.spec.ts
tests/e2e/v7-unified.spec.ts
tests/e2e/v8-audit.spec.ts
tests/e2e/v9-recurring-searches.spec.ts
tests/e2e/v9-sitegoat.spec.ts
tests/e2e/v9-workspace.spec.ts
tests/helpers/v9.ts
tests/local/sitegoat-personal.spec.ts
tests/local/sitegoat-real.spec.ts
tests/local/sitegoat-real.test.ts
tests/local/sitegoat-security.spec.ts
tests/sitegoat-backup.unit.test.ts
tests/sitegoat-integrity.unit.test.ts
tests/sitegoat-options.unit.test.ts
tests/sitegoat-personal.unit.test.ts
tests/sitegoat-projection.unit.test.ts
tests/sitegoat-time.unit.test.ts
tests/support/block-network.mjs
```

Rollback non destructif : conserver les trois sauvegardes et tous les segments hors navigateur. Revenir au commit initial dans un **autre** worktree sur un profil de test, sans reset/clean ni suppression de base. Pour retirer le candidat sur main, préparer des reverts en ordre inverse sur branche dédiée, traiter les helpers partagés comme un ensemble, rejouer check et tests de restauration avant une publication séparée. Les commits intermédiaires ne sont pas tous des releases autonomes ; la compatibilité des formats est couverte par les tests, mais la séquence Git de reverts n’a pas été exécutée. Un retour au code initial réintroduirait les défauts initiaux et les échecs E2E de baseline. Aucun effacement de notes, journaux ou préférences n’est une étape de rollback. Voir 02 pour les limites des clients anciens.

Mandat de publication : initialement interdit, puis **explicitement autorisé par l’utilisateur** en cours de mission pour main et le test V10 après production. Aucun force-push ou migration réelle autorisé. Push non forcé main réussi au commit `1a06ce7`, déploiement Vercel vérifié par SHA du bundle. Le V10 est testé ensuite en production : 3 PASS, 34 articles/54 brèves/11 prompts, 11 natifs et 11 replis exacts par configuration, original intact et hors ligne. Aucun merge supplémentaire, force-push ni migration de données réelles. Voir 08 et ses reçus pour les essais intermédiaires et limites de cadence Chromium.

État local : **PASS SUR PÉRIMÈTRE TESTÉ**, avec **PARTIAL pour les très gros volumes/mémoire mobile**. Le rapport ne revendique ni complétude universelle ni sécurité totale.
