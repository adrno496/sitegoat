# Fichiers modifiés et ajoutés — Sitegoat V9

V9 apporte Accueil, Aujourd’hui simplifié, le compagnon des brèves, les filtres Articles, les recherches publiques et les préférences. Les destinations historiques et les données sont conservées.

Nouveaux composants : Dashboard, QuickNews, DisplayProvider/DisplaySettings, ImportDiagnostics, PublicGoogleLink et OriginalActions. Contrat compagnon : quickBriefsSchema/extractQuickBriefs ; indexQuickBriefs conserve les identités et variantes ; hydrateQuickBriefs récupère les anciens imports. Les sélecteurs historiques économiques séparent aussi la fréquence. Le lecteur conserve son document courant lors des rafraîchissements de notes/lecture.

Champ local ajouté : Edition.quickBriefs optionnel. JSON compagnon strict journal360.quickbriefs v1 dans script#quickBriefsData ; corrections[] optionnelles et relatedArticleEventId pour la filiation. Aucun champ V7 ajouté. IndexedDB journal reste v4 et Future v1 ; aucun nouveau magasin/index persistant, aucun SQL. Le ZIP V7 reste v3, avec réextraction du compagnon contrôlé. Préférences V9 dans journal360.display.v9, navigation de session dans journal360.navigation.v9 ; anciennes préférences conservées.

Navigation normale : Accueil, Aujourd’hui, Articles, Paramètres. Rubriques et menu complémentaire conservent les quatre univers, la bibliothèque, la mémoire, la recherche et les outils. L’ouverture initiale demeure Aujourd’hui et le dernier onglet de la session est restauré au rechargement. Les graphiques n’utilisent que des points homogènes sourcés et déclarés vérifiés ; absence d’historique => état vide. Aucune donnée inventée pour enrichir les titres.

Réserves : producteur/registre/automatisation externes non implémentés ; séries IA/cyber/énergie dédiées absentes ; aucun test de données personnelles en production, de téléphone physique ou de lecteur d’écran humain. Voir RAPPORT_TESTS_V9.md et RISQUES_ET_ROLLBACK_V9.md. Aucun secret ni vrai HTML n’est ajouté au dépôt.

## Application et contrats (29)

- [package-lock.json](package-lock.json) — modifié
- [package.json](package.json) — modifié
- [playwright.config.ts](playwright.config.ts) — modifié
- [src/App.tsx](src/App.tsx) — modifié
- [src/config.ts](src/config.ts) — modifié
- [src/data/model.ts](src/data/model.ts) — modifié
- [src/data/quickBriefs.ts](src/data/quickBriefs.ts) — nouveau
- [src/data/quickBriefsSchema.ts](src/data/quickBriefsSchema.ts) — nouveau
- [src/features/ArticlesView.tsx](src/features/ArticlesView.tsx) — modifié
- [src/features/EventCard.tsx](src/features/EventCard.tsx) — modifié
- [src/features/ImportDiagnostics.tsx](src/features/ImportDiagnostics.tsx) — nouveau
- [src/features/PublicGoogleLink.tsx](src/features/PublicGoogleLink.tsx) — nouveau
- [src/features/Reader.tsx](src/features/Reader.tsx) — modifié
- [src/features/backup.ts](src/features/backup.ts) — modifié
- [src/features/dialogFocus.ts](src/features/dialogFocus.ts) — modifié
- [src/features/hydrateQuickBriefs.ts](src/features/hydrateQuickBriefs.ts) — nouveau
- [src/features/import.ts](src/features/import.ts) — modifié
- [src/features/interfacePreferences.tsx](src/features/interfacePreferences.tsx) — modifié
- [src/features/readerActions.tsx](src/features/readerActions.tsx) — nouveau
- [src/features/unified/EconomyRadar.tsx](src/features/unified/EconomyRadar.tsx) — modifié
- [src/features/unified/FutureBridge.tsx](src/features/unified/FutureBridge.tsx) — modifié
- [src/features/unified/UnifiedSearch.tsx](src/features/unified/UnifiedSearch.tsx) — modifié
- [src/features/unified/UnifiedWorkspace.tsx](src/features/unified/UnifiedWorkspace.tsx) — modifié
- [src/features/unified/selectors.ts](src/features/unified/selectors.ts) — modifié
- [src/features/v9/Dashboard.tsx](src/features/v9/Dashboard.tsx) — nouveau
- [src/features/v9/QuickNews.tsx](src/features/v9/QuickNews.tsx) — nouveau
- [src/features/v9/economicHistory.ts](src/features/v9/economicHistory.ts) — nouveau
- [src/features/v9/preferences.tsx](src/features/v9/preferences.tsx) — nouveau
- [src/styles.css](src/styles.css) — modifié

## Tests et outils (20)

- [scripts/capture-v9-local.mjs](scripts/capture-v9-local.mjs) — nouveau
- [scripts/export-quickbriefs-schema.mjs](scripts/export-quickbriefs-schema.mjs) — nouveau
- [scripts/smoke-v9-production.mjs](scripts/smoke-v9-production.mjs) — nouveau
- [tests/e2e/app.spec.ts](tests/e2e/app.spec.ts) — modifié
- [tests/e2e/v6-collections.spec.ts](tests/e2e/v6-collections.spec.ts) — modifié
- [tests/e2e/v6-daily.spec.ts](tests/e2e/v6-daily.spec.ts) — modifié
- [tests/e2e/v6-future-atlas.spec.ts](tests/e2e/v6-future-atlas.spec.ts) — modifié
- [tests/e2e/v6-future.spec.ts](tests/e2e/v6-future.spec.ts) — modifié
- [tests/e2e/v6-google-navigation.spec.ts](tests/e2e/v6-google-navigation.spec.ts) — modifié
- [tests/e2e/v6-improvements.spec.ts](tests/e2e/v6-improvements.spec.ts) — modifié
- [tests/e2e/v6.spec.ts](tests/e2e/v6.spec.ts) — modifié
- [tests/e2e/v7-unified.spec.ts](tests/e2e/v7-unified.spec.ts) — modifié
- [tests/e2e/v8-audit.spec.ts](tests/e2e/v8-audit.spec.ts) — modifié
- [tests/e2e/v8-reading.spec.ts](tests/e2e/v8-reading.spec.ts) — modifié
- [tests/e2e/v8-snapshot.spec.ts](tests/e2e/v8-snapshot.spec.ts) — modifié
- [tests/e2e/v9-workspace.spec.ts](tests/e2e/v9-workspace.spec.ts) — nouveau
- [tests/helpers/navigation.ts](tests/helpers/navigation.ts) — nouveau
- [tests/helpers/v9.ts](tests/helpers/v9.ts) — nouveau
- [tests/v9-contract.unit.test.ts](tests/v9-contract.unit.test.ts) — nouveau
- [tests/v9-history.unit.test.ts](tests/v9-history.unit.test.ts) — nouveau

## Guides et schéma (10)

- [AUDIT_SITEGOAT_AVANT.md](AUDIT_SITEGOAT_AVANT.md) — nouveau
- [FICHIERS_MODIFIES_V9.md](FICHIERS_MODIFIES_V9.md) — nouveau
- [GUIDE_UTILISATEUR_V9.md](GUIDE_UTILISATEUR_V9.md) — nouveau
- [PLAN_V9.md](PLAN_V9.md) — nouveau
- [PROMPT_MAITRE_VSCODE_SITEGOAT_V9_JOURNAL360_V9.md](PROMPT_MAITRE_VSCODE_SITEGOAT_V9_JOURNAL360_V9.md) — nouveau
- [RAPPORT_TESTS_V9.md](RAPPORT_TESTS_V9.md) — nouveau
- [README.md](README.md) — modifié
- [RISQUES_ET_ROLLBACK_V9.md](RISQUES_ET_ROLLBACK_V9.md) — nouveau
- [SPEC_PRODUCTEUR_J360_V9.md](SPEC_PRODUCTEUR_J360_V9.md) — nouveau
- [docs/JOURNAL360_QUICKBRIEFS_V1.schema.json](docs/JOURNAL360_QUICKBRIEFS_V1.schema.json) — nouveau

## Preuves et captures synthétiques (35)

- [docs/evidence/v9/baseline-build.txt](docs/evidence/v9/baseline-build.txt) — nouveau
- [docs/evidence/v9/baseline-e2e.txt](docs/evidence/v9/baseline-e2e.txt) — nouveau
- [docs/evidence/v9/baseline-lint.txt](docs/evidence/v9/baseline-lint.txt) — nouveau
- [docs/evidence/v9/baseline-performance.txt](docs/evidence/v9/baseline-performance.txt) — nouveau
- [docs/evidence/v9/baseline-typecheck.txt](docs/evidence/v9/baseline-typecheck.txt) — nouveau
- [docs/evidence/v9/baseline-unit.txt](docs/evidence/v9/baseline-unit.txt) — nouveau
- [docs/evidence/v9/dependencies.json](docs/evidence/v9/dependencies.json) — nouveau
- [docs/evidence/v9/historical-artifacts-restored.json](docs/evidence/v9/historical-artifacts-restored.json) — nouveau
- [docs/evidence/v9/performance-final.txt](docs/evidence/v9/performance-final.txt) — nouveau
- [docs/evidence/v9/protected-and-security.json](docs/evidence/v9/protected-and-security.json) — nouveau
- [docs/evidence/v9/reader-final.json](docs/evidence/v9/reader-final.json) — nouveau
- [docs/evidence/v9/reader-final.txt](docs/evidence/v9/reader-final.txt) — nouveau
- [docs/evidence/v9/release-build.txt](docs/evidence/v9/release-build.txt) — nouveau
- [docs/evidence/v9/release-e2e.json](docs/evidence/v9/release-e2e.json) — nouveau
- [docs/evidence/v9/release-e2e.txt](docs/evidence/v9/release-e2e.txt) — nouveau
- [docs/evidence/v9/release-lint.txt](docs/evidence/v9/release-lint.txt) — nouveau
- [docs/evidence/v9/release-typecheck.txt](docs/evidence/v9/release-typecheck.txt) — nouveau
- [docs/evidence/v9/release-unit.txt](docs/evidence/v9/release-unit.txt) — nouveau
- [docs/evidence/v9/rollback-integrity.json](docs/evidence/v9/rollback-integrity.json) — nouveau
- [docs/evidence/v9/screenshots/accueil-1440.png](docs/evidence/v9/screenshots/accueil-1440.png) — nouveau
- [docs/evidence/v9/screenshots/accueil-360.png](docs/evidence/v9/screenshots/accueil-360.png) — nouveau
- [docs/evidence/v9/screenshots/accueil-768.png](docs/evidence/v9/screenshots/accueil-768.png) — nouveau
- [docs/evidence/v9/screenshots/aujourdhui-1440.png](docs/evidence/v9/screenshots/aujourdhui-1440.png) — nouveau
- [docs/evidence/v9/screenshots/aujourdhui-360.png](docs/evidence/v9/screenshots/aujourdhui-360.png) — nouveau
- [docs/evidence/v9/screenshots/aujourdhui-768.png](docs/evidence/v9/screenshots/aujourdhui-768.png) — nouveau
- [docs/evidence/v9/screenshots/breves-1440.png](docs/evidence/v9/screenshots/breves-1440.png) — nouveau
- [docs/evidence/v9/screenshots/parametres-1440.png](docs/evidence/v9/screenshots/parametres-1440.png) — nouveau
- [docs/evidence/v9/summary.json](docs/evidence/v9/summary.json) — nouveau
- [docs/evidence/v9/v9-target-browser.txt](docs/evidence/v9/v9-target-browser.txt) — nouveau
- [docs/evidence/v9/source-files.json](docs/evidence/v9/source-files.json) — nouveau

Total : 94 fichiers de livraison (2.1.0 et correction 2.1.1). Les 17 artefacts historiques réécrits par les tests ont été conservés à part puis remis à leur état initial ; ils ne font pas partie du diff. Sauvegarde initiale et logs intermédiaires : /Users/dreano/Downloads/sitegoat-v9-rollback-20261022.

## Correction 2.1.1 — nombre de brèves

Modification de quickBriefsSchema et de son schéma JSON exporté, QuickNews, des tests unitaires et E2E V9, des versions package/config, du contrôle de production et des guides/rapports. Aucun champ V7 ni stockage modifié. Preuves supplémentaires :

- [docs/evidence/v9/quantity-lint.txt](docs/evidence/v9/quantity-lint.txt)
- [docs/evidence/v9/quantity-build.txt](docs/evidence/v9/quantity-build.txt)
- [docs/evidence/v9/quantity-unit.txt](docs/evidence/v9/quantity-unit.txt)
- [docs/evidence/v9/quantity-e2e.txt](docs/evidence/v9/quantity-e2e.txt)
- [docs/evidence/v9/quantity-e2e.json](docs/evidence/v9/quantity-e2e.json)
