MISSION VS CODE / CODEX / CLAUDE CODE — JOURNAL 360° V8
Optimisation globale et import unique d'une édition cumulative autonome
Date de cadrage : 20 octobre 2026
Application : https://sitegoat.vercel.app/
Dépôt attendu : adrno496/sitegoat (à confirmer via git remote -v, ne pas supposer que le dossier ouvert est le bon)
Portée : code existant React / TypeScript / Vite / PWA, IndexedDB (Dexie), exports ZIP, synchronisation Supabase, modules Journal/Articles/IA majeur/Sentinel/Le Futur, recherche IA Google et gestion des prompts Markdown.
Statut : mission de développement demandée, AUCUNE modification du projet encore réalisée par le présent fichier.
Priorité absolue : je dois pouvoir oublier les éditions 10 h, 12 h, 14 h, 16 h, 18 h et 20 h, puis importer uniquement celle de 22 h. Si cette édition contient effectivement tous les articles et dossiers des heures précédentes, le site doit immédiatement retrouver et afficher tous ces contenus dans Aujourd'hui, Articles, les quatre univers, Économie, Chronologie IA, Mes prompts .md et la recherche. Aucun import intermédiaire ne doit être obligatoire pour lire et indexer les données embarquées. Ce comportement doit aussi marcher si je n'importe que 12 h, 16 h ou 18 h.

Limite à ne pas masquer : aucune application ne peut recréer un article réellement absent du dernier fichier et inexistant ailleurs. Il faut distinguer : (1) intégrité technique du fichier, (2) autonomie documentaire de son contenu, (3) couverture réelle des faits par la veille, et (4) continuité historique des éditions importées. Les créneaux non importés ne prouvent pas que les informations sont absentes. Ne jamais affirmer « tous les faits du jour vérifiés » sans preuve d'un registre persistant ou d'une reconstruction sourcée complète.

0. Règles impératives, sécurité et zéro régression
1. Commencer par lire le dépôt réel, ses consignes locales (AGENTS.md, README, guides), sa branche, ses modifications non commitées et les schémas. Ne pas forcer d'installation, de reset, de nettoyage Git, de suppression d'IndexedDB ni de réparation des worktrees.
2. Faire l'inventaire des parcours existants, écrire une baseline reproductible, puis seulement modifier le minimum de code nécessaire. Préférer composants existants, fonctions pures et migrations additives. Ne pas refaire entièrement l'interface si elle fonctionne.
3. Avant les changements, préserver le code et expliquer la stratégie de sauvegarde/retour arrière. Les données de l'utilisateur, les snapshots Supabase, sessions et secrets ne doivent pas être lus, copiés, publiés, nettoyés ni utilisés pour les tests. Utiliser des profils et données synthétiques.
4. Interdits sans accord distinct : commit, push, merge, déploiement Vercel, migration SQL distante, action sur Supabase réel, modification des tâches ChatGPT, scanner un service tiers, exposition d'un secret, achat ou publication. La demande autorise le travail de code local non destructif, pas ces opérations externes.
5. Préserver : éditions historiques V6/V6.1/V6.4/V7, créneau historique 21 h, HTML intégraux, favoris, notes, lectures, archives, corbeille, reprise de lecture, recherche classique et Google Mode IA avec confirmation, import manuel et partage, ZIP v1/v2/v3, synchronisation cloud et RLS, source Future v1 strict, conservation des prompts, sandbox/iframe/CSP, thèmes, mode offline/PWA, accessibilité et navigation mobile.
6. Aucun assouplissement de validation, allow-same-origin, allow-downloads, script distant, HTML non fiable exécuté, innerHTML interpolant des données source ou suppression d'un test difficile pour obtenir un PASS.
7. Toujours séparer fait inspecté, test réellement exécuté, hypothèse, risque non testé et décision proposée. Ne pas promettre 100 %, zéro bug ou production certifiée.
1. Fichiers et comportements identifiés avant la mission
Les fichiers suivants ont été consultés dans le dépôt accessible au cadrage ; relire leurs versions locales actuelles, elles peuvent avoir changé :
- src/data/unified.ts : schéma Zod strict de journal360.unified, schemaVersion: 7, scheduleId: "paris-v7-8", editionSlot, slotsIncluded, missingSlots, cumulativeStatus, items, economicSnapshots, futureInsights, futureDocuments, promptAssets, provenance ; bornes et vérifications.
- src/data/day.ts : assessVersion() déclare les créneaux absents dans les fichiers reçus comme manquants et exige actuellement une chaîne/révision antérieure pour accorder COMPLETE. C'est la principale cause probable d'un cumul affiché PARTIAL même quand l'unique HTML tardif contient déjà les articles.
- src/data/articles.ts : index des articles des éditions courantes et historiques par identifiant, liens aux versions.
- src/data/editorial.ts : huit créneaux V7 (08/10/12/14/16/18/20/22) et ancien plan 08/16/21, horloge Europe/Paris.
- src/features/future/schema.ts : contrat séparé journal360.future v1 strict pour les dossiers prospectifs.
- docs/JOURNAL360_V7_IMPORT_GUIDE.md, docs/JOURNAL360_V7_REPORT.md, ARCHITECTURE.md, README.md : règles d'import, sauvegarde, versions et risques. Le rapport V7 signale un précache et une mémoire en hausse, et l'absence de certains essais sur appareils réels.
À confirmer dans le code du projet ouvert : src/features/import.ts, stockage Dexie et index, components src/features/unified/, lecteur HTML/sandbox, exports ZIP journal et Future, CloudRepository/SyncCoordinator, route Google IA, tests unitaires/E2E et fixtures V7.

Les schémas étant stricts, ne pas ajouter d'attributs arbitraires dans unifiedData sans versionner/tester les adaptateurs producteur/consommateur. La tâche de veille a été mise à jour pour produire des HTML autonomes avec un bloc unifiedData V7 et éventuellement le bloc legacy editionData compatible ; elle n'est pas un backend d'état partagé garanti.
2. Critères de réussite à figer avant implémentation
Créer en premier un plan de tests / jeux synthétiques qui rendent ces critères réfutables :

A. Import unique 22 h : une seule édition journal360-day-YYYY-MM-DD, editionSlot=22:00, contient les événements A (08 h), B (10 h), C (12 h), D (14 h), E (16 h), F (18 h), G (20 h), H (22 h) avec identifiants distincts, 4 snapshots économiques, 2 jalons Future, 2 prompts Markdown. Profil neuf, aucun import antérieur. Après import : 8/8 événements lisibles, sources et résumés intégraux ; Économie/Chronologie/Prompts/recherche alimentés ; aucun message laissant croire que B–G sont perdus faute d'import. Le site peut indiquer « historique intermédiaire non importé » si c'est vrai, mais pas « contenu perdu ».

B. Import unique 18 h ou 12 h : même principe sur tous les événements présents jusqu'au créneau choisi, sans dépendance sur 08/10/12/14/16 déjà importés.

C. Séquences : importer 22 h puis 10 h puis 18 h ; importer 10 h puis 22 h ; importer 22 h deux fois ; importer deux versions 22 h concurrentes ; importer 22 h puis corriger un événement avec nouvelle révision. Jamais rétrograder l'édition courante, effacer un article, perdre une source, un prompt ni écraser note/favori.

D. Distinguer les lacunes : édition 22 h sans événement C déclaré dans un registre de référence accessible => avertissement sérieux « contenu du snapshot incomplet », mais tous les autres événements indexés. Édition 22 h sans fichier 10 h reçu, alors qu'elle porte B et C intègres => pas d'alerte de perte de B/C. Ne pas transformer l'absence de preuve de couverture en couverture certifiée.

E. Compatibilité : V6 et ancien 21 h inchangés ; import Future v1 strict inchangé ; ZIP1/ZIP2/ZIP3 et restauration sur profil jetable sans perte ; cloud simulé sans secrets ; espaces IA majeur/SENTINEL inchangés ; PWA offline et mode HTML sécurisé.

F. Sécurité : JSON hostile </script>, XSS, injections dans titres/prompts, URL non HTTPS, énormes payloads, poids supérieurs aux limites, SHA-256 faux, références orphelines => refus sûr sans écriture partielle ni dégradation de CSP/iframe.
3. Nouveau modèle mental — snapshot documentaire ≠ chaîne d'imports
Ne plus utiliser un unique voyant CUMUL PARTIAL pour mélanger quatre problèmes différents. Exposer (en calculs et UI) quatre dimensions :
1. Intégrité technique du fichier (VALID / INVALID) : Zod, tailles, SHA, identifiants, dates, liens internes, absence de script source actif.
2. Contenu autonome disponible (AUTONOMOUS / INCOMPLETE / UNVERIFIABLE) : tous les articles et modules effectivement embarqués sont accessibles dès cet import, sans anciennes éditions. « AUTONOMOUS » signifie autonome techniquement, pas exhaustif historiquement.
3. Couverture éditoriale vérifiée (VERIFIED_COMPLETE / PARTIAL / UNKNOWN) : déclarations et preuves du producteur sur le périmètre couvert, références aux événements et sources. Une déclaration du producteur seule ne suffit pas à certifier une reconstruction parfaite.
4. Historique reçu (FULL_CHAIN / SOME_VERSIONS_MISSING / SINGLE_SNAPSHOT) : quels fichiers physiques l'utilisateur a importés. Cette dimension sert l'historique, pas la lecture des articles du dernier snapshot.
Dans « Aujourd'hui », présenter par exemple : « Dernière édition : 22 h · 14 articles disponibles · 1 fichier importé · historique intermédiaire non importé · couverture des faits non certifiée ». Ne plus traiter l'absence des fichiers de 10 h, 12 h et 14 h comme une disparition des articles lorsqu'ils existent dans le HTML de 22 h.

Conserver les anciens champs/contrats, mais déplacer le raisonnement de assessVersion vers des sous-fonctions pures différenciant chaîne et contenu. Ne pas rendre artificiellement COMPLETE dès qu'un snapshot se dit complet. Vérifier les statuts qui alimentent les cartes, la bibliothèque, la recherche et les avertissements.
4. Contrat d'édition V7 natif, source de vérité des données
L'édition de référence est un HTML autoportant contenant un bloc JSON inertiel <script id="unifiedData" type="application/json"> conforme à src/data/unified.ts, avec :
- format: "journal360.unified", schemaVersion: 7, editionId: "journal360-day-YYYY-MM-DD", editionDate, timezone: "Europe/Paris", scheduleId: "paris-v7-8", editionSlot, revision, coverageWindow, sourceVerifiedAt, slotsIncluded, missingSlots, cumulativeStatus.
- synthesis sourcée avec eventIds existants ; items[] complet pour le contenu du jour disponible, contenant eventId, firstSeenSlot, sourceWatch, publishedAt, verifiedAt, résumés narratifs, analyse détaillée, sourceRecords, evidenceStatus, corrections/références, incertitudes.
- economicSnapshots[] FR/EU/US/CN, avec séries datées et comparables uniquement si elles existent ; futureInsights[] et futureDocuments[] si conformes au contrat strict ; promptAssets[] avec texte Markdown UTF-8 intégral et empreinte vérifiable ; provenance, warnings, sourcesNotVerified, previousRevisionRef.
- editionData peut servir aux anciens index, mais ne doit pas écraser le contrat V7.
Respecter les valeurs exactes du schéma local (notamment les sourceWatch, enums économiques, types de dates et identifiants). Ne pas confondre slotsIncluded (passages réellement couverts/documentés) et fichiers importés (information propre au navigateur). Éviter la prétention de fidélité d'un firstSeenSlot réinventé lorsque le journal antérieur est indisponible.

Si une nouvelle preuve explicite d'autonomie de snapshot est requise, choisir l'évolution la plus compatible : métadonnées additives et facultatives + validateur nouveau + retour pour les anciennes V7 ; ou version de schéma incrémentée avec adaptateur bidirectionnel documenté. Ne pas casser les fichiers V7 ni imposer l'upgrade du producteur avant que le site soit prêt. Pas de champ supplémentaire non reconnu par .strict() : faire le changement de contrat de manière coordonnée, puis seulement actualiser la consigne de veille lorsque le site sait importer le nouveau format.
5. Registre de cumul durable — ne pas dépendre de la mémoire d'un chat
Étudier trois architectures, puis choisir la plus simple compatible avec les permissions :

A. Fichiers HTML de snapshots autoportants + import manuel (solution prioritaire immédiatement utilisable, aucune connexion supplémentaire). Le contenu présent dans 22 h ne dépend pas des imports 08–20 h.

B. Registre producteur quotidien persistant, append-only et versionné (par ex. manifest JSON stocké dans un espace privé autorisé ou dépôt privé/API contrôlée), consommable par le générateur de veille. Les exécutions d'automatisation doivent disposer réellement du droit et des capacités pour le lire/mettre à jour. Documenter authentification, secret, droits, concurrence, idempotence, échec du stockage, coûts, maintenance, rollback. Ne pas prétendre avoir connecté ChatGPT au registre avant test réel. Ne jamais envoyer des notes/utilisateurs/secrets au producteur.

C. Réconciliation à l'import avec les anciennes éditions disponibles localement : conserver la meilleure version de chaque événement (ou la version passée explicitement en correction), conserver les événements présents dans anciennes éditions mais absents du nouveau fichier dans un historique séparé avec provenance, ne pas écrire silencieusement les événements manquants dans le fichier original. Une opération « reconstruire le dossier du jour » doit être séparée, explicite, réversible, source par source.

Décision attendue : implémenter A + C en premier avec tests réels ; proposer B sous forme de plan/fonction désactivée si aucune infrastructure ni autorisation d'accès externe ne sont établies. L'import automatique depuis ChatGPT vers Vercel/Supabase n'est pas acquis.
6. Politique de fusion d'événements et gestion des corrections
- Identité première : editionDate + eventId stable et ancre d'univers explicite. Ne jamais fusionner uniquement par titre, similitude lexicale ou catégorie.
- Un événement annoncé à 08 h et inchangé à 22 h garde même ID et sources ; une correction conserve ID et ajoute corrections[] avec date/motif/sources, sans réécrire silencieusement l'historique.
- Nouvelle conséquence réellement distincte : nouvel ID et relatedEventIds explicites.
- Résoudre les éditions désordonnées par horodatages/slot/révisions sans dégrader l'actuelle ; ne pas supposer qu'une révision numériquement plus élevée est factuellement meilleure si elle est concurrente ou invalide.
- Retrait justifié : garder un tombstone/justification et accès à l'original, jamais disparition silencieuse.
- Préserver versions physiques originales, UUID, tags, favoris, notes et lecture ; l'index courant peut pointer vers l'article de la meilleure version et offrir l'historique.
- Une édition finale de 22 h peut être la seule version physique reçue : sa bibliothèque d'articles est utilisable directement.
7. Dashboard « Aujourd'hui » — clair avant tout
Objectif : comprendre la journée en 30–60 secondes sans devoir lire 20 fiches.

En haut : titre Journal 360° + date/date de fraîcheur réelle + état de synchronisation + créneau disponible (pas de prétendu « live ») ; Le monde en 60 secondes (3–5 faits), puis Ce qui a changé depuis la dernière édition accessible (si aucune ancienne version, indiquer comparaison NON DISPONIBLE, non pas zéro nouveauté). Étages : IA majeure, Économie FR/EU/US/CN, Le Futur, SENTINEL/AXDIA, Mes actions. Donner priorité aux faits utiles, puis articles complets accessibles.

Afficher les huit créneaux sans confondre : publié par la tâche / présent dans le snapshot / importé localement / vérifiable. Un créneau volontairement non importé apparaît « non importé (facultatif) » et ne dégrade pas le statut de contenu présent. Les contrôles multi-thèmes, mobile, clavier, reduced-motion, favoris et liens HTML doivent rester fonctionnels.

Pas de duplication de longues analyses dans la page d'accueil ; une fiche détaillée par événement avec synthèse narrative + source/dates/objections + bouton ouvrir l'original. Favoriser la lisibilité et la densité informationnelle plutôt qu'animations coûteuses.
8. Radar économique réel, traçable et comparable
- Quatre zones FR, EU, US, CN visibles même sans données : unknown et message clair.
- Conserver séries officielles avec unité, définition, fréquence, période statistique, date de publication, révision et vérification. Ne calculer de delta que sur séries réellement comparables ; pas de nouvelles valeurs factices à chaque créneau.
- Afficher au besoin 7/30/90 jours ou 3/6/12 mois selon les séries réellement disponibles. Si seulement deux points ou une publication trimestrielle, montrer tableau et avertissement plutôt qu'une fausse courbe lissée.
- Récession, stagflation, crise bancaire, dette : afficher scénarios et signaux invalidants ; le badge « crise » requiert au moins les conditions du vrai schéma et ne résulte jamais d'un seul chiffre.
- Comprendre le décalage de parution entre pays ; pas de fausse comparaison France–Chine par mêmes définitions supposées.
- « Pour moi » : 0 à 3 actions prudentes, avec coûts, risques et vérification de la pertinence, sans conseil d'investissement personnalisé.
9. Chronologie IA et « Le Futur »
- Frise 2026, 2027, 2030, 2035, 2040+ ; distinguer fait daté OBSERVÉ, ANNONCE, HYPOTHÈSE, SCÉNARIO et CONTREDIT.
- Relier explicitement un futureInsight ou futureDocument à un article/sources quand le lien existe ; ne pas inventer de relation.
- Permettre une lecture « évolution depuis 30 jours », une comparaison de prévisions et leurs conditions de falsification. Une prévision n'est jamais auto-transformée en fait parce que la date est passée.
- Préserver complètement la base Future v1, ses notes et son ZIP propre ; ne pas faire d'écriture interbases implicite. Si un utilisateur choisit l'import d'un dossier prospectif, le valider avec src/features/future/schema.ts et proposer l'action explicite.
10. SENTINEL, AXDIA et prompts VS Code
- Les articles de veille pertinents alimentent les deux domaines sans duplication de fichiers originaux ; SENTINEL reste un outil privé de travail pour les audits clients, non un SaaS public.
- Chaque piste : source/version, preuve de nouveauté, produit/module, compatibilité et licence, coût, effort, risques, alternatives ne rien changer/optimiser/ajouter, test décisif et rollback.
- Prompts .md vraiment complets dans promptAssets, sans couper le texte ; un bouton Voir / Copier / Sélectionner / Télécharger par prompt ; le fichier téléchargé correspond aux octets UTF-8 exacts et SHA éventuellement fourni.
- Aucun prompt factice quand aucune piste assez solide n'est retenue. Les anciens prompts Sentinel conservés et consultables ; recherche indexe les nouveaux et anciens formats.
- Ne pas transmettre les prompts privés entiers dans une question Google. Google Mode IA reste séparé du moteur de recherche local ; l'ouverture externe est explicite et sécurisée.
11. Recherche, mémoire, UX et performances
- Conserver la recherche locale sans accent/casse ; ajouter si utile recherche croisée article/sources/économie/frise/prompts et filtres date/source/statut/importance/univers, avec résultats accessibles au clavier et contexte précis.
- La « recherche par IA sur mes archives » est une piste distincte : sans LLM externe par défaut ; si envisagée, présenter architecture locale/opt-in, confidentialités/coûts, citations obligatoires et garde-fous contre les hallucinations. Ne pas la vendre comme implémentée sans tests.
- Ne pas indexer un HTML en exécutant son JS. Neutraliser contenu hostile/URL/scripts et préserver CSP/sandbox.
- Mesurer avant/après bundle, précache, tas/CPU, ouverture et recherche 30/180/365 jours, 100/1000 dossiers Future, largeurs 320/360/390/430/768/1024/1440, thèmes, zoom 100/200 %, reflow et reduced-motion. Éviter précharger toutes les éditions et tous les prompts ; virtualiser et paginer si utile.
- Limiter les animations à feedback utile ; pas de gros frameworks ni CDN ajoutés pour l'apparence. Préserver l'offline et l'économie de batterie.
12. Sauvegarde, synchronisation, confidentialité et compatibilité
- Rejouer import ZIP1, ZIP2, ZIP3 et restauration sur profil neuf avec originaux/notes/favoris/archives/prompts identiques. Ne jamais modifier l'original HTML : stocker métadonnées et états dérivés séparément.
- Journal et Le Futur ont deux espaces de sauvegarde distincts ; expliquer clairement cette limite et proposer une sauvegarde coordonnée non destructive avant d'envisager toute fusion du stockage.
- Tester hors ligne/reconnexion, snapshots concurrents, révision ancienne sur nouveau client, coupure au milieu d'une fusion, quota dépassé, fichier invalide et idempotence. Conserver les politiques RLS et la séparation des données privées.
- Ne pas utiliser vrais comptes, secrets, archives personnelles ou cloud de production pour tests. Toute extension de synchronisation Future/cloud réelle exige architecture, coût et autorisation distincte.
- Éviter de régresser sur les anciens appareils : ZIP v3 non lisible par un client ancien doit être explicitement signalé ; plan de mise à jour et restauration exigés.
13. Matrice de tests obligatoires (réels, pas déclaratifs)
T01 — un seul HTML 22 h contenant A–H : les huit articles et tous modules s'affichent.
T02 — un seul HTML 18 h : contenu antérieur présent et reconnu.
T03 — 22 h importé avant 10 h/12 h : pas de rétrogradation.
T04 — 22 h uniquement : indicateur « éditions intermédiaires non importées » séparé d'« articles manquants ».
T05 — article absent de 22 h mais présent dans 08 h antérieure réellement importée : toujours recherchable ; absence explicitée.
T06 — contenu manquant dans le snapshot malgré prétention de complétude : test de contradiction déclenché si registre témoin existant ; sans registre, statut couverture UNKNOWN et aucune certification.
T07 — deux éditions 22 h de même révision/sha différents : conflit visible, aucun écrasement silencieux.
T08 — correction du même événement avec preuve : ancien et nouveau accessibles, stable eventId.
T09 — plusieurs prompts MD distincts, intégrité octets/SHA, iframe sécurisé et repli de sélection.
T10 — données économiques hors ordre temporel/definition divergente : delta refusé ; aucune courbe trompeuse.
T11 — hypothèse future et jalon observed sans preuve : rejet du fait prétendu ; import Future v1 strict intact.
T12 — HTML/JSON hostile : validation refuse le contenu et ne laisse aucune écriture partielle.
T13 — scripts HTML legacy et ouverture Google : aucune extension d'iframe/CSP, navigation externe uniquement sur geste.
T14 — sauvegarde puis restauration sur profil vierge avec données et identités identiques ; tests négatifs sur ZIP corrompu.
T15 — import offline, requêtes réseau bloquées, remise en ligne et sync simulée sans perte.
T16 — accessibilité clavier/axe/reduced-motion/reflow ; responsive mobile et desktop.
T17 — performances de référence vs V8 avec seuils chiffrés définis préalablement, et signalement des régressions CPU/RAM/JS/précache.
T18 — mutations de tests : retirer un article, falsifier une source, casser un hash, échanger un créneau ou modifier un événement doit faire échouer les assertions correspondantes.
T19 — vieille édition à 21 h et anciens ZIP : compatibilité prouvée ; aucune fausse validation de V8 par anciens tests seulement.
T20 — s'il y a une nouvelle logique d'export cumulatif, un fichier tardif généré sans éditions précédentes importées doit passer les tests d'indexation et de recherche.

Exécuter au minimum npm run lint, npm run typecheck, npm test, npm run build, npm run test:e2e et npm run test:performance lorsqu'ils existent. Rejouer aussi les suites spécifiques cloud uniquement en mocks/local isolé sans comptes réels, tests de sécurité et scripts de secrets sans divulguer les résultats sensibles. En cas de dépendance manquante ou de navigateur absent : NON TESTÉ, ne pas inventer PASS ni télécharger arbitrairement sans analyse/autorisations.
14. Plan d'implémentation et revues
P0 — Inspection / baseline / sauvegarde
Confirmer repo et branche, noter SHA, changements non committés, architecture, tests de référence, contrats exacts et risques. Sauvegarde non destructive des fichiers suivis ; plan de restauration des données locales via exports séparés (ne PAS exporter les vrais profils sans autorisation). Fournir les hypothèses et critères d'échec avant modification.
P1 — Correction sémantique du cumul
Séparer intégrité du snapshot, autonomie des contenus, couverture éditoriale et chaîne d'imports. Corriger assessVersion, vues et wording sans dégrader les protections. Implémenter tests T01–T08 AVANT ou en parallèle de la modification et vérifier qu'ils détectent l'ancien défaut.
P2 — Adaptateur/import robuste
Valider unifiedData, conserver editionData legacy, indexer les items et les annexes à partir de la dernière édition autonome, fusionner non destructivement les anciens contenus, préserver les versions et leurs origines. Tests T09–T15.
P3 — Dashboard et modules
Optimiser Aujourd'hui, Économie, chronologie, Recherche, prompts ; lisibilité d'abord, schémas et preuves à chaque écran, contrôles clavier. Tests UI et accessibilité.
P4 — Performances et sécurité
Profiler plusieurs tailles de bibliothèques, mesurer bundle/précache/mémoire/CPU/réseau, corriger les régressions non justifiées ; rejeter les entrées malveillantes, tester les invariants et l'offline.
P5 — Bilan final et préparation du déploiement (sans déployer)
Produire captures locales si outils disponibles, dossier de preuves, matrice PASS/PARTIAL/FAIL/NON TESTÉ, écarts, comparatif avant/après, limites, vérifications sur appareil réel restantes, guide d'import et message utilisateur. Rapport décision GO local / HOLD / NO-GO. STOP avant commit/push/déploiement/migrations/accès aux données réelles.
15. Conditions d'arrêt et rollback
Arrêter et signaler FAIL/HOLD si : originales modifiées/perdues, source malveillante exécutée, sandbox ou RLS affaiblie, migration cloud non autorisée requise, notes/favoris perdus, incompatibilité V7/legacy non maîtrisée, historique présenté complet à tort, delta économique fabriqué, tests négatifs indétectables, ou impossibilité de sauvegarder/réparer sans risque.

Rollback source : revenir à la branche/commit de référence après conservation du travail et de son diff (sans reset --hard sur dossier utilisateur), restaurer les changements de manière contrôlée. Rollback données : restaurer avec le lecteur compatible les ZIP journal/Future vérifiés sur un profil de test ; ne jamais supprimer IndexedDB, snapshots, archives ou originaux pour revenir à l'interface précédente. Préserver le nouveau lecteur si nécessaire pour ouvrir ZIP v3.
16. Livrables à me rendre à la fin
1. Inventaire de l'architecture réellement inspectée, état Git, fichiers modifiés et pourquoi.
2. Capture/description des écrans Aujourd'hui, cumul, économie, Futur, prompts et recherche (uniquement si réellement produits).
3. Démonstration décisive T01 : UNIQUEMENT fichier de 22 h dans une base vide, 8 événements antérieurs + annexes effectivement accessibles ; preuves/valeurs mesurées.
4. Matrice des tests réels et mutations (PASS/PARTIAL/FAIL/NON TESTÉ), environnement, commandes, dates, cas d'échec corrigés.
5. Comparaison performances avant/après, limites et régressions restantes.
6. Plan de retour arrière vérifiable, compatibilité historique et éventuelles conditions d'arrêt.
7. Contrat et exemple de fichier HTML autonome importable, généré et testé réellement, sans faux article d'actualité (fixtures bien marquées SYNTHÉTIQUES).
8. Proposition facultative d'un registre éditeur persistant pour assurer le cumul entre exécutions de la veille. Ne le présenter comme en service qu'après autorisation et test du flux complet.
9. Verdict distinct : code/local, navigateur, vrai appareil, cloud et production. Aucun « prêt production » sans preuve.
Rappel final : L'utilisateur doit pouvoir n'importer qu'un fichier tardif. On n'efface aucun contenu ancien, on ne rend pas l'import des éditions intermédiaires obligatoire, et on ne masque jamais une réelle incertitude de couverture des sources.