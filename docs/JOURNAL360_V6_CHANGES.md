# Audit avant mutation — 14 octobre 2026

Base inspectée : b1fc804, journal360-mobile 1.1.1 ; archive de référence non fournie, comparaison des observations uniquement. Aucun fichier V6 producteur fourni.

| Composant/fichier | Existant inspecté | Contrainte et couverture initiale | Risque | Décision |
|---|---|---|---|---|
| package/lock/CI | React 19, Dexie 4, Zod 4, Vite, Workbox, Supabase, tests locaux | Verrou installé, versions réellement listées ; baseline à exécuter | migrations/dépendances | Pas de nouvelle dépendance |
| model.ts | UUID, familyId, révision locale ; aucun champ V6 | Relations états/notes UUID, tests unitaires | Perte de sémantique V6 | Champs optionnels dédiés |
| db.ts | schéma Dexie v3 et transactions | Migration v1→v3 déjà couverte | Downgrade impossible sans export | v4 additive, aucun effacement |
| import.ts | JSON détaché, SHA, générique, sources multi-formes | 10 MiB/20 fichiers/100 MiB ; tests d’intégrité | Timestamp tronqué, métadonnées externes ignorées | Validation V6 et instant conservé |
| commitImport | famille seulement par choix manuel | Tests de version/doublon, pas de modèle jour | Concurrence, branches, cumul incomplet | Transaction, clé de jour et contrôle pur |
| ImportDialog | ignore/keep/version, prévisualisation | Par fichier, pas de rollback de lot complet | Import partiel/quotas | Lot atomique, proposition de journée |
| App.tsx | cartes par version, recherches/notes/favoris | E2E et axe ; états référencés UUID | Double comptage de versions | Journées V6 groupées, legacy inchangé |
| Reader.tsx | interactif automatique, choix safe persistant, texte/zoom 70–150 % | E2E iframe/zoom/offline | Navigation propre du cadre possible | Conserver sandbox, zoom jusqu’à 200 % |
| googleAi.ts | protocole v1 search udm=50, source/origin vérifiés, confirmation | 48 cas unitaires et E2E hostiles historiques | Pas de /ai ni question seule | v2 parallèle, copie et entrée officielle |
| import/iframe | CSP restrictive et sanitization | Aucune permission popup/same-origin/forms | Scripts actifs par défaut | Aucun élargissement ; documenter limite |
| backup.ts | ZIP non chiffré, checksums, restauration transactionnelle | Tests adversariaux et fusion | Manifeste 15 MiB, 1000 éditions/1002 entrées | Compatibilité V6 additive, limiter clairement |
| sync.ts | ZIP complet, empreinte et branches inconnues | Serveur simulé, pas de cloud autorisé | 100 snapshots listés, taille/batterie/coûts | Mesures locales 30/180/365 jours ; aucune purge |
| cloud/API | bucket privé, JWT, signatures, code HMAC | Tests historiques séparés de cette mission | Rate-limit mémoire par instance, secret d’archive | Aucune connexion/procédure distante |
| sw.ts/PWA | shell offline, share target/file handlers | E2E service worker et mise à jour | Limites OS iOS/Android physiques | Conserver ; physique NON TESTÉ |
| vercel.json | SPA/headers/CSP ; Git main déploie | Baseline source uniquement | Push déclencherait production | Aucun push/déploiement, branche locale |
| docs/SECURITY | limites connues et preuves antérieures | Ne certifie pas les tests de cette mission | Confusion historique/actuel | Rapports datés et expurgés distincts |
| .env.local | Existence connue, fichier ignoré | Aucun contenu affiché/copied ; hors copie de test | Exposition historique du ZIP inconnue | Aucune rotation sans exposition confirmée/accord |

Séparation : tableau = inspection statique ; références Google/MDN/Dexie consultées ; baseline exécutée ensuite en copie sans secrets. Pas de mesure ni d’essai physique implicite.

## Résultat local et décisions

Version locale `2.0.0-local.1`, branche de travail séparée `codex/journal360-v6-local`, base `b1fc804`. Pas de nouvelle dépendance ; lock modifié uniquement pour les versions racine. Pas de refonte globale ni d’écriture dans main.

### P0 réalisé

- `src/data/editorial.ts` (nouveau), `model.ts`, `db.ts` : contrat V6 optionnel, dates réelles, instant ISO intact, UUID distincts, schéma4 additif.
- `src/data/day.ts` (nouveau) : contrôle pur des cumuls, IDs d’événements, pertes/corrections, branches de même révision, classement déterministe et dernière COMPLETE privilégiée.
- `src/features/import.ts`, `ImportDialog.tsx` : proposition de journée, avertissements visibles, idempotence SHA/jour, UUID déterministes multiappareil, option indépendante/manuelle et transaction de lot.
- `src/features/googleAi.ts`, `Reader.tsx`, `GoogleAiDialog.tsx` (nouveau) : v1 préservé, v2 question seule, entrée officielle, correction/copie séparées, confirmation et validation du cadre courant, repli parent sûr sans JS.
- `src/features/backup.ts` : ZIP2 pour nouvelles données, ZIP1 conservé en lecture, plafonds adaptés aux1095 versions testées ; export vérifie les limites de restauration. Correction de deux pertes reproduites par nouvelles unités : versions legacy volontairement identiques sous UUID différents conservées à la restauration ; collision de notes inter-éditions conserve chaque ancrage. Conflits répétés déterministes au lieu de nouveaux UUID infinis.
- `src/features/cloud.ts`, `sync.ts`, `api/backup.mjs` : pagination au-delà100, limite5000 explicite, ancienne réponse100 non certifiée complète, reprise enregistrée après chaque ZIP et lot10. Aucun appel cloud réel.

### P1 réalisé

- `src/features/DayView.tsx` (nouveau), `src/App.tsx` : cartes par journée, trois créneaux déclarés, historique, lecture historique/fiable, recherche/rubrique quotidienne, nature d’article si fournie et notes de toutes les versions. Anciennes notes/favoris/recherche longitudinale conservés.
- `src/features/sourceUrl.ts` (nouveau) : liens source HTTP(S) validés à l’indexation et au rendu parent.
- `src/features/diagnostics.tsx` (nouveau) : journal technique borné expurgé exportable volontairement dans Réglages ; aucun envoi de télémétrie.
- `src/styles.css`, Reader : suppression du zoom global70% du shell (lisibilité/focus mobile) ; le HTML garde70% par défaut, réglable jusqu’à200%. Styles des journées, historique, empreintes et dialogue. Tests responsive et axe conservés.
- `src/config.ts`, package/lock : version locale explicite ; script de mesure dédié `test:performance`.
- `scripts/serve.mjs`, `playwright.config.ts`, `tests/support/block-network.mjs` : preview sans cloud/secrets par défaut, port isolé4181, proxy bloquant l’externe, Chromium/WebKit/Pixel7 simulé.
- `tests/helpers/v6.ts`, `v6.unit.test.ts`, `v6-sync.unit.test.ts`, `backup-api.unit.test.ts`, `v6.performance.test.ts`, `vitest.performance.config.ts`, `tests/e2e/v6.spec.ts` : fixtures synthétiques et preuves locales nouvelles.
- `tests/data.unit.test.ts`, `tests/googleAi.unit.test.ts`, `tests/e2e/app.spec.ts`, `tests/e2e/google-ai.spec.ts` : attentes adaptées au port isolé, schéma4, représentation interne du handshake et nouveaux boutons ; scénarios historiques conservés et tests hostiles v2 ajoutés.
- `.gitignore` : dépendances partagées ignorées même sous forme de symlink ; preuves expurgées explicitement conservables.
- Cinq rapports JOURNAL360_V6 et pièces dans docs/evidence/v6 ; anciennes captures de référence restaurées après les tests, nouvelles captures isolées.

### Limites, inconvénients et reports motivés

- Statut de cumul conservateur, pas vérité éditoriale ; pertes déclarées restent à vérifier. Les métadonnées stockées sont une observation à l’import, la décision courante est recalculée.
- Les notes restent par version, ce qui préserve leur sens mais oblige à ouvrir l’ancienne version pour la modifier. Pas de migration sémantique automatique, ni état workflow supplémentaire pour décisions.
- Choix de branche lisible, pas de certification manuelle persistante. Pas de calendrier, classement par score non fourni, full-text/virtualisation/worker ou pont de thème superflus. Les onglets internes restent au producteur ; pas de duplication dans le shell.
- Aperçu d’un lot peut tenir compte des candidats précédents ; un candidat ensuite choisi indépendant peut changer les preuves disponibles. Le contrôle au commit puis au rendu utilise les versions effectivement enregistrées ; vérifier l’historique après import atypique.
- Snapshots toujours complets et immuables : amplification stockage/réseau et reprise lente d’un appareil neuf. Les mesures annuelles sont favorables en temps local mais lourdes en RAM ; pas validation mobile. Aucun GC/purge, delta-sync ou nouveau service payant.
- Cap5000 inventaire /4000 éditions /150 MiB décompressé explicite : pas de promesse de conservation cloud illimitée. Le coût exact, les quotas du compte et la latence réseau ne sont pas mesurés.
- Téléphone/tablette physique, Firefox, Safari iOS manuel, vrai HTML V6 et test cloud réel NON TESTÉS. Chiffrement export absent. Risque de navigation propre du cadre interactif préexistant ouvert.
- Ingestion depuis un chat/workflow : P2 future uniquement sur demande, après étude auth/replay/quota/XSS/intégrité/confidentialité/coût/rollback. Aucun endpoint public créé, aucune automatisation fictive.
- Durcissement code partagé/rate limit distribué, rotation/révocation et synchronisation de migration doivent faire l’objet d’une autorisation distante séparée. `.env.local` non affiché/copied/modifié ; exposition éventuelle de l’archive à vérifier par le propriétaire, pas présumée.

## Écarts et corrections pendant validation

Baseline isolée :30/32 E2E passants initialement ; deux assertions de port fixe corrigées dans la copie de test puis les deux scénarios passants. Un premier run étendu a été interrompu après24 succès car le motif mobile sélectionnait le répertoire `v6-worktree` ; matcher limité au nom de fichier ensuite. Première suite V6 :12/15 succès, trois échecs du sélecteur de textarea ; rôle accessible corrigé, reprise3/3 réussie. Un test diagnostic a utilisé une DB fermée : ouverture explicite corrigée. Le test de downgrade supposait un rejet ; constat réel Dexie décrit dans MIGRATION, assertion corrigée sans changer le comportement de l’application. Ces échecs intermédiaires ne sont pas dissimulés dans un PASS de première exécution.

Voir TEST_REPORT pour les résultats finaux et SECURITY_REVIEW pour les limites du modèle de confiance. Aucun commit/push/déploiement ; les autorisations antérieures ont été remplacées pour cette mission par la contrainte locale explicite.
