# Rapport de validation V6 — 14 octobre 2026

**État global : PARTIAL.** L’implémentation locale et les suites exécutées passent ; fichiers du producteur réel, appareils physiques et cloud réel restent non validés. Aucun PASS ci-dessous ne désigne la production. Base `b1fc804`, version locale `2.0.0-local.1`, worktree `journal360-v6-worktree`.

## Environnement et isolation

macOS arm64, Node24.21.0 ; React19.3.0, Dexie4.4.6, Zod4.6.7, Supabase JS2.117.3, Vite8.3.4, Vitest5.0.4, Playwright1.64.0, plugin PWA1.3.0. Dépendances installées réutilisées par symlink, graphe du lock comparé à la base : inchangé. `npm ci` **NON EXÉCUTÉ**, aucune installation nécessaire. Versions dans [environment.txt](evidence/v6/environment.txt).

Copie baseline sans .env.local sur port4180 ; worktree sans .env.local sur4181. Preview cloud désactivé ; proxy bloquant l’externe sur4199 pour la suite finale. Les destinations Google sont interceptées et servies par les tests, aucune recherche réelle. IndexedDB des profils Playwright/fake-indexeddb et bases temporaires uniquement ; aucune bibliothèque personnelle ni session propriétaire.

## Baseline réellement exécutée avant mutation

| Commande | Résultat | Preuve |
|---|---|---|
| npm run lint | PASS,1,72s | baseline-lint.log |
| npm run typecheck | PASS,3,45s | baseline-typecheck.log |
| npm run build | PASS,4,70s | baseline-build.log |
| npm test | PASS,73 tests,7,60s durée commande | baseline-unit.log |
| npm run test:e2e | FAIL initial,30/32,70,73s | baseline-e2e.log |
| reprise des deux scénarios sécurité | PASS,2/2,5,64s | baseline-e2e-port-retry.log |
| npm audit --omit=dev | PASS,0 vulnérabilité production | baseline-audit-production-dependencies.log |
| reproduction métadonnées V6 | PASS (problème confirmé) | baseline-v6-reproduction.log |

Les deux échecs baseline étaient des assertions `localhost:4173` alors que le harnais isolé servait4180 ; assertions du harnais adaptées puis les deux scénarios réexécutés. Pas de prétention de32/32 au premier essai. La reproduction montre : métadonnées V6 ignorées, révision externe3 devenue compteur local1 et instant sourceVerifiedAt tronqué à la date. [Résultats baseline](evidence/v6/baseline-results.json).

## Suites finales

| Commande | Statut réel | Preuve |
|---|---|---|
| npm run lint | PASS | [sortie](evidence/v6/final-lint.log) |
| npm run typecheck | PASS | [sortie](evidence/v6/final-typecheck.log) |
| npm run build | PASS, bundle et service worker générés | [sortie](evidence/v6/final-build.log) |
| npm test | PASS,128/128,8 fichiers,7,17s | [sortie](evidence/v6/final-unit.log) |
| npm run test:e2e | PASS,47/47,3,6min | [sortie](evidence/v6/final-e2e.log), [JSON complet](evidence/v6/final-e2e-results.json) |
| npx vitest run --config vitest.performance.config.ts | PASS,3 charges,24,22s | [sortie](evidence/v6/performance.log), [mesures](evidence/v6/performance.json) |
| npm audit --omit=dev --json | PASS,0 vulnérabilité production | [audit](evidence/v6/final-audit.json) |
| contrôle source/bundle/isolement | PASS pour motif connu, pas preuve de tout secret inconnu | [contrôles](evidence/v6/isolation-checks.json) |
| patch appliqué puis inversé sur copie temporaire | PASS, fichiers identiques à la base après inversion | [preuve](evidence/v6/rollback-check.json) |

E2E :19 Chromium bureau +19 WebKit bureau +9 Chromium Pixel7 simulé. Firefox indisponible : NON TESTÉ. WebKit Playwright n’équivaut pas à un Safari iOS physique. Les captures ne contiennent que des fixtures synthétiques. Revue visuelle effectuée sur Journée390px et lecteur paysage900px : textes, historique, source, commandes et zoom visibles ; nav basse fixe normale en capture pleine page.

## Couverture d’acceptation

| Scénario | Statut et preuve |
|---|---|
| 08→16→21,1 journée/3 versions, octets SHA et téléchargement | PASS unités v6 et E2E v6 scénario1 |
| répétition même SHA, renommage, choix indépendant, imports simultanés | PASS unités data/v6, pas de perte notes/favoris |
| 08→21, 21→16→08, conflit même révision/hash différent | PASS unités v6 ; conflit E2E scénario2 |
| J/J+1 vide, aucune actualité de veille inventée | PASS unités et E2E v6 scénario2 |
| perte d’event_id, correction, retrait déclaré, PARTIAL/UNKNOWN | PASS unités v6, version fiable préservée |
| ISO offset conservé, calendrier impossible, DST Paris | PASS unités v6 |
|2000 articles acceptés,2001 limité avec avertissement, IDs dupliqués | PASS unités v6 |
|HTML générique, JSON legacy/paires sources, démos, event_id longitudinal | PASS data unités + E2E app |
|fichiers originaux V1/V4/V5.2/V5.3 et vrai V6 | NON TESTÉ, non fournis ; pas confondre contrat legacy avec toutes les versions producteur |
|HTML vide, encodage UTF-8 invalide, mauvais format, >10 MiB, JSON malformé | PASS unités data/v6 ; parsing sans exécution |
|quota/échec deuxième fichier/rollback lot | PASS unités v6, simulation QuotaExceededError ; vrai disque saturé NON TESTÉ |
|images data embarquées/offline | PASS décodage PNG synthétique E2E ; gros HTML illustré réaliste NON TESTÉ |
|XSS/iframe/CSP/storage/fetch/top/popup | PASS unités isolation et E2E sécurité ; navigation propre du cadre : risque ouvert décrit dans SECURITY, pas garantie réseau totale en interactif |
|sans allow-same-origin/popups/forms/navigation, CSP parent et cadre inchangées | PASS assertions E2E + diff statique |
|Google v1 URL hostile : domaines voisins, userinfo, ports, http/javascript,//, redirects, malformation et longueur | PASS googleAi unités + E2E Google scénario2 |
|messages fenêtre étrangère, origine opaque, ancien cadre, mauvaise version/type/clés, v2 hostile | PASS E2E Google scénario2 et unités v6 |
|capability v1 exacte, capability v2 exacte | PASS E2E Google/v6 ; aucun appel externe en réponse |
|En savoir plus : sept sections synthétiques et lien dynamique | PASS v6 scénario4, Google scénario1 |
|confirmation/Annuler/Échap/focus/clavier et pas ouverture sur message | PASS E2E Google et axe dialogue |
|v1 ouverture sur clic actif/noopener/noreferrer, note privée absente | PASS E2E Google scénario3 |
|v2 question modifiée/copier/ouvrir entrée sans query, double ouverture empêchée | PASS v6 scénario4,3 navigateurs/profils |
|presse-papier refusé, popup simulée rejetée, hors ligne, lecteur sûr sans JS | PASS v6 scénario5 ; popup native iOS NON TESTÉE |
|8 combinaisons thème internes, onglets, zoom70→200%, paysage | PASS fixture synthétique v6 scénario3, pas certification CSS réel producteur |
|320/360/390/430/768/1024/1440/1920 et paysage900×430 | PASS overflow shell/lecteur et contrôles v6 ; legacy6 largeurs aussi ; pas mesure de chaque interaction au clavier virtuel physique |
|axe bibliothèque/lecteur/dialogue/Journée, focus modal, thème shell | PASS scénarios couverts ; audit manuel complet WCAG/lecteur d’écran physique NON TESTÉ |
|offline/rechargement/service worker en attente puis update | PASS E2E app/Google/v6/update |
|Web Share Target et File Handling | PASS API navigateur simulées par E2E ; intégration OS Android/iOS NON TESTÉE |
|migration v1→v4 et v3→v4, UUID/originaux/notes/états/préférence | PASS unités data/v6 ; aucune base personnelle migrée |
|ancien schéma v3 sur DB4 additive | PASS : ouverture Dexie réelle, update archived conserve dayKey/original ; ce n’est pas une conversion versv3 |
|ZIP1 et ZIP2, base vide,1095 originaux, checksum/path adversarial | PASS unités data/v6/performance et E2E restauration |
|conflits de notes inter-éditions, UUID historique de même SHA, répétitions | PASS unités v6 et sync, conservation des ancrages |
|2 appareils simulés, branches, offline, file3 échecs/pas faux succès | PASS mocks unités sync/cloud/v6 ; vrai réseau multiappareil NON TESTÉ |
|inventaire100+ paginé, cycle refusé, ancien serveur100 signalé | PASS mocks client/API ; protocole Storage réel NON TESTÉ |
|reprise21 archives par10+10+1 sans retélécharger/succès prématuré | PASS v6-sync unités ; latence/rate-limit réels NON TESTÉS |
|API auth UID/offset invalide/pagination | PASS mocks backup-api, aucun serveur réel ; rate-limit distribué absent/préexistant |
|diagnostic expurgé borné/absent snapshots | PASS v6-sync, whitelist/code/date/UUID uniquement |
|stockage estimate/persist | inspection statique : existant préservé ; résultat d’octroi sur appareil réel NON TESTÉ |
|secrets/RLS/coûts/quotas compte réel/rotation sessions | NON TESTÉ et non autorisé ; aucune configuration distante modifiée |
|ingestion automatique depuis chat | NON APPLICABLE, aucun canal créé ni promis |

## Mesures30/180/365 jours

Fixture :3 versions par jour,32 KiB aléatoires encodés base64 dans chaque HTML (~49 Ko), JSON synthétique de1/2/3 événements, image pixel intégrée. SHA vérifié pour chaque original, export ZIP, inspection, restauration dans base vide avec note/favori. Ces mesures Node/jsdom/fake-indexeddb ne sont ni un téléphone ni un gros HTML illustré réaliste.

|Jours|Versions|HTML bruts (Mo décimaux)|ZIP (Mo décimaux)|Import total|Groupement|Export|Inspection|Restauration|
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|30|90|4,43|3,24|0,85s|1,42ms|0,29s|0,15s|0,025s|
|180|540|26,58|19,42|3,60s|5,72ms|1,74s|0,75s|0,144s|
|365|1095|53,89|39,38|10,58s|14,77ms|3,73s|1,47s|0,297s|

RSS maximum **aux quatre points de contrôle** :456/732/1142 Mo, même processus successif, dépend de GC et des objets de jsdom ; ni pic garanti ni allocation incrémentale par scénario. Un résultat inférieur à50 MiB ZIP ne valide pas la RAM mobile. Premier rendu/FPS/scroll/batterie/latence Internet/RAM réelle mobile : NON TESTÉS. Mesure de groupement seule, pas rendu React d’une bibliothèque365 jours.

Conséquence déduite : à taille de cet exemple,1095 sauvegardes complètes croissant linéairement vers39,38 Mo produiraient environ21,6 Go cumulés (n×taille_finale/2), hors doublons/transferts entre appareils ; projection, **pas consommation mesurée ni facture**. Le modèle reste O(n²) en octets cumulés si une archive suit chaque import, sans purge. À cette taille finale,3 uploads/jour feraient environ118 Mo/jour. Déduplication d’empreinte/absence de modification/sérialisation existantes limitent les uploads inutiles, mais ne remplacent pas un delta.

Inventaire1095 snapshots =11 requêtes GET par liste ; reprise10 téléchargements ajoute10 demandes de signature et10 transferts ZIP par cycle, puis re-list/upload éventuels. Un passage visible toutes30s et limite60 demandes/min/UID peuvent donc ralentir fortement un nouvel appareil et coûter en réseau ; ce sont calculs du protocole, pas tests Supabase. Prochain travail avant usage annuel mobile : mesurer vrai producteur, navigateur et réseau, puis proposer optimisation ciblée avec migration/rollback. Aucun nouveau service ni suppression automatisée introduit.

## Échecs intermédiaires et réserves

Les anomalies de harnais ont été corrigées : port baseline, sélection mobile trop large (run interrompu après24 réussites), sélecteur textarea (12/15 puis reprise3/3), DB de test diagnostic fermée, supposition erronée de VersionError au downgrade. Les sorties finales ci-dessus viennent d’exécutions ultérieures réussies ; ne pas les présenter comme première exécution sans incident. L’avertissement NO_COLOR/FORCE_COLOR des runners est non bloquant.

La référence .env.local de l’archive n’a pas été copiée. Scan local motif Supabase connu et comparaison lock/CSP/SW/CI/main sans afficher de secret ; pas audit exhaustif d’une fuite inconnue. Aucun navigateur physique, Firefox, fichier privé réel, compte Supabase ou Vercel n’a été utilisé. Une validation locale réussie n’autorise pas un déploiement.
