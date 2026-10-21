# Journal 360 V8 — validation locale

> Autorisation ultérieure : après remise du bilan local, l’utilisateur a demandé « commit push sur le main production final ». Cette instruction autorise le commit et la publication sur `main`, avec suivi du déploiement Vercel. Les mentions HOLD et les interdictions ci-dessous décrivent le périmètre initial de validation ; les limites techniques et le verdict global PARTIAL restent applicables. Aucune migration distante ni consultation des profils personnels n’est autorisée. Un déploiement réussi ne constitue pas une validation fonctionnelle sur des données de production.

**Verdict à la clôture de la validation locale : GO local pour l’import autonome prioritaire ; acceptation globale PARTIAL, production HOLD.** Un seul HTML de 22 h importé hors ligne dans une base vide donne huit articles, quatre zones économiques, deux jalons, deux prompts exacts et son dossier Future embarqué. Les créneaux non importés restent facultatifs, la couverture factuelle demeure UNKNOWN sans registre indépendant.

**294 tests unitaires, 214 parcours navigateur et 4 tests de capacité réussis ; un skip historique, aucun échec/flaky navigateur final.** Aucun commit/push/déploiement ni accès aux données personnelles. Le scanner brut conserve son FAIL préexistant sur un témoin synthétique inchangé ; sa revue et les contrôles réels non exécutés restent explicitement limités. [Bilan structuré](evidence/v8/validation.json) · [Preuve T01](evidence/v8/demo/t01.json) · [Guide et rollback](JOURNAL360_V8_IMPORT_GUIDE.md).

## Résultat et périmètre

La priorité est l’import d’un **seul fichier tardif**, sans rendre les éditions intermédiaires obligatoires. V8 corrige le diagnostic documentaire ; le contrat d’entrée demeure V7 strict. Aucun commit/push/déploiement, merge, migration distante, changement de tâche ChatGPT ni accès aux profils/données personnels n’est autorisé pour cette mission.

Référence : dépôt réel `/Users/dreano/Downloads/veille/veille`, `git@github.com:adrno496/sitegoat.git`, branche initiale `codex/journal360-unified-v7`, SHA `d3731ac8fa522e24a833c132b8d484423f275bdc`, état propre. Travail local sur `codex/journal360-autonomous-v8`. Aucun autre worktree réparé/modifié. Mission jointe lue intégralement et conservée dans [PROMPT_JOURNAL360_V8.md](PROMPT_JOURNAL360_V8.md).

Le [plan préalable](JOURNAL360_V8_PLAN.md) fixe critères, risques et seuils avant changement produit. [Guide d’import et rollback](JOURNAL360_V8_IMPORT_GUIDE.md). Registre producteur B : [proposition désactivée](evidence/v8/architecture-decision.md), aucune connexion ni tâche automatisée mise en service.

## P0 — inspection et référence

549 fichiers suivis archivés et restaurés, chacun comparé à son identité Git. Archive `/tmp/journal360-v8-reference-d3731ac.tar`, SHA-256 `67c465575a94ed86381f9e59394ae0322109b6f16879e73a19b731af5231b78a`. Copie de référence `/tmp/journal360-v8-reference-d3731ac` ; dépendances déjà installées liées localement, aucun téléchargement de dépendances/navigateurs. Seuls code suivi et données synthétiques sont utilisés. Les environnements/secrets/session/cloud et bibliothèques personnelles ne sont pas sauvegardés.

Baseline réellement exécutée dans cette copie figée, avant changement produit : `npm run lint`, `npm run typecheck`, `npm test` (282 PASS), `npm run build`, `npm run test:e2e -- --workers=2` (202 PASS, un skip préexistant, zéro échec), `npm run test:performance` (4 PASS, 35,58 s). Voir [sortie](evidence/v8/baseline.txt), [navigateur](evidence/v8/baseline-browser.json), [performance](evidence/v8/baseline-performance.txt). Les anciennes preuves V7 ne remplacent pas cette référence réellement rejouée.

Architecture inspectée : `inspectHTML` valide inerte/UTF-8/schéma/empreintes puis `commitImport` conserve éditions et originaux transactionnellement ; `day.ts` ordonne les versions et évaluait leur chaîne ; `articles.ts` garde déjà les événements absents d’une version récente. Le cache de métadonnées utilise Dexie journal v4, Future v1 indépendant. Les annexes des sélecteurs courants ne consultaient que le dernier snapshot par jour. Reader/Google/CSP/sourceUrl/SW, ZIP journal et Future, cloud/sync/RLS et leur couverture de tests ont été inspectés. Aucun AGENTS.md trouvé aux ancêtres/dans le dépôt. README, ARCHITECTURE et guides V7 lus ; le guide courant renvoie désormais aux nouvelles règles, les preuves historiques restent conservées.

## Changement minimal et décisions

- `data/snapshot.ts` sépare intégrité validée à l’import, autonomie documentaire, couverture et historique reçu. `day.ts` délègue uniquement les fichiers unifiés natifs à cette logique ; le chemin legacy est conservé. Les comparaisons sont bornées à la journée et aux identifiants explicites. Les fichiers manquants n’alimentent plus une liste d’articles supposés perdus.
- Sans registre de faits indépendant, la couverture demeure UNKNOWN, même si le producteur dit COMPLETE et les huit fichiers sont reçus. Déclarations partielles, sources non vérifiées, omissions ou contradictions locales produisent PARTIAL, sans cacher les données disponibles. Intégrité INVALID signifie rejet avant écriture ; aucun document invalide n’est volontairement conservé pour afficher un voyant rouge.
- `SnapshotStatus` est partagé par l’aperçu d’import, la carte journée, l’historique et Aujourd’hui. Le badge CUMUL unique n’est plus utilisé pour les snapshots natifs. Comparaison absente est NON DISPONIBLE, pas « zéro nouveauté ». Les créneaux restent déclarations du fichier et/ou versions physiques reçues, pas un flux de publication de la tâche.
- `articles.ts` conserve les références de versions/textes/sources. La recherche choisit l’original qui contient le texte historique correspondant, sans recopier son contenu dans le dernier HTML. Les notes, favoris et lectures restent liés à leur UUID et original.
- Sélecteurs et modules consultent aussi les originaux antérieurs pour les prompts/jalons/dossiers omis, avec provenance. Les dossiers Future embarqués sont consultables intégralement en lecture seule, recherchables et exportables via la validation Future existante. L’import dans l’atlas demeure explicite et indépendant ; aucune fusion silencieuse de bases ou de ZIP. Les listes sont paginées ; la sérialisation du dossier complet en textarea n’a lieu qu’à l’ouverture.
- Le delta économique est refusé pour période identique, future ou non interprétable, et pour unité/définition différentes. L’ordre par instant réel, les quatre zones, dates et lectures prudentes restent conservés. Aucune courbe ni donnée réelle n’est inventée.
- L’interface existante reste en place ; seuls états/libellés, accès historiques et retour à la ligne de contrôles agrandis changent. Aucune dépendance, migration IndexedDB/SQL, version de contrat ou de ZIP, permission iframe/CSP/RLS ni route Google n’est modifiée.

## Défauts et échecs réellement observés

1. Les nouvelles assertions sur un seul 22/18/12 h ont réellement échoué avant correction : 3 FAIL, 1 PASS. Les articles existaient déjà mais `missingSlots` contenait les horaires des fichiers non reçus. [Sortie de l’ancien défaut](evidence/v8/old-defect-unit.txt).
2. Le même parcours navigateur T01 sur l’ancien build a d’abord vérifié les huit articles puis échoué sur l’absence d’autonomie distincte. [Sortie](evidence/v8/old-defect-browser.txt), [résultats](evidence/v8/old-defect-browser.json), [capture](evidence/v8/old-defect-browser.png). Ce n’est pas un faux négatif dû à une erreur de compilation.
3. Le premier typecheck intermédiaire a détecté du code legacy rendu inaccessible par le narrowing TypeScript et le créneau 21 h dans une liste V7 : dispatcher séparé et comparaison explicite, sans élargir le schéma. Le test de contenu autonome passait déjà ; le typecheck a été rejoué.
4. Le nouveau test d’agrandissement CSS 200 % a échoué Chromium/WebKit. La référence et V8 débordaient toutes deux de 135 px à 1280 px dans ce modèle ; [comparaison](evidence/v8/zoom-model-comparison.json). Des boutons non sécables/flex ne se repliaient pas. Le retour à la ligne ciblé corrige le test sans le supprimer. Ce test CSS n’équivaut pas au zoom natif d’un téléphone.
5. Une première requête de test « Analyse détaillée A » correspondait aussi aux autres récits, car la recherche textuelle traite A comme un mot présent dans « analyse ». L’attente de résultat unique était incorrecte ; elle a été remplacée par un marqueur historique synthétique unique. L’attente demeure un résultat et une origine historique, sans affaiblir le moteur. [Échec conservé](evidence/v8/initial-history-query-failure.txt).
6. Les cinq mutations jetables ont provoqué un exit 1 avec la raison attendue : article C retiré, source falsifiée (HTTPS mais différente du témoin synthétique), SHA cassé, créneau échangé, texte d’événement modifié. La fixture intacte passe avant/après. Voir [mutations](evidence/v8/mutations.json). Le témoin de test n’est jamais présenté comme un registre factuel réel.

## Compatibilité et limites à conserver

Le fichier V7 autonome n’est pas une preuve universelle de couverture éditoriale. Avec un témoin antérieur omis : alerte et consultation des originaux. Sans témoin : UNKNOWN, impossible de deviner un événement absent. Les `firstSeenSlot` restent déclarés ; une contradiction entre versions reçues est signalée, aucune heure n’est reconstruite à partir d’un simple titre.

Un conflit de même heure/révision conserve les deux contenus ; la sélection courante est technique et provisoire, aucun arbitrage factuel automatisé. Un retrait n’efface rien : justifications et corrections restent liées aux originaux. Aucun protocole nouveau de tombstones ni registre producteur distant n’est inventé sous un contrat `.strict()` inchangé. Les anciennes variantes de prompts portant un même ID restent consultables dans les documents/historique ; le moteur global privilégie leur variante la plus récente.

Le schéma Future v1, ses notes, préparation, comparateur et ZIP indépendant restent inchangés. Les compteurs de dossiers de l’atlas séparé n’incluent pas les paquets encore embarqués dans les journaux ; ceux-ci sont accessibles dans Chronologie IA avec export/import explicite. La sauvegarde des deux bases nécessite toujours deux ZIP. Les anciens binaires peuvent refuser ZIP v3 : coordination des appareils et lecteur compatible requis avant toute publication future.

Téléphone physique, lecteur d’écran humain, zoom navigateur natif, OS clipboard, partage/installation/impression réels, profil cloud réel et rollback d’un vrai profil demeurent NON TESTÉS. Le proxy des tests et les mesures bloquent les requêtes externes ; aucune donnée personnelle n’est utilisée. Les contrôles automatiques ne certifient pas WCAG ni la sécurité de production. L’application n’ajoute ni IA sémantique ni synchronisation Future réelle.

## Rollback

Le code de référence a été restauré et ses 549 identités vérifiées. Ouvrir la copie séparée ou extraire l’archive dans un nouveau dossier, après conservation de cette branche et du diff ; ne pas reset/clean le dossier utilisateur. Aucun changement de format de DB/ZIP n’est introduit. Les originaux n’étant pas réécrits, V7 lit les mêmes fichiers mais réaffiche son ancien diagnostic.

Restauration synthétique : ZIP1/2/3 avec originaux, UUID, notes, favoris/lectures et archives comparés intégralement et idempotence testée ; archive corrompue refusée. Les suites Future séparées sont conservées. Ne pas effacer IndexedDB ni snapshots pour revenir en arrière. Les vrais profils n’ont pas été sauvegardés : leur rollback complet n’est pas certifié et nécessite autorisation distincte.

## Matrice T01–T20

Les tests V8 s’ajoutent aux suites historiques ; ils ne valident pas V8 par les anciens tests seuls. Les attentes V7 qui imposaient une chaîne complète ont été remplacées par les assertions des quatre dimensions ; aucun test n’a été désactivé.

| Test | Statut sur périmètre exécuté | Preuve / limite |
|---|---|---|
| T01 — SEUL 22 h, A–H et annexes | PASS | `v8-snapshot.unit`, `v8-snapshot.spec`, `demo/t01.json` : 8 événements, 4 zones, 2 jalons, 2 prompts exacts, un seul original. Capture supplémentaire : import réalisé hors ligne. |
| T02 — SEUL 18 h / 12 h | PASS | Tests unitaires : bases sans ancienne édition ; 6 et 3 articles. Navigateur : 12 h puis 18 h sans les autres fichiers. |
| T03 — ordre 22→10→18 / doublon | PASS | Unités et navigateur : courant 22 h, nombre d’originaux distincts, pas de rétrogradation. |
| T04 — diagnostic distinct de l’historique | PASS | AUTONOMOUS / UNKNOWN / SINGLE_SNAPSHOT, créneaux « non importé (facultatif) », comparaison NON DISPONIBLE ; pas d’alerte d’articles déduite des horaires. |
| T05 — ancien événement omis | PASS | C absent du 22 h, conservé depuis 12 h : 8 articles interversions, recherche vers son original ; annexes anciennes consultables et datées. |
| T06 — contradiction avec/sans témoin | PASS | Avec témoin : INCOMPLETE/PARTIAL et IDs omis ; sans témoin : AUTONOMOUS pour le présent, couverture UNKNOWN, jamais une certification factuelle. Aucun registre réel connecté. |
| T07 — même 22 h/révision, SHA différents | PASS | Conflit visible, deux originaux distincts, aucun écrasement silencieux. Choix courant provisoire. |
| T08 — correction sourcée, états | PASS | Même eventId, nouvelle révision, anciens textes/sources accessibles, note/favori/lecture conservés. Recherche d’un marqueur ancien ouvre l’origine historique. |
| T09 — prompts, octets, sandbox/repli | PASS | Deux téléchargements comparés UTF-8 ; tests existants Voir/Copier/Sélectionner/repli et protections conservés. Clipboard OS non testé. |
| T10 — économie datée/comparable | PASS | Ordre ISO réel, refus unité/définition différentes et période identique/future/opaque ; quatre zones ; aucune courbe fictive. |
| T11 — jalon futur prétendu observé | PASS | Rejet sans preuve/date cohérente ; import et base Future v1 stricts conservés, cycles et sauvegarde testés par leurs suites propres. |
| T12 — hostile, limites, atomicité | PASS | JSON `</script>`, URL, SHA faux, références orphelines, payloads/poids/quota/ZIP corrompu : refus et absence d’écriture partielle ; tests V7 et historiques rejoués. |
| T13 — HTML legacy et Google | PASS | Suites Reader/Google/CSP/session/nonce et confirmations ; fichiers protégés identiques. Mode interactif historique conservé sans nouvelle permission. |
| T14 — sauvegarde/restauration | PASS | ZIP1/2/3 réels générés/restaurés deux fois, tables originales/notes/états/archives identiques ; corruption refusée ; Future ZIP séparé conservé. |
| T15 — offline/reconnexion/cloud simulé | PASS | Import 22 h hors ligne en profil neuf après cache, téléchargement exact hors ligne ; suites sync/cloud simulées sans comptes réels. Cloud de production NON TESTÉ. |
| T16 — accessibilité/reflow | PASS / PARTIAL | axe, clavier, focus, thèmes, 7 largeurs, reduced-motion et CSS zoom 200 % passent sur profils automatisés. Revue humaine WCAG, zoom natif et appareil physique NON TESTÉS. |
| T17 — performances avant/après | Voir mesures | Seuils fixés avant code, Node 30/180/365 jours + 1000 dossiers, navigateur 100/200/1000 dossiers, bundle/précache/tas/CPU/réseau. Pas de promesse mobile issue de l’émulation. |
| T18 — mutations détectables | PASS | 5 mutations rejetées avec raison spécifique, même test ; source intacte avant/après. Ancien défaut reproduit séparément en unité et navigateur. |
| T19 — vieux 21 h et ZIP | PASS | V6/V6.1/V6.4/V7 et ancien 21 h dans les suites historiques ; restaurations ZIP1/2/3 et Future séparé. |
| T20 — export cumulatif nouveau | NON APPLICABLE / fixture PASS | Aucun export cumulatif applicatif nouveau. Le générateur local produit réellement un 22 h autonome, testé sans autre import ; l’export de l’original reste intact. |

## Contrôle des secrets : échec brut conservé

Le script existant lit `.env.local`. Il a été exécuté dans une copie jetable du code/bundle excluant **tous** les `.env*`, avec lecture Git seule et sans profils réels. Il retourne exit 1 en référence **et** en V8 sur `tests/googleAiSession.unit.test.ts`, témoin volontaire d’un marqueur sensible dans un test de refus de question privée. Ce fichier et son empreinte sont inchangés. La valeur n’est pas reproduite dans les preuves V8. Le contrôle supplémentaire des fichiers modifiés/ajoutés et du bundle ne trouve aucun nouveau motif de ce préfixe.

Statut : **scanner brut FAIL préexistant ; revue PARTIAL**, pas un PASS artificiel. Le témoin n’a été ni supprimé ni ajouté à une allowlist pour faire passer le script. Voir [analyse](evidence/v8/secrets.json) et sorties de référence/finale. Ce contrôle par motifs ne constitue pas un audit exhaustif de secrets.

## Captures et preuve documentaire

Les captures proviennent d’un contexte Chromium neuf avec un seul fichier SYNTHÉTIQUE importé hors ligne ; aucune bibliothèque personnelle. [Aujourd’hui](evidence/v8/demo/today-dark-desktop.png), [mobile](evidence/v8/demo/today-dark-mobile.png), [page complète](evidence/v8/demo/today-full-desktop.png), [économie](evidence/v8/demo/economy.png), [chronologie](evidence/v8/demo/timeline.png), [prompts](evidence/v8/demo/prompts.png), [recherche](evidence/v8/demo/search.png). La revue visuelle a corrigé des libellés de créneaux collés et agrandi les notes de diagnostic ; la validation est rejouée après cette correction ciblée.

[Preuve T01 structurée](evidence/v8/demo/t01.json) : identité du HTML, quantité de versions, quatre états séparés, huit articles et deux téléchargements exacts avec empreinte. Une capture n’est pas une preuve de véracité d’actualité ni de comportement sur téléphone physique.

<!-- V8_FINAL_VALIDATION -->

## Résultats finaux et mesures

La suite générale finale passe en 379.13 s : 214 PASS, un skip tactile CDP propre à Chromium déjà présent en référence, zéro unexpected/flaky. 24 fichiers unitaires / 294 PASS. Les cinq mutations ont été rejouées. Voir [sorties](evidence/v8/README.md). Les 45 fichiers protégés sont identiques ; 46 fichiers produit/tests/outils/guide ont des empreintes dans le manifeste. Le diff inverse passe sans l’appliquer et l’index Git réel reste vide.

Budget JS/précache : **PASS**. JavaScript 998,558 → 1,006,818 octets (+0.83 %) ; précache 1406.21 → 1414.63 Kio (+0.60 %). CSS 61,631 → 61,992 octets. Pas de dépendance ajoutée. Les exemples V8 sont dans tests/fixtures, pas dans le précache.

| Mesure | Référence | V8 |
|---|---:|---:|
| Navigation chaude médiane, 1440 px | 36.51 ms | 35.61 ms |
| Tas JS après GC, 1440 px | 6.92 Mo | 6.94 Mo |
| CPU du scénario, 1440 px | 0.108 s | 0.123 s |
| LCP / CLS coque, 1440 px | 272 ms / 0.046 | 360 ms / 0.046 |
| Navigation chaude médiane, 390 px | 36.02 ms | 35.28 ms |
| Tas JS après GC, 390 px | 6.96 Mo | 6.98 Mo |
| CPU du scénario, 390 px | 0.102 s | 0.100 s |
| LCP / CLS coque, 390 px | 208 ms / 0.074 | 204 ms / 0.074 |

| Dossiers Future réels importés par l’UI (synthétiques) | Index référence → V8 | Requête référence → V8 | Tas V8 avant → après index |
|---|---:|---:|---:|
| 100 | 67.55 → 68.59 ms | 21.50 → 20.74 ms | 11.12 → 13.00 Mo |
| 200 | 67.10 → 68.93 ms | 30.87 → 31.75 ms | 21.20 → 24.86 Mo |
| 1000 | 118.88 → 114.73 ms | 117.26 → 133.76 ms | 116.50 → 125.01 Mo |

Seuils préalables : JS/précache +2 %, tas +10 %, navigation +20 % ou +10 ms de bruit, index/requête <=500 ms, zéro requête externe/débordement dans les mesures. Verdict des budgets : **PASS**. [Contrôles chiffrés](evidence/v8/performance-budgets.json), [bundle](evidence/v8/bundle.json), [avant](evidence/v8/before/performance.json), [après](evidence/v8/after/performance.json). Le CPU et LCP/CLS sont des relevés courts, pas une certification ni une statistique robuste. Cinq navigations chaudes seulement, même Mac, deux démos legacy, viewport redimensionné ; tas après GC et non mémoire totale/pic. Les distances de défilement diffèrent avec le contenu. Aucun téléphone physique ni réseau mobile.

Les capacités Node/jsdom/fake IndexedDB (30/180/365 jours legacy, 1000 dossiers Future) sont réellement rejouées ; [journal](evidence/v8/journal-capacity.json), [Future](evidence/v8/future-capacity.json). Elles ne certifient ni l’ouverture/recherche UI de 365 jours riches V7 à huit snapshots/jour, ni la capacité mémoire mobile. Les plafonds de manifeste et de restauration peuvent annuler un export trop volumineux sans supprimer les données. Les vues ANNOUNCE distincte et nouvelle évolution transversale 30 jours n’ont pas été ajoutées au contrat strict inchangé ; les statuts et comparaisons Future existants sont conservés. Ces zones restent PARTIAL/NON TESTÉES, pas des fonctionnalités revendiquées.

La meilleure objection à « prêt production » reste l’absence de validation sur appareil et cloud réels, la compatibilité des anciens clients ZIP3 et la dépendance à un producteur capable de fournir un contenu réellement complet. La référence source a été recontrôlée sur 549 fichiers après restauration de ses artefacts générés ; le rollback d’un vrai profil n’est pas prétendu testé. STOP avant toute action externe ou irréversible : autorisation distincte requise.

Environnement final vérifié : macOS 15.7.9 / Darwin 24.6.0 arm64, Node 24.21.0, Playwright 1.64.0, Chromium 156.0.8078.4, WebKit 27.2 et profil Pixel 7 émulé. Les dates utilisateur utilisent Europe/Paris, le 21 octobre 2026 ; les horodatages bruts UTC des rapports sont conservés. Les notes de diagnostic ont une assertion de style calculé à 14 px après correction de la règle globale prioritaire.

**Performances globales : PARTIAL**, même si les budgets prédéfinis passent. Deux hausses restent observées sur le relevé desktop : LCP 272→360 ms et CPU du scénario 0,108→0,123 s. Leur cause/stabilité ne sont pas établies par ce relevé court ; aucune équivalence stricte de consommation n’est revendiquée. Les nombres bruts et conditions sont conservés.

La [démo locale](http://127.0.0.1:4186) est réellement servie (HTTP 200), avec `/api/backup` et `/api/access` désactivés localement (503) ; [vérification](evidence/v8/local-server.json). Le serveur temporaire de référence a été arrêté après les mesures. La démo personnelle s’ouvre vide tant que l’utilisateur n’importe pas un exemple ; aucune donnée de test n’est injectée dans son profil.

| Phase | Verdict |
|---|---|
| P0 — inspection, sauvegarde, référence | PASS |
| P1 — autonomie / couverture / historique | PASS sur tests synthétiques |
| P2 — import et réconciliation non destructive | PASS sur périmètre testé |
| P3 — modules et diagnostics | PASS pour l’import unique ; PARTIAL pour les extensions de vues non ajoutées |
| P4 — robustesse et mesures | PASS pour suites automatisées et budgets ; PARTIAL pour consommation stricte, scanner brut préexistant et appareils réels |
| P5 — preuves et rollback source | PASS local ; production HOLD, aucun déploiement autorisé |
