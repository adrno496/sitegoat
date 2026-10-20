MISSION VS CODE — JOURNAL 360° UNIFIÉ V7
Édition : 20 octobre 2026 — cahier des charges de refonte et de migration sans perte de données
Destination : VS Code + Codex / Claude Code / Copilot
Statut initial : code de la copie ZIP inspecté statiquement par ChatGPT ; aucune refonte du dépôt ni aucun test d'exécution du produit n'a été effectué.
0. Instruction prioritaire
Tu es l'architecte et l'implémenteur chargé de reprendre proprement l'application existante de veille Journal 360. L'objectif est une expérience moderne, simple et animée avec sobriété, où les quatre univers Journal 360°, Le Futur (dont l'économie mondiale), SENTINEL Evolution Watch et Avancées majeures IA sont réunis en une seule édition cumulative publiée à 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00 et 22:00, heure Europe/Paris. La dernière édition de 22 h doit rassembler tous les faits accessibles et vérifiés de la journée, sans dupliquer les articles. L'application doit montrer immédiatement une vision mondiale compréhensible sur « Aujourd'hui », une chronologie des avancées IA et des futurs possibles, un suivi économique explicite et sourcé, l'accès direct aux prompts complets téléchargeables .md, et conserver à l'identique ou améliorer la recherche IA existante.

N'écris pas un prototype sans rapport avec le produit : travaille sur le vrai code, préserve les données et les comportements existants, mesure et teste. Si une demande est impossible ou contradictoire avec une protection existante, explique-le et propose l'adaptation minimale sûre.
Décision sur la portée
- Autorisées dans une copie/branche locale réversible : lecture du code, tests non destructifs, corrections, composants UI, migrations compatibles, adaptateurs d'import, documentation, exemples synthétiques, amélioration des tests et création des fichiers de rapport.
- Interdites sans approbation distincte : modifier ou déployer la production, faire un push ou une publication, exécuter une migration distante Supabase, supprimer des dossiers ou données, remplacer des originaux, affaiblir CSP/iframe/RLS/auth, exposer secrets/identifiants, scanner un tiers, contacter des prospects, utiliser une clé API payante, effectuer des achats ou investissements.
- Arrêt immédiat si l'inspection révèle des fichiers sensibles, l'impossibilité d'assurer une restauration, un contrat de données inconnu, une divergence majeure entre le ZIP et le vrai dépôt ou une migration incompatible. Rendre un diagnostic et demander une décision, plutôt que forcer une réussite artificielle.
1. Code connu : points vérifiés dans le ZIP transmis
J'ai inspecté le contenu du répertoire veille/veille/ du ZIP fourni, sans établir qu'il s'agit du répertoire Git réellement actif ni de la version déployée. Plusieurs copies coexistent dans l'archive : veille/veille/, veille/journal360-reader-release/, veille/journal360-pwa/, veille/journal360-v6-worktree/. Choisir le projet courant après vérification de Git, du chemin, des dates et du lien de déploiement : ne pas mélanger ces variantes.

Éléments de référence constatés statiquement dans veille/veille/ :
Référence	Existant / risque précis
package.json	React 19, TypeScript, Vite 8, Dexie 4, Supabase JS, Zod 4, JSZip, PWA, Vitest, Playwright ; version du package 2.0.7 dans cette copie.
src/App.tsx	Application existante comportant Aujourd'hui, Bibliothèque, Articles, IA majeur, Sentinel, Le Futur, Recherche, Mémoire, Réglages. Très grand composant : éviter d'y concentrer tout le nouveau code.
src/data/editorial.ts	Bloque actuellement les huit horaires : SLOTS = ["08:00", "16:00", "21:00"], schéma Zod et tableaux limités à 3.
src/data/model.ts	slotsIncluded/missingSlots limités à 3, firstSeenSlot ancien enum, métadonnées et originaux à préserver.
src/data/day.ts, src/features/DayView.tsx	Fusion logique par jour, affichage de cumul et des créneaux fondés sur les anciens horaires.
src/features/import.ts	Extraction des métadonnées des HTML et validation des anciens firstSeenSlot; préserve les octets originaux.
src/data/articles.ts, src/features/ArticlesView.tsx	Indexation inter-versions avec anti-doublon fondé sur eventId ; recherche texte, filtres et lecture.
src/features/future/schema.ts, import.ts, db.ts	Contrat prospectif distinct, Zod strict : journal360.future version 1, futureData, révisions, preuves et dossiers persistants. Ne pas lui donner directement un HTML magazine non conforme.
src/features/future/FutureTimeline.tsx, FutureScenarioCompare.tsx, FutureSignals.tsx, FutureView.tsx	Chronologie/scénarios/signaux déjà codés : étendre et unifier l'UX, pas supprimer ces fonctionnalités.
src/features/vscodePrompt.ts	Extraction d'un unique prompt via textarea/pre : une pluralité de prompts provoque actuellement une erreur.
src/features/googleAi.ts, GoogleAiDialog.tsx, googleAiSession.ts, Reader.tsx	Recherche Google Mode IA / question explicite, confirmations, sécurité de navigation : conserver ce parcours et ses protections.
src/data/db.ts, src/features/backup.ts, src/features/cloud.ts, src/features/sync.ts	Journaux et originaux locaux, ZIP, synchro Supabase ; ne pas casser compatibilité ni exporter secrets.
docs/JOURNAL360_ONE_HTML_PER_DAY.md	Une carte par date et plusieurs versions cumulatives : c'est déjà le bon principe ; le lecteur ne recompose pas le contenu manquant de la dernière édition.
docs/FUTURE_IMPORT_GUIDE.md	Dossiers Le Futur séparés, import v1 strict et sauvegarde Le Futur spécifique, sans synchronisation automatique.


Point critique : l'ancien horaire 21:00 doit rester lisible dans les archives historiques, mais ne doit pas être compté comme un des huit créneaux du nouveau programme. De même, d'anciennes éditions de 12 h provenant d'autres générations peuvent exister. Versionner les plans horaires au lieu de remplacer brutalement les enums.

Les rapports de tests inclus dans le ZIP sont des documents historiques, pas des tests exécutés par toi aujourd'hui. Refaire une baseline réelle dans ton environnement avant toute affirmation.
2. Phase P0 — inspection, inventaire, base de référence et sauvegarde
1. Identifier la racine effective (pwd, dépôt, branche, git status, git log -5, dossier de travail, fichiers de config) et noter les ambiguïtés entre copies. Préserver le travail non commité ; ne jamais faire git reset --hard ni effacer les fichiers inconnus.
2. Lire en entier les schémas de données, les composants « Aujourd'hui », collections, articles, recherche, prompts, Future, import HTML, iframe sandbox/CSP, IndexedDB, backup et synchronisation cloud.
3. Cartographier les UX existantes par parcours, rôles et appareils. Lister les fonctionnalités et écrans qu'il est interdit de perdre : favoris, lecture, annotations, archives, restauration, historique d'une date, import des anciens HTML, séparation des dossiers, questions Google IA, export ZIP, notifications de synchronisation, offline, espace privé, thèmes, PWA.
4. Vérifier la possibilité de créer une copie de sauvegarde restituable de la version locale et des données de test ; ne pas prélever ni exporter des données privées réelles sans accord. Préparer plan de rollback branche + fichiers + migration réversible ou migration additive.
5. Établir la baseline avec les scripts pertinents et réellement disponibles (npm run lint, npm run typecheck, npm test, npm run build, npm run test:e2e, tests de performance si faisables) ; ne pas lancer d'installation réseau ou scripts inconnus avant inspection/permission. Si des dépendances ou navigateurs ne sont pas installés, noter NON TESTÉ : pas de faux PASS.
6. Fixer des seuils d'acceptation avant de coder : aucune perte d'originaux/notes/favoris/historique, aucun contournement de la sécurité, 8 créneaux pris en charge, cumul idempotent, accès aux prompts complets, recherche préservée, 4 zones économiques sourcées, navigation clavier/mobile, dégradation hors-ligne sûre.
3. Cible fonctionnelle — une seule veille, huit rendez-vous
3.1 Horaires
Fuseau Europe/Paris, passage heure d'été/hiver géré par une bibliothèque/date fiable ou Intl, sans multiplier les exécutions ni supposer UTC+1 fixe :

08:00 · 10:00 · 12:00 · 14:00 · 16:00 · 18:00 · 20:00 · 22:00.

La veille ChatGPT programmée est distincte du code PWA : ne prétends pas pouvoir reprogrammer les tâches ChatGPT depuis ce dépôt. Construis les contrats d'import et les interfaces des éditions produites par cette veille.

À 08 h, démarrage éditorial du jour ; les passages suivants conservent les articles et corrigent/ajoutent des faits ; 22 h est l'édition finale de synthèse. Ne pas inventer de nouveauté à chaque créneau : actualiser la vérification, signaler « pas d'évolution matérielle » si pertinent. Un cumul n'est COMPLETE que si les éditions précédentes ont été effectivement chargées et fusionnées OU si une reconstruction documentaire contrôlée du jour a été effectuée. Sinon PARTIAL, missingSlots, sourcesNotVerified et un message visible. Une édition perdue ne doit pas être recréée fictivement.
3.2 Modèle éditorial unique
Créer un contrat versionné de l'enveloppe unifiée avec validation Zod, sans écraser editionData historique et journal360.future v1. Champs attendus, à adapter au code réel :
- format, schemaVersion, editionId = journal360-day-YYYY-MM-DD, editionDate, timezone, scheduleId, editionSlot, revision, sourceVerifiedAt, slotsIncluded, missingSlots, cumulativeStatus, coverageWindow.
- items[] avec eventId stable, id, title, category, sourceWatch (journal360/future/sentinel/ai-major), firstSeenSlot, lastChangedAt, eventDate, publishedAt, verifiedAt, summary, plain, detail, sourceRecords, evidenceStatus, importance, actions, corrections, relatedEventIds, publicResearchQuestion.
- futureInsights : observations prouvées, scénarios/hypothèses, signaux contradictoires, jalons datés, horizons 2027/2030/2035/2040+, preuves et conditions d'invalidation.
- economicSnapshots : France, zone euro/Europe, États-Unis, Chine, date de statistique, unité, période de référence, fournisseur, série, mise à jour, lecture et contre-indicateurs. Un même indicateur ne doit pas être assimilé à une série comparable s'il a changé de définition.
- promptAssets[] : promptId, eventId, product (sentinel/axdia/vscode/analyse), filename, mime, content intégral et, si possible, SHA-256 calculé pour vérifier l'identité.
- provenance, warnings, validation, previousRevisionRef ; pas de fausses preuves d'accès à un fichier.
Important : cette liste décrit le contrat cible, pas le schéma actuellement accepté. Définir les noms exacts après lecture du parseur, documenter les migrations et les rejets ; limiter taille et profondeur pour se prémunir contre contenu hostile et ZIP bomb. Les nouveaux champs peuvent aller dans un bloc JSON INERTE séparé si accepté par le parseur du magazine ; ne pas ajouter futureData dans un HTML qui serait envoyé directement au validateur Future strict sans adaptateur. Les données étrangères sont toujours du TEXTE NON FIABLE.
3.3 Fusion et fiabilité
- Une date = une carte « journée » avec versions accessibles, lien 08→10→12→14→16→18→20→22. Dernière édition effectivement disponible en premier ; les anciens originaux restent téléchargeables.
- Fusion idempotente, robuste aux imports en retard, en double ou désordonnés. eventId immuable pour les mises à jour ; garder une trace de correction lisible. Nouveau fait indépendant = nouveau eventId, lien relatedEventId quand applicable ; aucune suppression silencieuse.
- Maintenir notes/favoris/états de lecture liés aux originaux et à l'identité éditoriale ; appliquer une stratégie documentée pour les liens vers des versions anciennes.
- Une modification rétroactive importante affiche « corrigé », l'heure, le motif et les sources. Différencier nouvelles, enrichies, inchangées, corrigées, abandonnées et hypothèses.
- Une seule fois les événements dans l'index « Articles » ; pas de double comptage entre Journal, Future, SENTINEL et IA majeure ; mais conserver la trace de leur provenance.
- Adapter src/data/editorial.ts, model.ts, day.ts, import.ts, DayView.tsx et tous consommateurs. Introduire scheduleId ou version de schéma pour distinguer anciens créneaux 08/16/21 et nouveaux 8 créneaux. Tests de migration, pas de heuristique qui classe une archive 21:00 comme incomplète au regard du plan 2026.
4. UX/UI — une refonte profonde mais progressive
Écran « Aujourd'hui » — priorité absolue
En moins de dix secondes de lecture, l'utilisateur doit savoir ce qui a changé, ce qui compte, les risques et la prochaine décision. Concevoir une page d'accueil en français, vivante mais sobre :

A. En-tête : JOURNAL 360° UNIFIÉ, date locale, dernière vérification réelle, créneau en cours, état du cumul, indicateur offline/synchronisation sans fausse promesse. Barre discrète des huit créneaux cliquables (disponible / en cours / manquant / non encore programmé), non remplie artificiellement.

B. « Le monde en 60 secondes » : synthèse narrative grand public 5–8 phrases compréhensibles, IA/économie/futur/technologie/sécurité/risques, qui/quoi/quand/conséquence/limites. Distinguer texte de synthèse sourcé et commentaire, avec accès aux articles correspondants. Ne jamais réduire cela à des scores sans explication.

C. Les faits à retenir : 3–6 cartes maximum en vitrine, importance justifiée, catégorie, « Ce qui a changé », « Pourquoi c'est important », « Ce qu'on ne sait pas », source. Voir tous les articles via un lien distinct, pas une page interminable.

D. Les quatre univers : cartes Journal 360, IA majeure, Le Futur, SENTINEL ; chacune présente son état, ses nouveautés, sa dernière actualisation et une action utile. Une nouvelle source n'implique pas nécessairement une alerte majeure.

E. Économie mondiale : bloc visible directement, sans aller chercher l'onglet : France, zone euro/UE, USA, Chine, avec mini-tableau « situation / tendance / dernière statistique / risque / raison / source ». Quatre statuts descriptifs normal, vigilance, tensions importantes, crise constatée seulement avec preuves suffisantes, sinon indéterminé. Mettre les dates de chiffres au premier plan (beaucoup de statistiques sont mensuelles/trimestrielles). Graphiques seulement sur vraies séries comparables, pas de courbes inventées. Montrer delta depuis la dernière publication et non depuis le dernier créneau quand aucune statistique nouvelle n'est parue. Barre « Pour moi : agir / préparer / surveiller / ne rien changer » fondée sur données effectivement disponibles ; pas de conseil financier personnalisé.

F. Chronologie IA & Futur : aperçu interactif réel, distinct FAITS observés / HYPOTHÈSES / SCÉNARIOS, jalons jusqu'en 2027/2030/2035/2040+, progression d'un signal, preuves, objections, déclencheurs, date et lien vers dossiers Future. Aucun progrès global « vers AGI » chiffré sans méthodologie robuste.

G. ACTIONS utiles : au plus trois actions justifiées par des faits, effort, risques, liens vers preuves et vers prompt si applicable ; ne pas inventer des actions pour remplir un emplacement.

H. Accès immédiat : recherche globale, « Mes prompts .md », « Tous les articles », « Comparer les éditions », « Archives », « Importer une édition » ; peu d'encombrement sur mobile.
Navigation complète
Conserver les parcours existants et améliorer hiérarchie/simplicité. Organisation proposée, à valider par vrais tests :
- Aujourd'hui (dashboard)
- Actualités / Articles (filtres globaux)
- IA & modèles (grandes avancées)
- Le Futur (scénarios, signaux, chronologie, contradictions, préparation)
- Économie (France, Europe, États-Unis, Chine, séries/échéances et scénarios)
- SENTINEL (innovations réellement applicables et prompts)
- Prompts VS Code (bibliothèque autonome)
- Recherche IA (recherche textuelle + parcours Google existant)
- Bibliothèque & archives
- Réglages, sauvegardes, confidentialité et diagnostic
Regrouper certaines pages sous sous-navigation, mais ne supprimer aucune fonction existante. Desktop : navigation claire, sidebar compacte facultative ; mobile : onglets courts avec accès « Plus ». Privilégier une structure React en composants ciblés plutôt qu'un grossissement supplémentaire de App.tsx.
Design
Proposer une identité éditoriale soignée, contrastée, avec thème sombre anthracite et touches rouge/corail, clair de qualité, choix des couleurs déjà enregistrées préservé. Titres lisibles, respiration, cartes hiérarchisées, chiffres et dates tabulaires, états de chargement/erreur/absent, liens sources visibles. Microanimations uniquement utiles (progression de la journée, apparition douce, timeline au scroll, évolution économique), sans vidéo lourde ni animation permanente ; respecter prefers-reduced-motion. Responsive 320, 360, 390, 430, 768, 1024, 1440 px, clavier, focus, lecteurs d'écran, WCAG 2.2 AA visé, contraste, cibles tactiles et impression. Ne pas imposer un zoom à 70 % sur tout le site ; préserver le lecteur legacy puis corriger son ergonomie par tests, pas par suppression aveugle de son comportement.
5. Chronologie IA / prospective à valeur réelle
S'appuyer sur src/features/future/* existant et sa base locale séparée, respecter le schéma strict journal360.future v1. Prévoir :
- Vue « Ce qui a déjà eu lieu » strictement sourcée avec dates événement/publication/vérification, publication de modèle, avancée de benchmark, disponibilité produit, découverte scientifique, échec ou retrait.
- Vue « Trajectoires » séparée en scénarios 2027/2030/2035/2040+, avec hypothèses, indices favorables, objections fortes et événements invalidants ; ne pas présenter une hypothèse comme une prédiction.
- Comparaison des versions d'un dossier et évolution temporelle des signaux (observé, à surveiller, contredit, inconnu) sans fusion naïve de faits hétérogènes.
- Liens entre un article du jour, un signal Future et une action, par identifiants explicites et références sûres ; si le lien ne peut pas être établi, ne pas l'inventer.
- Dashboard prospectif pour non-spécialiste : « ce qui est confirmé », « ce que cela pourrait changer », « ce qu'on observe ensuite ».
Choisir une architecture d'adaptateurs : importer le journal cumulatif via son parseur sécurisé, proposer ou dériver des documents Future v1 valides quand des contenus sont réellement qualifiés, en conservant leur cycle de révisions. L'import Future actuel refuse les scripts supplémentaires/actifs ; ne jamais assouplir sa sécurité juste pour faire accepter le HTML unifié. Une transaction inter-bases Dexie ne doit pas être prétendue atomique : enregistrer intention, validations, réussite partielle et mécanisme de reprise/compensation documenté. Préserver l'import indépendant Future JSON/HTML, les notes et la sauvegarde Future séparée ; si une vraie fusion de sauvegardes est envisagée, exiger une migration et un test de restauration avant adoption.
6. Économie mondiale — radar, comparaisons, prudence
Définir des séries économiques clairement typées (pays/zone, organisme, nom, code de série si source officielle, unité, fréquence, période, date publication, date révision, valeur, variation, statut de comparabilité et URL source). Priorité : inflation, croissance PIB, emploi/chômage, PMI, taux directeurs BCE/Fed/PBoC, taux souverains, crédit/immobilier, dette/déficits, énergie, commerce international, indicateurs Chine et tensions financières. Ne pas afficher tous les chiffres s'ils ne sont pas collectés et vérifiés ; l'interface doit fonctionner avec des données partielles.

Produire des lectures France/Europe/USA/Chine à partir de preuves, avec risque expliqué et meilleur contre-argument. Distinguer clairement :
- Publication d'une nouvelle donnée vs même valeur réaffichée à 8 éditions.
- Niveau d'un indicateur vs variation sur période réellement comparable.
- Événement de marché vs risque systémique (pas d'étiquette « crise » sur un seul graphique).
- Tendance constatée vs scénario (récession, stagflation, croissance molle, rebond, choc énergétique).
- Impact général vs décision personnelle hypothétique (emploi, emprunts fixes, besoin de liquidités, projet de vente, business) ; ne pas estimer une situation financière privée sans données actualisées.
Prévoir filtres zone/période/indicateurs, accessibles au clavier, cartes lisibles et graphiques avec tableau de données accessible. Source + date directement visibles. Distinguer indisponible, jamais vérifié, inchangé, corrigé, en retard. Ne jamais envoyer les montants financiers personnels du navigateur à Google/IA sans consentement.
7. Prompts .md — fonctionnalité de premier niveau
Chaque piste SENTINEL / AXDIA / VS Code évaluée et chaque découverte IA approfondissable peut posséder son prompt Markdown COMPLET. Aucun faux fichier ou prompt résumé.
1. Dans un HTML de veille compatible, embarquer le texte intégral et inerte du prompt, idéalement dans JSON sérialisé correctement (< encodé \\u003c) ou une zone readonly ; ne pas exécuter le HTML importé. Préserver la compatibilité des anciens HTML à textarea#fullPrompt, #vscodePrompt, etc.
2. Modifier src/features/vscodePrompt.ts pour extraire 0, 1 ou plusieurs prompts distincts avec identifiants, sans erreur collective lorsque plusieurs candidats existent. En présence de plusieurs, afficher une liste pour choisir chaque prompt, pas un téléchargement ambigu.
3. Offrir sur l'article, dans SENTINEL et dans la bibliothèque des prompts : Voir, Copier, Sélectionner, Télécharger le .md. Le nom de fichier doit être sûr et spécifique (J360_YYYY-MM-DD_SENTINEL_<SUJET>_VSCODE.md). Blob de type Markdown UTF-8, checksum/test d'égalité avec contenu embarqué.
4. Le lecteur HTML est en iframe sandboxée. Un clic sur un bouton interne n'autorise pas magiquement les téléchargements ; déplacer l'export dans l'UI hôte sur geste utilisateur ou proposer une action hôte contrôlée. Ne jamais activer allow-downloads, allow-same-origin, popups ou scripts supplémentaires sans analyse de sécurité et accord. En échec, la sélection manuelle reste possible ; ne pas afficher « téléchargé » quand le navigateur ne l'a pas confirmé.
5. Les prompts complets doivent inclure : contexte, source, objectif, bénéfice non mesuré, audit de l'existant en lecture seule, évaluation NE RIEN CHANGER/OPTIMISER/AJOUTER, sécurité, licences, données privées, dépendances, coûts, tests avant/après, critères GO/HOLD/NO-GO, refus des opérations risquées sans accord, rollback, rapport honnête. Ils ne déclenchent aucune modification depuis la PWA.
6. Ne pas mélanger le prompt public d'approfondissement Google avec les prompts pouvant contenir des informations sur l'architecture privée ; bloquer l'envoi externe des contenus privés.
8. Recherche IA : aucune régression
Conserver recherche textuelle locale sans accents/casse, filtres/articles/archives, favoris et lecture, ainsi que les mécanismes existants googleAi.ts, GoogleAiDialog.tsx, googleAiSession.ts, la validation des URLs/questions et la confirmation utilisateur. L'utilisateur doit pouvoir :
- Rechercher simultanément articles, événements, sources, signaux Future, économie et prompts par mots-clés, avec filtres par date, thème, pertinence, statut et source. Index local, pas de fuite de documents à un service externe.
- Depuis un article public, obtenir une question d'approfondissement explicite, la lire/éditer/copier, puis ouvrir volontairement Google Mode IA ou Google Recherche classique. Mode IA non garanti selon compte/région ; aucun préremplissage promis. Les liens existants et règles de protection des questions restent valides.
- Différencier la recherche locale dans l'application de la recherche IA distante. Aucun résumé « généré par IA » ne doit être présenté comme issu du moteur local s'il provient d'un service externe. Si une recherche sémantique locale est réellement implémentée, mesurer CPU/RAM/index, dégradation hors ligne et consentement ; sinon conserver le texte full-text plutôt qu'une simulation trompeuse.
- Vérifier les limites de sécurité existantes (postMessage, nonce/session, origine, allowlists, CSP, sandbox, URLs HTTPS sûres, noopener,noreferrer). Ne pas faire de window.open différé ni d'envoi automatique au chargement.
9. Import/export et sauvegardes
- Contrat d'entrée principal : un HTML autonome JOURNAL360_YYYY-MM-DD_EDITION_08H00.html ... 22H00.html avec editionData valide pour le magazine (ou une variante rétrocompatible après migration). Contenu historique non tronqué ; CSS/JS embarqués pour lecture offline si permis par le lecteur. Pas de CDN, télémetrie ni scripts tiers.
- Dans le format d'édition unifié, inclure de quoi reconstruire un index complet et tous les prompts téléchargeables. Tout prompt externe généré doit également exister comme fichier .md distinct lorsqu'on produit un pack ; l'HTML ne doit pas dépendre de ce fichier.
- Prévoir import manuel garanti après validation ; import automatique facultatif seulement si une source/authentification, une API et un mécanisme d'intégrité ont été réellement conçus/testés et explicitement autorisés. Une veille ChatGPT programmée ne peut pas injecter automatiquement dans le site à partir d'une simple consigne texte.
- Journaux legacy avec horaire 21 h, nouvelle série avec 22 h : aucun rejet ni renumérotation abusive. Anciennes cartes/journaux/mémoire/restaurations cloud inchangés.
- Vérifier les limites réelles de 10 Mo par HTML, quota de fichiers par import, consommation IndexedDB, taille des originaux, temps d'indexation, performance sur Mac et téléphone, cas de stockage plein, fichiers partiels, malformés, sans réseau, grandes bibliothèques.
- Sauvegarde ZIP : contrôle SHA-256 et restaurations en fusion non destructives ; démontrer sauvegarde → restauration sur un jeu de données synthétiques réaliste et ancien, y compris Future (sauvegarde distincte actuellement).
- Ne pas déposer des données privées dans public/, GitHub, Vercel, journaux de tests, snapshots, ou logs Cloud. Aucune clé Supabase/service role dans le frontend. Validation de MIME, extension, schéma, longueur, nombre de fichiers, caractères de contrôle, ZIP traversal, zip bomb, attaques </script> et URLs dangereuses.
10. Ordre de réalisation (petites étapes vérifiables)
P0 — Diagnostic : inspection/état Git, architecture, tests baseline, sauvegarde, risques et plan minimal.

P1 — Contrat et import 8 horaires : plan éditorial versionné, anciens horaires préservés, schéma Zod, parseur, day.ts, historique/cumul, exemples synthétiques aux 8 heures, tests. Ne pas passer à P2 si anciens journaux ou données réelles simulées sont détruits.

P2 — Données indexées : sourceWatch, prompts multiples, synthèse, déduplication, champs économiques et chronologie, nouvelles métadonnées additives et index locaux. Aucun remodelage destructif de DB.

P3 — Dashboard « Aujourd'hui » : nouveau design responsive, synthèse en 60 secondes, 4 univers, baromètre économique, raccourcis chronologie IA, huit horaires et états d'incertitude.

P4 — Chronologie / économie : connecter les composants Future existants, enrichir économie avec des fixtures factices identifiées pour tester et des données réelles seulement si fournies/sourcées, cartes, comparaison, graphes sobres, liens dossiers.

P5 — Prompts, recherche, navigation : liste de prompts et export host, recherche globale sûre, IA Google inchangée, accès aux articles, favoris et archives. Aucune demande externe involontaire.

P6 — Robustesse : offline/PWA, sauvegarde-restauration, performances, sécurité, accessibilité, tests négatifs et non-régression, documentation, plan rollback.

P7 — Rapport final et démo LOCALE : fournir l'adresse locale seulement si serveur vraiment lancé, captures si générées, journal des changements et statut. Aucune publication, aucun déploiement sans accord distinct.
11. Jeux de tests obligatoires et cas négatifs
Avant implémentation, poser les assertions :
1. 08:00 puis 7 éditions successives ; un événement introduit à 10 h apparaît à 22 h une seule fois. Ajout, correction, changement d'importance et source supplémentaire conservés ; première apparition correcte.
2. Import 22h avant 08h, double import, déconnexion, sauvegarde/restauration, arrivée d'un vieil original 21h : aucune rétrogradation ni perte. L'état COMPLETE doit être impossible si un créneau réellement absent n'a pas été reconstitué.
3. Les anciens HTML 08/16/21 et les anciens dossiers Future v1 continuent à s'importer et s'ouvrir ; les deux planifications ne sont jamais confondues.
4. Plusieurs prompts .md dans un même HTML : affichage des titres, téléchargement séparé, identité octet pour octet du texte UTF-8 ; zéro prompt → pas de faux bouton.
5. Aucune exécution d'un <script> importé, d'onerror, d'URL javascript:, de HTML malveillant dans JSON ; </script> correctement neutralisé ; injection testée avec entrées hostiles. CSP et sandbox au moins aussi fortes qu'avant.
6. Recherche locale avec mots accentués, plusieurs versions et catégories ; Google IA accessible par le parcours existant, sans requête externe automatique ; contenu privé jamais ajouté à une question publique.
7. Les séries économiques affichent la bonne unité, date, source, fréquence ; les tableaux et graphes s'accordent. Si une série est absente ou trop vieille, afficher l'incertitude, pas des chiffres générés.
8. Scénario Future sans preuve reste « hypothèse » ; un jalon futur ne peut pas devenir « observé » ; sources manquantes, statut ou enum invalide rejetés avec message accessible.
9. Démo interface mobile 320/360/390/430 px, tablette 768, desktop 1024/1440, clavier uniquement, lecteur d'écran via audit automatique + vérification manuelle, reduced-motion, hors ligne avec caches disponibles, stockage plein et quotas. Vérifier que « Aujourd'hui » reste compréhensible sans ouvrir de sous-menu.
10. Tests de détection : introduire volontairement, dans un fixture de test jetable, au moins une correction invalide/un doublon et un prompt tronqué pour démontrer que les tests échouent correctement. Remettre les fixtures en état et rejouer. Un test qui ne détecte jamais l'anomalie ne prouve rien.
Commandes candidates après inspection du projet : npm run typecheck, npm run lint, npm test, npm run build, npm run test:e2e, npm run test:performance, et tests de sauvegarde/restauration. Documenter les commandes réellement lancées, OS, Node, navigateurs, horodatage et preuves ; ne pas inférer un succès navigateur depuis un test unitaire.
12. Critères de réussite et causes d'échec
Acceptation P1–P6, chacune testée séparément :
- 8 horaires reconnus en Europe/Paris ; ancien 21:00 lisible, calendrier DST correct et aucun article dupliqué ; état de cumul fidèle.
- « Aujourd'hui » accessible et global en une page : synthèse compréhensible, quatre univers, état économique FR/UE/USA/Chine, aperçu IA/futur, accès rapide aux articles/prompts.
- Recherche locale, Google IA, dossiers Future v1, import HTML legacy, notes/favoris/historique/cloud/ZIP/PWA et mode hors ligne préservés sur périmètre vérifié.
- Choix et export de plusieurs vrais prompts Markdown intégraux, sans perte ni permission sandbox dangereuse.
- Accessibilité, UX clavier/mobile, consommation et stabilité au moins équivalentes sur scénarios comparables ; aucun appel réseau additionnel inattendu.
- Test de restauration et non-régression passés ; aucun secret ou contenu privé publié.
FAIL/BLOCKED si : perte de données ou droits, ancien format illisible, cumul marqué COMPLETE sans preuve, faux graphique économique, fusion « futur/journal » qui supprime un dossier, recherche IA cassée, contournement CSP/sandbox, fuite de prompt privé, export .md tronqué, ou test masqué/ignoré. Marquer les autres zones PARTIAL / NON TESTÉ plutôt que cacher un échec.
13. Format du rapport de fin de mission
Rends :
1. Résumé du résultat : ce qui fonctionne réellement et ce qui reste à faire.
2. Racine et version inspectées, branche/état Git, fichiers modifiés, migrations et raisons.
3. Fonctions conservées avec preuves de non-régression ; interfaces modifiées ; incompatibilités et alternatives.
4. Matrice de tests : PASS/PARTIAL/FAIL/NON TESTÉ/NON APPLICABLE + environnement/commande/résultat/preuve/limites ; résultats négatifs qui ont véritablement détecté les défauts.
5. Meilleure objection à « prêt à l'emploi », risques résiduels, validations indépendantes encore requises.
6. Rollback détaillé et testé si possible ; sauvegarde et restauration sans perte prouvées ou non prouvées.
7. Livrables localement accessibles : codes modifiés, exemple HTML à 08/10/12/14/16/18/20/22 à données explicitement SYNTHÉTIQUES, README des imports, schémas versionnés, tests et guide d'utilisation. Ne pas dire qu'un fichier existe sans le constater.
8. Décisions qui nécessitent mon accord avant migration distante, déploiement, publication ou toute action irréversible.
Priorité finale : moins de confusion, une meilleure lecture, zéro perte de fonctions et des preuves de fonctionnement — pas un score marketing de « 100 % ».