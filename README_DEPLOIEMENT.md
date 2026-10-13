# Hébergement HTTPS et sauvegarde Supabase

## Vercel

Le dépôt demandé `adrno496/sitegoat` remplace l’ancien site GOAT FUEL. Le projet Vercel existant `sitegoat` a été trouvé ; son alias existant est `https://sitegoat.vercel.app`. La version 1.0.2 est publiée et vérifiée en HTTPS ; preuves dans `docs/evidence/deployment.json`, `access-production.json`, `cloud-production.json` et `cloud-browser-production.json`.

`vercel.json` définit Vite, `npm run build`, `dist`, les headers et les routes SPA. L’API `api/backup.mjs` est une fonction Node Vercel, séparée du bundle client. Les HTML importés ne vont ni dans `public` ni dans `dist`.

Variables **serveur** configurées dans Vercel Production (Preview reste facultatif et n’est pas activé) :

- `SUPABASE_URL` : URL du projet choisi.
- `SUPABASE_SECRET_KEY` : clé secrète de ce projet, uniquement côté serveur.
- `JOURNAL360_ACCOUNT_EMAIL` : compte propriétaire préalablement créé, jamais demandé dans l’interface.

Variables **client facultatives** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Le projet demandé est déjà configuré par défaut avec sa clé publique. Pour changer de projet, adapter aussi la directive CSP connect-src dans `vercel.json`.

Ne jamais ajouter `VITE_SUPABASE_SECRET_KEY`, mettre un secret dans Git, ni publier `.env.local`. Ce fichier local est ignoré et ses droits sont 0600. L’export ZIP ne contient ni configuration serveur ni session.

## Supabase

Le bucket privé et la protection RLS sont configurés dans le projet demandé. Migration reproductible : `supabase/migrations/202610130001_private_backups.sql`. Aucun changement des autres tables ou buckets. Les transferts signés passent par le serveur : pas de policy client permissive.

Connexion par code via `api/access.mjs`, sans email envoyé ni SMTP. Le serveur dérive un mot de passe long par HMAC avec le secret serveur, puis obtient une vraie session Supabase du compte propriétaire. Le même code sur chaque appareil retrouve le même UID et les mêmes archives. Le code n’est pas dans Git, le bundle ou les sauvegardes. Les sessions sont renouvelées par Supabase, et la déconnexion conserve la bibliothèque locale.

Pour changer le code : configurer `.env.local`, puis fournir le nouveau code sur l’entrée standard de `node scripts/configure-access.mjs` (ne pas le passer en argument ni l’inscrire dans un fichier suivi). Une rotation de `SUPABASE_SECRET_KEY` nécessite de reconfigurer le mot de passe dérivé avec ce script. Le callback HTTPS autorisé précédemment est conservé ; il n’est plus nécessaire pour cette connexion. Les paramètres Auth globaux et les autres comptes ne sont pas modifiés.

## Vérification après publication

1. Vérifier HTTP 200, certificat HTTPS, manifest, icônes et service worker.
2. API sans session : 401, jamais de fichier privé.
3. Importer un HTML synthétique ; enregistrer une note ; recharger hors ligne.
4. Se connecter, sauvegarder, ouvrir une nouvelle session et restaurer.
5. Installer la PWA sur le téléphone et tester les API système réellement disponibles.

## Mise à jour et rollback

Le service worker annonce la mise à jour ; bouton Mettre à jour. IndexedDB est conservée. Schéma v1 → v3 testé ; pas de migration destructive. Exporter avant toute évolution future du schéma. Pour revenir à la version précédente du produit, redeployer son commit Git. Ne jamais effacer IndexedDB / CacheStorage sans sauvegarde pour tenter de réparer l’application.

L’ancien site reste dans le commit `2345801` et dans l’archive locale extérieure au dépôt `../sitegoat-before-journal360.tar`. Un revert du remplacement est possible ; aucun force-push n’est nécessaire.

Aucun domaine personnalisé, abonnement, plan Supabase ou DNS n’a été modifié. Limite actuelle du bucket : 50 Mo par sauvegarde ; coût et quotas globaux du compte non audités, aucun coût chiffré supposé.
