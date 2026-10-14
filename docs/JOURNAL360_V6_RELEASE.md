# Publication Journal360 Mobile2.0.0

Le14 octobre2026, le propriétaire a explicitement autorisé « commit push sur github et vercel et supabase », après la livraison locale. Cette autorisation remplace la restriction de publication de la mission précédente. Les cinq rapports V6 conservent leurs résultats historiques de la phase locale ; cette fiche décrit la publication séparée.

## Périmètre préparé

- GitHub : dépôt existant adrno496/sitegoat, main ; pas de force-push, pas d’autre projet modifié.
- Vercel : projet existant sitegoat, alias https://sitegoat.vercel.app, même CSP et variables serveur. Rollback connu : déploiement dpl_FvmEA8cSMXNw9M3gWQ5dZTJCuUFv, commit b1fc804.
- Supabase : projet guevmgdxznrvxcjvvzyu, bucket journal360-backups vérifié privé et50 MiB. Aucune migration SQL ni modification RLS nécessaire. Le backend de synchronisation est une fonction Vercel qui réutilise ce bucket ; le schéma4 est une migration locale IndexedDB, pas PostgreSQL.
- Version2.0.0, sans nouvelle dépendance ni secret client. Les HTML utilisateurs restent privés, absents du dépôt et des assets.

Validation préalable : lint/build et128 unités repassés pour la release ;47 E2E et3 charges de la phase locale conservés. Appareils physiques et vrai fichier producteur restent NON TESTÉS.

## Vérification après publication

Exécuter `scripts/test-v6-production.mjs` uniquement avec l’URL explicitement autorisée et les variables serveur chargées en mémoire. Ce test crée son propre compte synthétique, vérifie import V6, sync Chromium→WebKit iPhone simulé, note/favori, export ZIP2, confirmation Google et offline. Il ne se connecte jamais au compte propriétaire ; il supprime uniquement le compte et les objets qu’il vient de créer. Aucune clé ni session dans les preuves.

Mettre à jour chaque PWA depuis l’avis de mise à jour, sans effacer IndexedDB, avant d’utiliser les nouveaux imports V6 ; l’ancien client ne lit pas ZIP2. Les limites de RAM annuelle, quotas globaux et navigation propre du cadre interactif restent celles des rapports V6. Le retour au bundle précédent ne reconvertit pas les données V6 ; garder un export et un lecteur2.0.0 disponible.

## Résultats exécutés après autorisation

- **PASS GitHub** : application commit `4f3d3e0a556682b8e6b8338ba853c44e02211a8f` poussé sur main sans force-push.
- **PASS Vercel** : déploiement `dpl_GGVSkrCgK1g7Agbv6bbCwcKhrpXa`, état READY, alias https://sitegoat.vercel.app en HTTP200. JS servi strictement identique au build local2.0.0, CSP inchangée, manifest et SW200, SW no-cache. [Preuve](evidence/v6/release-deployment.json).
- **PASS Supabase réel,26 contrôles** : upload signé, téléchargement identique, isolation des deux comptes synthétiques, IDOR/traversal refusés, SELECT/INSERT/UPDATE/DELETE croisés inefficaces, URL publique/anonyme/expirée refusée, nettoyage des seuls objets/comptes de test confirmé. [Preuve](evidence/v6/release-cloud-security.json).
- **PASS parcours production,9 contrôles** : V6 08/16/21 envoyé automatiquement par Chromium, récupéré automatiquement par WebKit iPhone simulé ; note/favori renvoyés au PC, trois originaux/empreintes conservés dans export ZIP2, confirmation Google v2, lecture hors ligne, nettoyage du compte/snapshots de test. [Preuve](evidence/v6/release-production-smoke.json).
- **PASS release locale** : lint, build,128 unités ; mêmes dépendances, secrets serveur absents des fichiers préparés et du bundle. Les47 E2E et3 charges locales restent détaillés dans le rapport initial.

Aucun journal utilisateur, compte propriétaire, secret, code d’accès ou session n’a été copié dans les preuves. Aucun compte propriétaire ni RLS ni variable serveur n’a été modifié. Les seuls comptes créés sont trois comptes synthétiques temporaires, supprimés à la fin des vérifications.

Les rapports initiaux marquaient le cloud réel NON TESTÉ pour la phase locale ; les contrôles ci-dessus constituent la validation ultérieure autorisée. Téléphones physiques, fichier producteur V6 réel, quotas globaux, coût et RAM annuelle mobile restent NON TESTÉS. Le grand inventaire cloud100+ a été validé par mocks, pas généré en production pour cette release.

La compatibilité structurelle du bucket Supabase existant a suffi : **aucune migration SQL, aucun changement RLS ni déploiement de fonction Supabase nécessaire**. La nouvelle pagination est déployée dans api/backup.mjs sur Vercel. Les changements v4 sont appliqués localement par Dexie à l’ouverture de la PWA.

Les sorties de test brutes peuvent contenir des espaces finaux et le patch des lignes de contexte : ils sont conservés pour fidélité des preuves ; le contrôle de whitespace du code exclut ces pièces. Le patch source historique et son hash couvrent la phase locale avant le changement de version stable ; pour rollback de production utiliser le déploiement/commit antérieur indiqué ci-dessus et le plan de migration. Aucun effacement de base.

Vérification automatisée GitHub de l’application publiée : [run38638428688](https://github.com/adrno496/sitegoat/actions/runs/38638428688). Les pushes déclenchent également la CI ; consulter le résultat associé au SHA courant dans GitHub Actions. Les commits de preuves ne modifient pas le bundle de l’application.

## Correctif de démarrage WebKit pendant la validation

La première CI Linux a exécuté128 unités et46/47 E2E avec succès. Un scénario WebKit a perdu le handshake v1 au passage sûr→interactif : le script du cadre envoyait son message unique avant l’installation passive du listener parent. Le listener est maintenant installé synchroniquement avec useLayoutEffect au commit React. La validation du WindowProxy, de l’origine opaque, des payloads, la confirmation et le sandbox restent identiques. Ce correctif est publié dans un commit séparé de la même release2.0.0 ; le nouveau bundle déclenche la mise à jour PWA.

Validation locale du correctif : lint/build PASS et répétition10/10 du scénario WebKit concerné (36,0s), sans retry caché ni augmentation du timeout. [Preuve](evidence/v6/release-webkit-startup.log), [échec initial et correction](evidence/v6/release-ci-initial.json). Le résultat du workflow associé au dernier SHA reste la référence CI finale.
