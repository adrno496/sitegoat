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

État final et preuves de publication ajoutés après vérification réelle.
