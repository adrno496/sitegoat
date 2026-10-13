# Rapport de tests — Journal 360 Mobile

Date : 13 octobre 2026, Europe/Paris. Environnement réel : macOS sur Mac ARM64, Node 24.21.0 / npm 11.19.0. Chromium Playwright 156 et WebKit 27.2. **Pas d’iPhone ou Android physique utilisé. Le HTML réel fourni (104 507 octets) a été vérifié localement sans publication de son contenu.**

## Commandes et preuves

| Contrôle | Commande / preuve | Statut |
|---|---|---|
| TypeScript strict, lint, build | `npm run check` : lint, build, 20 unités, 18 E2E | PASS |
| Unités / intégration IndexedDB | `npm test`, 20 cas exécutés | PASS |
| E2E Chrome / WebKit | `npm run test:e2e`, 18 cas ; [preuve expurgée](docs/evidence/e2e.json) | PASS |
| Responsive + axe | `npm run test:e2e -- --grep responsive`, 2 tests, chacun 6 largeurs + thème sombre, zéro violation | PASS |
| Dépendances | `npm audit`, 0 vulnérabilité après installation ; `npm audit --omit=dev`, 0 | PASS |
| Git / secrets | `git diff --check`, `node scripts/check-secrets.mjs` | PASS |
| Cloud privé / RLS | `node scripts/test-cloud.mjs`, [26 résultats réels](docs/evidence/cloud.json) | PASS |
| Sauvegarde cloud dans l’UI | `node scripts/test-cloud-browser.mjs`, [11 résultats](docs/evidence/cloud-browser.json) | PASS |
| Cloud HTTPS publié | 26 contrôles API/RLS + 11 contrôles interface, preuves `cloud-production.json` et `cloud-browser-production.json` | PASS |
| Code sur HTTPS | 6 contrôles, [preuve production](docs/evidence/access-production.json) | PASS |
| SQL RLS | Dashboard Supabase connecté, résultat `false / RESTRICTIVE / ALL` | PASS |
| Performance synthétique | `node scripts/test-performance.mjs`, [mesures brutes](docs/evidence/performance.json) | PASS |

Le code et les données de test sont dans `tests/`, les preuves expurgées dans `docs/evidence/`. Les captures `docs/screenshots/home-{320,375,390,768,1024,1440}.png` sont des simulations navigateur. Les traces Playwright restent localement dans `test-results/`, ignoré par Git ; aucun token/session cloud n’y est enregistré par les tests E2E locaux.

## Parcours fonctionnels exécutés

- Accueil vide ; import HTML générique sans JSON/date ; prévisualisation ; stockage ; lecture dans une iframe isolée.
- Téléchargement original comparé **octet par octet** au fichier de test.
- Favori, lecture et note conservés après rechargement ; recherche insensible à la casse / accents ; archives et corbeille récupérable.
- Export ZIP → nouveau contexte de navigateur et base vide → restauration des originaux et annotations. SHA-256 invalide rejeté avant écriture.
- Doublon renommé reconnu par hash ; nouvelle version conservant l’ancienne ; deux mêmes dates triées de façon déterministe.
- Mode sûr : bouton JS inactif. Après confiance explicite : bouton JS fonctionnel, `sandbox="allow-scripts"` sans `allow-same-origin`.
- Mémoire : deux articles avec le même event_id explicite, affichage des textes réels et comparaison technique.
- Chargement du shell et d’un original sans réseau après activation du service worker.
- Nouvelle version réelle du service worker détectée, bouton Mettre à jour, puis original et favori inchangés dans Chromium et WebKit.
- File cloud : appels simultanés regroupés ; échecs conservés, reprise espacée de 2 puis 4 secondes, arrêt à trois tentatives sans faux statut de réussite ; relance manuelle disponible.
- Manifest avec File Handling et Share Target ; consommateur launchQueue **simulé** ; POST multipart réellement intercepté par le service worker et enregistré en pending. Le lancement depuis le système d’exploitation n’est pas simulé comme un PASS physique.
- Migration de schéma v1 → v3, favoris et octets conservés. Refus quota simulé : rollback transactionnel vérifié. Les autres erreurs IndexedDB et import affichent un message et conservent les fichiers déjà enregistrés.

## Sécurité et cloud réellement exécutés

Fichier hostile synthétique : parent DOM, localStorage, fetch, image distante, formulaire, lien externe, popup et top-navigation. Aucun changement du parent ni accès au stockage principal ; aucun appel example.com observé pour ces tentatives, dans les deux moteurs. Cela ne prouve pas que tout script imaginable est sans danger ; la navigation propre du cadre reste une limite explicite du mode interactif.

Supabase réel, comptes A/B synthétiques et sans email envoyé :

- Auth par mot de passe de test, JWT réel vérifié par le serveur, anonyme/token invalide refusés.
- Bucket privé, upload signé sous UID forcé, téléchargements ZIP identiques, listing séparé par compte.
- UUID connu d’A inaccessible à B ; traversée refusée ; opérations directes Storage SELECT/INSERT/UPDATE/DELETE croisées refusées ou sans effet.
- URL publique / anonyme refusée ; URL signée de test expirée refusée.
- Dans l’interface : sauvegarde avec original/note/favori/lecture ; deuxième connexion du même compte dans une base vide ; récupération et lecture du HTML ; notes des deux appareils conservées.
- File de sauvegarde offline, reprise au retour réseau et déconnexion conservant la bibliothèque locale.
- Comptes et fichiers synthétiques nettoyés après les tests. Compte propriétaire configuré séparément, sans message envoyé.

Connexion par code dans l’interface : refus du mauvais code, session persistante, sauvegarde réelle et récupération depuis un second navigateur vierge, déconnexion conservant le local. [Preuve](docs/evidence/access.json).

## Mesures réelles, sans extrapolation au téléphone

100 HTML synthétiques d’environ 114 Ko chacun, 11 413 880 octets d’originaux au total. Mesure locale Chromium : première ouverture 306 ms ; import/rendu des 10 premiers 563 ms ; lots suivants de 20 : 902 / 1427 / 1357 / 1450 ms ; 10 derniers : 1270 ms ; recherche parmi 100 éditions : 173 ms. Ce sont des observations uniques sur ce Mac, sans garantie sur téléphone. `navigator.storage.estimate()` après test : 1 250 176 octets, estimation du navigateur qui peut tenir compte de la compression ; ne pas confondre avec la somme des originaux.

Build vérifié : JS principal ~795 Ko (233 Ko gzip), CSS ~31 Ko (7,1 Ko gzip), service worker ~114 Ko avant injection. Le build signale un gros chunk et un avertissement de compatibilité d’option Workbox/Vite, sans échec. Pas de mesure de mémoire précise, batterie, réseau 3G ni CPU iPhone.

## Limites et NON TESTÉS

- **Installation iPhone / Android, partage Android depuis Fichiers, ouverture native OS : NON TESTÉS SUR APPAREIL RÉEL.** WebKit automatisé n’équivaut pas à Safari iOS installé.
- HTML réel : PASS sur Chromium et WebKit à 390 × 844, six onglets, article complet, simulateur, confiance conservée et original intact ; zéro erreur JS. [Preuve sans contenu](docs/evidence/real-html.json). Pas de garantie de compatibilité des scripts localStorage ou ressources externes ; ceux-ci sont annoncés comme incompatibles / bloqués.
- Connexion email remplacée par un code privé : aucun SMTP nécessaire. Configuration du compte propriétaire et connexion réelle par code vérifiées. Tests serveur : origine étrangère, corps excessif, mauvais code, limitation des essais et absence de secret serveur dans la réponse.
- Interruption physique par extinction pendant import / transfert, vrai quota saturé, storage privé Safari, lecteur d’écran physique et zoom système 200 % : NON TESTÉS. Quota refusé couvert par simulation transactionnelle.
- Pas de synchronisation destructive en continu, d’automatisation des futures veilles, de ZIP d’import libre, de suppression définitive, de comparaison sémantique IA ni de snapshot HTML sous URL publique.
- Hébergement HTTPS publié et vérifié : https://sitegoat.vercel.app, Vercel READY, deux fonctions serveur présentes ; [preuve de publication](docs/evidence/deployment.json). Un premier essai réalisé pendant la construction a encore rencontré l’ancienne version ; tous les tests ci-dessus ont été relancés et réussis après la bascule.

## Régression et rollback

L’ancien site est volontairement remplacé sur demande. Son historique Git et une archive extérieure au dépôt sont conservés. Aucun original utilisateur importé modifié. Aucun dépôt SENTINEL / AXDIA ni service associé modifié. La RLS ajoutée est limitée au bucket de cette application dans le Supabase demandé.
