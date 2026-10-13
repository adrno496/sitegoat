# Sécurité et limites

## Menaces et protections

| Menace | Protection | Limite |
|---|---|---|
| Script HTML accédant au parent/session | Iframe origine opaque, sandbox sans same-origin | Interactif réservé aux fichiers de confiance ; JS peut monopoliser le CPU |
| Exfiltration réseau | CSP du cadre, ressources et liens externes retirés, connect-src none | Un script peut naviguer son propre cadre ; absence d’exfiltration totale non garantie en interactif |
| XSS du shell | React rend les données comme texte ; aucun dangerouslySetInnerHTML | CSP du parent autorise inline pour permettre les scripts du srcdoc : cette défense seule ne suffit pas |
| Accès au cloud d’autrui | JWT vérifié côté serveur, UID forcé, UUID validé, RLS restrictive et bucket privé | Clé serveur très privilégiée : uniquement dans environnement serveur |
| Fichier / ZIP hostile | UTF-8, taille bornée, schémas, comptes, chemins whitelist, tailles décompressées, SHA-256 | Un navigateur dispose de ressources limitées ; ZIP jusqu’à 150 Mo peut être lourd sur téléphone |
| Perte du navigateur | Export ZIP, restauration atomique, snapshot privé | IndexedDB et stockage persistant ne garantissent pas une conservation éternelle |
| Notes concurrentes | Conserver les deux textes | Fusion volontairement conservative : favoris/lecture peuvent être réactivés par un ancien snapshot |
| Changement de compte | Jobs indexés par propriétaire ; aucun job d’un autre UID exécuté | Bibliothèque locale conservée, appareil supposé personnel ; déconnexion ne la purge pas |

## Cloud réellement configuré

Bucket `journal360-backups` privé, limite 50 Mo. Règle RLS restrictive ALL pour anon/authenticated exécutée et vérifiée dans le dashboard, isolée au bucket. Le serveur utilise la clé secret pour signer les transferts après vérification Auth. Une URL signée donne un accès temporaire à son détenteur ; elle n’est jamais copiée dans une édition ou un export. Les tokens d’upload ne sont pas conservés dans IndexedDB. Aucune clé secrète dans VITE_*, Git, archives ni preuves de tests.

La clé publique n’est pas une clé administrateur. Elle configure le client Auth/Storage ; l’accès reste soumis aux sessions, au serveur et à la RLS. L’interface ne propose pas d’inscription ouverte. L’accès email réel nécessite l’autorisation de l’URL de callback dans la configuration Auth.

`Cache-Control: no-store` sur l’API, pas de CORS permissif, jeton bearer obligatoire, demande JSON <=1 Ko, méthodes limitées, rate limit 60/min par UID et instance. Le rate limit mémoire n’est pas une protection distribuée complète. Un client légitime peut créer plusieurs snapshots : pas de quota global par utilisateur ni rétention automatique implémentés.

## CSP

Le parent autorise les scripts de son origine et inline pour le lecteur interactif ; connect-src est limité au site et au projet Supabase. L’iframe ajoute sa propre CSP : default-src none, connect-src none, formes/objets/frames/base bloqués, images et médias data/blob uniquement, styles inline, scripts inline uniquement après confiance. Les permissions camera/micro/geolocation sont désactivées. Les ressources distantes légitimes sont donc bloquées, sans téléchargement automatique. Les fonctions HTML utilisant localStorage ne sont pas rétablies en supprimant l’isolation.

## Preuves

`npm run test:e2e` vérifie les tentatives synthétiques de parent DOM, localStorage, fetch, image distante, formulaire, lien, popup et navigation top dans Chromium et WebKit. `scripts/test-cloud.mjs` vérifie auth réelle, accès croisés SELECT/INSERT/UPDATE/DELETE, bucket privé, IDOR, traversée et expiration d’URL. `scripts/test-cloud-browser.mjs` vérifie le cycle complet via l’interface avec deux sessions du compte A et un compte B.

Les tests ne prouvent pas la sécurité de tout JavaScript possible. Pas d’audit indépendant, de test physique téléphone, ni de garantie d’absence de faille inconnue. En cas de doute, utiliser le mode sécurisé ou le texte indexé.
