# Journal 360 Mobile

Candidat local issu de l’audit du 24 octobre 2026. Branche `codex/sitegoat-audit-v4-local`, worktree `/Users/dreano/Downloads/veille/sitegoat-implementation`, référence initiale `987b563`. Le mandat complémentaire autorise le push non forcé sur main puis le test V10 en production après validation locale ; consulter les preuves de publication avant d’assimiler le site public à ce candidat. [Bilan local](audits/sitegoat/implementation-2026-10-24/06_RAPPORT_FINAL_SITEGOAT.md).

Une bibliothèque personnelle de journaux HTML, en français, installable comme PWA. Les éditions sont importées manuellement ; aucun contenu privé n’est livré dans le site. Les deux éditions proposées pour découvrir l’application sont **entièrement fictives**.

Version publiée : [sitegoat.vercel.app](https://sitegoat.vercel.app). [Rapport de tests](TEST_REPORT.md).

## Sitegoat V9 — application 2.1.1

Navigation principale : Accueil, Aujourd’hui, Articles, Paramètres. Le tableau de bord présente les faits importés, les changements et signaux documentés, des points économiques comparables ou un état d’historique insuffisant. Aujourd’hui privilégie les résumés par article ; les diagnostics et originaux par créneau se trouvent dans les paramètres avancés. Le menu Autres espaces conserve les destinations historiques.

Le compagnon inerte `quickBriefsData` v1 du Journal V9 est validé et conservé séparément du V7 strict, indexé sans dépendre des imports intermédiaires et récupérable depuis les originaux/sauvegardes anciens. Le lecteur garde l’original, son interface et l’isolation opaque ; les liens publics et téléchargements Markdown natifs attachés ou détachés passent par une confirmation dans le parent, avec session liée au cadre et vérification du prompt exact. Le producteur externe et son registre ne sont pas présents dans ce dépôt.

[Guide V9](GUIDE_UTILISATEUR_V9.md) · [Audit initial](AUDIT_SITEGOAT_AVANT.md) · [Plan](PLAN_V9.md) · [Contrat producteur](SPEC_PRODUCTEUR_J360_V9.md) · [Tests réels](RAPPORT_TESTS_V9.md) · [Fichiers modifiés](FICHIERS_MODIFIES_V9.md) · [Risques et rollback](RISQUES_ET_ROLLBACK_V9.md).

## V8 — snapshot autonome

Un seul HTML tardif suffit pour les articles, données économiques, jalons et prompts réellement contenus. Les quatre diagnostics séparent intégrité, autonomie, couverture et historique reçu. Les versions intermédiaires sont facultatives ; aucune couverture factuelle totale n’est certifiée sans preuve indépendante. [Guide V8 et rollback](docs/JOURNAL360_V8_IMPORT_GUIDE.md) · [Plan et critères](docs/JOURNAL360_V8_PLAN.md). La publication V8 sur `main` a été autorisée séparément après validation locale ; les limites et résultats restent détaillés dans le [rapport V8](docs/JOURNAL360_V8_REPORT.md).

## Journal 360 unifié V7

L’accueil réunit les huit éditions cumulatives **08/10/12/14/16/18/20/22**, les quatre univers, le radar économique FR/Europe/USA/Chine et la chronologie IA/Futur. Les états absents ou partiels restent visibles. La sous-navigation donne accès aux prompts multiples et à une recherche globale textuelle locale, en conservant les parcours historiques.

[Guide des imports et des sauvegardes V7](docs/JOURNAL360_V7_IMPORT_GUIDE.md) · [Rapport et preuves](docs/JOURNAL360_V7_REPORT.md) · [Exemples synthétiques](public/examples/unified/README.md). Les anciens ZIP v1/v2 restent lisibles ; les ZIP contenant V7 portent la version 3 et nécessitent la mise à jour des appareils avant tout usage cloud réel. La publication sur `main` est autorisée séparément après validation locale. Les limites de ressources, les appareils physiques non testés et la coordination des clients ZIP v3 restent détaillés dans le rapport.

## Démarrer

Node 24 recommandé.

```sh
npm ci
npm run dev
```

Pour tester le service worker localement (cloud désactivé par défaut) :

```sh
npm run build
npm run preview
```

Pour activer explicitement les fonctions cloud locales avec vos variables serveur : `JOURNAL360_ALLOW_CLOUD_LOCAL=1 npm run preview`. Ne jamais utiliser ce mode pour les tests isolés.

Ouvrir `http://127.0.0.1:4173`. `npm run dev` sert l’interface ; il ne lance pas l’API cloud. Une adresse HTTPS de production est nécessaire à l’installation sur téléphone.

## Utilisation

Les onglets **IA majeur** et **Sentinel** accueillent vos HTML dans deux espaces dédiés. Depuis l’un de ces onglets, l’import sélectionne cet espace par défaut ; le champ **Ranger ce HTML dans** permet aussi de choisir la destination depuis un import général. Chaque dossier reste indépendant, même daté du même jour. Un doublon ne remplace qu’une copie du même espace. Recherche, lecture HTML, archives, corbeille et restauration sont disponibles dans chaque onglet ; le classement est conservé dans les sauvegardes ZIP et la synchronisation. Depuis V9, ces destinations restent accessibles sur téléphone via Autres espaces ; les quatre entrées principales gardent la priorité.

Dans **Sentinel**, **Voir les prompts VS Code** inspecte les anciens HTML sans les exécuter. Chaque prompt distinct propose Voir, Copier, Sélectionner et **Télécharger le prompt VS Code (.md)**. Les éditions V7 exposent directement leurs prompts validés, également dans Articles et Mes prompts .md. Aucun bouton de téléchargement n’est créé quand le document ne contient pas de prompt. Le texte UTF-8 est conservé intégralement, hors ligne et sans envoi externe.

L’onglet **Articles** réunit automatiquement les articles structurés de toutes les veilles importées, archives comprises. Rechercher dans les titres, textes et sources, filtrer par rubrique, veille ou état de lecture, puis lire un article et passer au suivant. Les favoris et lectures utilisent la mémoire existante. Le journal d’origine reste accessible et son retour conserve les filtres. Les articles répétés dans les versions d’une même journée sont regroupés sur leur dernière occurrence ; ceux présents seulement dans une ancienne version restent accessibles. Les journaux sans sommaire structuré restent lisibles dans la Bibliothèque.

Le **sommaire visible** donne accès à tous les titres correspondant aux filtres, indépendamment de la pagination des fiches. Cliquer sur un titre ouvre directement l’article dans le HTML d’origine ; le format Magazine 6.4.4 ouvre son analyse complète. Les filtres sont compacts et repliés derrière **Filtres et tri**. **Lire ici** garde la lecture texte disponible. En mode sécurisé ou pour un format sans navigation reconnue, le lecteur affiche le texte indexé de l’article en indiquant ce repli ; les octets du HTML original restent intacts.

**Question Google** est disponible sur les fiches et dans la lecture texte. La question explicite de l’article est relue dans l’original, y compris pour les veilles déjà importées aux formats 6.1, 6.4 et 6.4.4. Le dialogue existant permet sa modification, sa copie, la recherche Google classique ou l’ouverture du Mode IA sans texte. Sans question préparée, le champ reste vide pour une saisie manuelle. Aucune recherche ne part à l’ouverture d’un article ou du dialogue.

1. **Importer** un ou plusieurs `.html` / `.htm` UTF-8 (10 Mo par fichier, 20 fichiers et 100 Mo par sélection).
2. Vérifier titre, date, avertissements et conservation des doublons. Enregistrer. Un même hash peut être ignoré, conservé séparément ou ajouté comme version.
3. Ouvrir l’édition : elle occupe directement toute la page. Le HTML est affiché à 70 % ; après réduction, les boutons −/+ ajustent ce zoom sans perdre la navigation. À la première ouverture sans choix mémorisé, le lecteur commence en **mode sûr** et demande votre décision. Les scripts du document peuvent s’exécuter dans le cadre opaque après un choix interactif explicite ; ils peuvent tenter une navigation du cadre. Le réglage « Confiance des nouveaux fichiers HTML » permet un mode interactif habituel ou un mode sûr, révocables. **Désactiver JS** passe au mode sécurisé ; ce choix explicite reste mémorisé pour cette édition sur cet appareil. Les éditions V7 suivent le même choix explicite ; le mode sûr n’exécute aucun script. Google Mode IA demande toujours une confirmation avant toute ouverture externe.
4. Deux contrôles restent visibles sur le HTML : une petite flèche de retour et **Réduire la lecture**. Glisser vers la droite depuis le bord gauche revient à la bibliothèque. Toucher **Réduire la lecture** pour accéder au zoom, au réglage JS, à l’historique, au mode texte et aux annotations. Garder un favori, marquer une lecture, enregistrer notes et décisions. Tous ces états sont dans IndexedDB, séparément du HTML original.
5. Dans **Réglages**, exporter un ZIP et le conserver hors du navigateur. Restaurer un ZIP vérifie les fichiers SHA-256 avant toute écriture et fusionne sans effacement.
6. Pour retrouver la même bibliothèque sur PC et smartphone, ouvrir [sitegoat.vercel.app](https://sitegoat.vercel.app) et saisir le même code d’accès privé dans **Réglages** sur chaque appareil. La synchronisation Supabase est activée par défaut : les éditions, notes, favoris, lectures, archives et corbeille sont récupérés automatiquement. Les modifications partent après deux secondes de repos ; les nouveautés sont vérifiées toutes les 30 secondes, au retour du réseau et au retour dans l’application. **Synchroniser maintenant** permet de forcer une vérification. Une case permet de suspendre la synchronisation de cet appareil.

Le cloud utilise des **archives complètes privées et versionnées** pour la synchronisation automatique. Les snapshots restent immuables. Les notes concurrentes sont conservées séparément ; en synchronisation, le changement le plus récent détermine les favoris, lectures et états d’édition. Les changements d’archive et de corbeille passent aussi entre les appareils, sans supprimer les originaux ni les anciennes sauvegardes. La restauration manuelle d’une sauvegarde reste disponible et fusionne les favoris et lectures de façon conservative. La synchronisation nécessite que l’application soit ouverte et connectée ; la lecture locale fonctionne hors ligne.

Affichage mobile réglé à 70 % sur demande ; lecteur pleine page adapté au viewport et boutons principaux conservant une cible tactile d’environ 45 px.

## Ouvrir les fichiers avec la PWA

- File Handling : manifest `file_handlers` et consommation de `launchQueue` pour `.html` / `.htm` sur systèmes compatibles, après installation.
- Android : Web Share Target reçoit les HTML partagés, les place dans une file IndexedDB privée via le service worker, puis présente la vérification d’import.
- iPhone : ouvrir la PWA → **Importer** → choisir le fichier dans Fichiers / iCloud Drive. Safari iOS n’offre pas actuellement l’association File Handling ni la cible de partage de fichiers de cette PWA.
- Glisser-déposer et sélection multiple fonctionnent également sur ordinateur.

[Guide téléphone](docs/INSTALLATION_MOBILE.md). Les parcours système physiques « Ouvrir avec », partage Android et installation iPhone/Android restent **NON TESTÉS SUR APPAREIL RÉEL**. Le pipeline applicatif est testé en navigateurs automatisés, sans prétendre simuler un système mobile complet.

## Vie privée

Pas de tracker ni d’IA externe. Les originaux ne sont jamais servis comme pages actives de l’application. Les tokens sont exclus des archives. La clé Supabase publique peut figurer dans le client ; la clé secrète est réservée à la fonction serveur et ignorée par Git. L’hébergement de l’application ne sauvegarde pas les données locales. Une origine / un navigateur / une installation différente peut avoir sa propre bibliothèque.

[Architecture](ARCHITECTURE.md) · [Sécurité](SECURITY.md) · [Déploiement](README_DEPLOIEMENT.md) · [Tests réels](TEST_REPORT.md) · [Baseline](docs/BASELINE.md)

## Vérification reproductible

```sh
npx playwright install chromium webkit
npm run check
```

Tests cloud réels, avec variables serveur dans `.env.local` et le serveur de preview déjà lancé :

```sh
node scripts/test-cloud.mjs
node scripts/test-cloud-browser.mjs
node scripts/test-sync-browser.mjs
node scripts/test-performance.mjs
```

Ces tests créent uniquement des comptes et archives synthétiques, puis les suppriment. Le script cloud ne doit pas être lancé avec une clé client. `scripts/setup-cloud.mjs` reçoit la clé serveur sur stdin ; ne l’inscrire ni dans une commande publiée ni dans un fichier suivi par Git.

## Version 2.0.0 : journées V6

Les HTML V6 avec métadonnées canoniques sont proposés comme versions d’une journée 08h/16h/21h. Les originaux sont conservés, les cumuls incomplets et les branches concurrentes signalés. L’historique permet de lire chaque version ; les notes et favoris gardent leurs liens d’origine. Les éditions sans métadonnées V6 restent indépendantes sauf choix manuel.

Google accepte le protocole historique et un protocole v2 avec question seule : vérification/modification, copie et ouverture volontaire de l’entrée Mode IA. Le sandbox reste isolé et le mode interactif automatique conservé. Le zoom du HTML est à70% par défaut et peut atteindre200% ; les contrôles du shell gardent leur taille normale.

Les sauvegardes V6 utilisent le format ZIP2 : **mettre à jour tous les appareils avant de synchroniser ces éditions**. Les ZIP1 historiques restent lisibles. Aucun effacement automatique ni migration SQL Supabase n’est nécessaire ; la base locale passe au schéma4 de façon additive.

[Compatibilité](docs/JOURNAL360_V6_COMPATIBILITY_MATRIX.md) · [Tests locaux](docs/JOURNAL360_V6_TEST_REPORT.md) · [Sécurité](docs/JOURNAL360_V6_SECURITY_REVIEW.md) · [Migration et rollback](docs/JOURNAL360_V6_MIGRATION_AND_ROLLBACK.md) · [Publication](docs/JOURNAL360_V6_RELEASE.md)

### Correctif2.0.1 — HTML V6.1

Les liens de rubriques restent dans le journal au lieu de vider le cadre. Le format producteur `schemaVersion:"6.1"` est reconnu pour les nouveaux imports ; ses boutons d’approfondissement utilisent le dialogue parent pour copier une question et ouvrir Google Mode IA. Le lecteur reste interactif par défaut et isolé. Après mise à jour de la PWA, rouvrir le journal existant suffit pour bénéficier du correctif des boutons. [Validation sur le fichier réel, sans publier son contenu](docs/JOURNAL360_V61_COMPATIBILITY_FIX.md).

### Historique 2.0.2 — ancien lancement de question Mode IA

Dans la version historique 2.0.2, après prévisualisation/modification et confirmation, **Lancer la question** ouvre le lien Mode IA avec le texte exact dans `q` et `udm=50`, y compris pour les boutons V6.1 et les questions préparées en mode sûr. Copie et entrée sans texte restent disponibles en repli. Aucune ouverture automatique depuis un message, aucune permission supplémentaire dans le cadre. [Tests et limites Google](docs/JOURNAL360_GOOGLE_AI_PREFILL.md).

### Version 2.0.3 — une seule édition par jour

Chaque nouvel HTML daté met automatiquement à jour sa journée. La bibliothèque, l’accueil, la reprise et les résultats HTML de recherche utilisent la dernière édition du jour ; les anciennes quittent l’affichage courant et restent accessibles dans l’historique avec leurs notes et favoris. Quatre mises à jour quotidiennes ou davantage sont possibles, même sans métadonnées V6. Les imports déjà présents sont regroupés après mise à jour, sans réimport. Mettre à jour le PC et le smartphone. [Règles de classement, tests et retour arrière](docs/JOURNAL360_ONE_HTML_PER_DAY.md).

### Version 2.0.4 — nouveautés et synchronisation visible

La carte du jour affiche les ajouts et mises à jour par rapport à l’édition la plus récente déjà ouverte. Le détail reste consultable dans le lecteur pleine page, sans modifier le HTML original. Les fichiers sans identifiants d’événements fiables affichent une nouvelle édition sans inventer de comparaison. Ouvrir une édition ne la marque pas comme lue.

Le bandeau affiche le mode local, le hors-ligne, les transferts, les erreurs avec reprise et les modifications en attente, ainsi que la date du dernier succès. Il reste accessible en lecture pleine page. [Fonctionnement, tests et limites](docs/JOURNAL360_READING_SYNC_STATUS.md).

### Version 2.0.5 — lecture épurée

Le HTML occupe tout le viewport, avec seulement Retour et **Réduire la lecture**. Glissement depuis le bord gauche, historique navigateur et outils après réduction. [Vérifications et limites](docs/JOURNAL360_CLEAN_READER.md).

### Version 2.0.6 — ouverture Google contrôlée (publiée avec la 2.0.7)

Les liens **Recherche Google avec la question** affichent la confirmation de la PWA et ouvrent une recherche classique avec le texte exact. **Ouvrir Google Mode IA** ouvre seulement l’entrée Google : copier puis coller la question, sans promesse de préremplissage IA. Le dialogue conserve modification, copie et lien de repli. Session par cadre, protection contre le rejeu et blocage de marqueurs sensibles connus ; sandbox/CSP inchangés. Ce candidat remplace le parcours historique 2.0.2 uniquement après une publication autorisée. [Diagnostic, tests et décision HOLD](docs/JOURNAL360_GOOGLE_NAVIGATION.md).

### Version 2.0.7 — boutons Google des journaux V6.4 et doublons

Dans les journaux V6.4.3, chaque **Ouvrir Google Mode IA ↗** ouvre la confirmation de la PWA avec la question de l’article, du dossier ou de l’approfondissement : **Rechercher sur Google** (recherche classique avec la question exacte) ou **Ouvrir Google Mode IA** (entrée Google, question à coller). Dans les V6.4.1, « En savoir plus » passe directement par cette confirmation, où la copie fonctionne. Un doublon exact importé remplace désormais l’ancienne copie, même archivée ou à la corbeille, en conservant notes et favoris ; « Ignorer le doublon » reste disponible. Sandbox, CSP et permissions inchangés. [Diagnostic, tests et retour arrière](docs/JOURNAL360_GOOGLE_BUTTONS_V64.md).

### Le Futur · dossiers prospectifs

Le Futur accepte des dossiers prospectifs HTML autonomes (`futureData`) ou JSON `journal360.future` v1, dans une base locale séparée. Scénarios, frise, signaux, préparation, notes et versions sont accessibles sans modifier les journées. Les anciennes entrées AI-RADAR proposent une migration explicite. La sauvegarde ZIP dédiée doit être exportée séparément ; la synchronisation automatique Le Futur n’est pas configurée.

[Guide et exemples](docs/FUTURE_IMPORT_GUIDE.md) · [Architecture](docs/FUTURE_ARCHITECTURE.md) · [Tests et limites](docs/FUTURE_TEST_REPORT.md) · [Rollback](docs/FUTURE_ROLLBACK.md).

La refonte locale P0/P1 transforme Le Futur en atlas : résumé calculé, horizons au clavier, comparaison des scénarios et feuille de route personnelle. [Diff, captures, vérifications et limites](docs/FUTURE_ATLAS_REPORT.md).

Actualité rapide : aucun plafond de quantité de titres. Une édition de 100 nouveautés ou davantage est acceptée et conservée intégralement, dans les budgets de taille du HTML et du compagnon JSON. L’affichage charge 30 titres au départ ; « Tout afficher » permet de lire toute la liste et la recherche porte toujours sur tous les titres importés. Aucun titre n’est inventé pour remplir une liste.


## Sauvegardes locales après audit

Dans Paramètres, **Sauvegarder les journaux** exporte seulement journaux, originaux, versions, notes, favoris et lectures. Les ZIP 1/2/3 restent lisibles. L’assistant liste séparément **Le Futur** et **réglages/recherches** ; tokens, sessions, réglages cloud et permissions interactives sont exclus. Chaque espace est restauré séparément après aperçu et confirmation. Aucune atomicité entre bases n’est annoncée.

Pour une bibliothèque importante, **Préparer les segments et le budget** produit des ZIP historiques bornés et `journal360-inventory.json`. Télécharger chaque fichier dans le même dossier. Choisir ensuite **Inspecter une sauvegarde segmentée**, sélectionner l’inventaire et tous ses ZIP, vérifier les comptes puis confirmer la fusion. Un fragment manquant, dupliqué ou corrompu bloque toute écriture. Ne jamais supprimer d’originaux pour contourner une limite. Le snapshot et les archives compressées occupent de la mémoire ; l’essai 4001 éditions porte sur de petits fichiers synthétiques, pas des gigaoctets sur téléphone.

Les recherches récurrentes utilisent un verrou Web Locks, une relecture sous verrou et une comparaison par ID. Un conflit affiche une erreur et conserve la saisie. Le stockage ancien reste lisible, sans migration automatique ; fermer les clients anciens qui ne prennent pas le verrou. Si le verrou ou localStorage est indisponible, l’écriture est refusée explicitement.

Les exports d’articles **Markdown** et **lecture HTML assainie** sont des copies de consultation distinctes d’**Original intact**. Les modèles de contre-preuve et revue de source ajoutent du texte au brouillon des notes existantes ; aucun fetch, modèle IA ou nouvelle base n’est activé.

## Vérification du candidat local

`npm run check` conserve lint, build, unitaires et les trois projets Playwright. Les scénarios historiques d’interaction utilisent un profil synthétique ayant choisi le mode interactif ; les nouveaux scénarios SG-04 vérifient un profil réellement neuf, sans ce choix. Le test historique du HTML du 22 reste conditionné à son fichier exact ; aucun résultat physique iOS/Android ou cloud réel n’est déduit des simulations.

- Tests ciblés : `npx playwright test --config playwright.sitegoat.config.ts` (build préalable dans `.sitegoat-dist`).
- Mutations en copies jetables : `node scripts/sitegoat-mutations.mjs` et `node scripts/sitegoat-browser-mutations.mjs`.
- HTML réel facultatif local : définir `SITEGOAT_AUDIT_HTML` et `SITEGOAT_EXAMPLE_DIR`, puis `npx vitest run --config vitest.sitegoat-local.config.ts` et `npx playwright test --config playwright.sitegoat-real.config.ts`. Aucun original n’est incorporé au dépôt.

Le retour au code précédent se fait dans un autre worktree au commit initial, sans suppression de profil ni de données. Conserver les exports et tous les segments ; restaurer/tester d’abord sur profil vierge. [Compatibilité et rollback](audits/sitegoat/implementation-2026-10-24/02_PLAN_MIGRATIONS_SAUVEGARDES_ROLLBACK.md). Les anciennes copies `journal360-pwa`, `journal360-reader-release`, `journal360-v6-worktree` restent des références historiques ; elles n’ont pas été modifiées.
