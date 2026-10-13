# Baseline — 13 octobre 2026

GO : nouveau produit isolé dans `/Users/dreano/Downloads/veille/journal360-pwa`, clone du dépôt demandé `adrno496/sitegoat`, branche main propre, commit initial `2345801`. Workspace initial vide hors `.plugcode`. Le Git découvert dans un parent ne sera pas utilisé. Node 24.21.0, npm 11.19.0. Aucun package ni test ni PWA préexistants. Site initial GOAT FUEL : pages HTML statiques et images. Remplacement explicitement demandé ; historique Git conservé et archive extérieure `../sitegoat-before-journal360.tar`.

Aucun fichier V3 dans le workspace ou le dépôt. Aucun test de V3 réelle ne pourra être annoncé. Fixtures synthétiques pour JSON embarqué, HTML générique, boutons JS et tentatives hostiles. Aucun dépôt SENTINEL/AXDIA inspecté ou modifié.

Architecture : React/TypeScript/Vite, Dexie, PWA, ZIP avec checksums. Sauvegardes cloud privées immuables via Supabase Auth et Storage ; fonction serveur validant le propriétaire avant signature, L’accès administrateur SQL n’était pas disponible dans la session Supabase CLI ; le dashboard connecté a ensuite permis d’appliquer et de vérifier la règle RLS restrictive, uniquement sur le nouveau bucket. Pas de table PostgreSQL applicative nécessaire pour les snapshots complets. Restauration par fusion conservative, et non synchronisation destructrice des enregistrements.

Points à vérifier : sandbox Chromium/WebKit, IndexedDB et offline, accès croisés Supabase, autorisation de déploiement distincte du push demandé. Installation physique iOS/Android non disponible.
