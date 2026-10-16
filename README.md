# Journal 360 Mobile

Une bibliothèque personnelle de journaux HTML, en français, installable comme PWA. Les éditions sont importées manuellement ; aucun contenu privé n’est livré dans le site. Les deux éditions proposées pour découvrir l’application sont **entièrement fictives**.

Version publiée : [sitegoat.vercel.app](https://sitegoat.vercel.app). [Rapport de tests](TEST_REPORT.md).

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

L’onglet **Articles** réunit automatiquement les articles structurés de toutes les veilles importées, archives comprises. Rechercher dans les titres, textes et sources, filtrer par rubrique, veille ou état de lecture, puis lire un article et passer au suivant. Les favoris et lectures utilisent la mémoire existante. Le journal d’origine reste accessible et son retour conserve les filtres. Les articles répétés dans les versions d’une même journée sont regroupés sur leur dernière occurrence ; ceux présents seulement dans une ancienne version restent accessibles. Les journaux sans sommaire structuré restent lisibles dans la Bibliothèque.

1. **Importer** un ou plusieurs `.html` / `.htm` UTF-8 (10 Mo par fichier, 20 fichiers et 100 Mo par sélection).
2. Vérifier titre, date, avertissements et conservation des doublons. Enregistrer. Un même hash peut être ignoré, conservé séparément ou ajouté comme version.
3. Ouvrir l’édition : elle occupe directement toute la page. Le HTML est affiché à 70 % ; après réduction, les boutons −/+ ajustent ce zoom sans perdre la navigation. Les onglets et simulateurs fonctionnent automatiquement : le lecteur démarre en **mode interactif**, dans son cadre isolé. **Désactiver JS** passe au mode sécurisé ; ce choix explicite reste mémorisé pour cette édition sur cet appareil. Google Mode IA demande toujours une confirmation avant toute ouverture externe.
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
