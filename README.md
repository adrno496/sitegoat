# Journal 360 Mobile

Une bibliothèque personnelle de journaux HTML, en français, installable comme PWA. Les éditions sont importées manuellement ; aucun contenu privé n’est livré dans le site. Les deux éditions proposées pour découvrir l’application sont **entièrement fictives**.

Version publiée : [sitegoat.vercel.app](https://sitegoat.vercel.app). [Rapport de tests](TEST_REPORT.md).

## Démarrer

Node 24 recommandé.

```sh
npm ci
npm run dev
```

Pour tester le service worker et la sauvegarde cloud avec la fonction serveur :

```sh
npm run build
npm run preview
```

Ouvrir `http://127.0.0.1:4173`. `npm run dev` sert l’interface ; il ne lance pas l’API cloud. Une adresse HTTPS de production est nécessaire à l’installation sur téléphone.

## Utilisation

1. **Importer** un ou plusieurs `.html` / `.htm` UTF-8 (10 Mo par fichier, 20 fichiers et 100 Mo par sélection).
2. Vérifier titre, date, avertissements et conservation des doublons. Enregistrer. Un même hash peut être ignoré, conservé séparément ou ajouté comme version.
3. Ouvrir l’édition : elle occupe directement toute la page. Le HTML est affiché à 70 % ; les boutons −/+ ajustent ce zoom sans perdre la navigation. Les onglets et simulateurs fonctionnent automatiquement : le lecteur démarre en **mode interactif**, dans son cadre isolé. **Désactiver JS** passe au mode sécurisé ; ce choix explicite reste mémorisé pour cette édition sur cet appareil. Google Mode IA demande toujours une confirmation avant toute ouverture externe.
4. Toucher **Réduire la lecture** pour accéder au mode texte et aux annotations. Garder un favori, marquer une lecture, enregistrer notes et décisions. Tous ces états sont dans IndexedDB, séparément du HTML original.
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
