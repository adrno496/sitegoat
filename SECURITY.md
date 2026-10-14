# Sécurité et limites

## Menaces et protections

| Menace | Protection | Limite |
|---|---|---|
| Script HTML accédant au parent/session | Iframe origine opaque, sandbox sans same-origin | Scripts inline actifs par défaut sur demande ; JS peut monopoliser le CPU |
| Exfiltration réseau | CSP du cadre, ressources et liens externes retirés, connect-src none | Un script peut naviguer son propre cadre ; absence d’exfiltration totale non garantie en interactif |
| XSS du shell | React rend les données comme texte ; aucun dangerouslySetInnerHTML | CSP du parent autorise inline pour permettre les scripts du srcdoc : cette défense seule ne suffit pas |
| Accès au cloud d’autrui | JWT vérifié côté serveur, UID forcé, UUID validé, RLS restrictive et bucket privé | Clé serveur très privilégiée : uniquement dans environnement serveur |
| Fichier / ZIP hostile | UTF-8, taille bornée, schémas, comptes, chemins whitelist, tailles décompressées, SHA-256 | Un navigateur dispose de ressources limitées ; ZIP jusqu’à 150 Mo peut être lourd sur téléphone |
| Perte du navigateur | Export ZIP, restauration atomique, snapshot privé | IndexedDB et stockage persistant ne garantissent pas une conservation éternelle |
| Notes concurrentes | Conserver les deux textes | Fusion volontairement conservative : favoris/lecture peuvent être réactivés par un ancien snapshot |
| Changement de compte | Jobs indexés par propriétaire ; aucun job d’un autre UID exécuté | Bibliothèque locale conservée, appareil supposé personnel ; déconnexion ne la purge pas |

## Cloud réellement configuré

Bucket `journal360-backups` privé, limite 50 Mo. Règle RLS restrictive ALL pour anon/authenticated exécutée et vérifiée dans le dashboard, isolée au bucket. Le serveur utilise la clé secret pour signer les transferts après vérification Auth. Une URL signée donne un accès temporaire à son détenteur ; elle n’est jamais copiée dans une édition ou un export. Les tokens d’upload ne sont pas conservés dans IndexedDB. Aucune clé secrète dans VITE_*, Git, archives ni preuves de tests.

La clé publique n’est pas une clé administrateur. Elle configure le client Auth/Storage ; l’accès reste soumis aux sessions, au serveur et à la RLS. L’interface ne propose pas d’inscription ouverte. L’accès privé utilise un code vérifié par le serveur ; aucun SMTP nécessaire. `api/access.mjs` utilise un mot de passe HMAC dérivé du code et du secret serveur pour obtenir les jetons du compte fixe. Aucun mot de passe dérivé ni secret serveur n’est transmis au client. Le code choisi est court : sa confidentialité reste nécessaire ; toute personne qui le connaît peut ouvrir cet espace de sauvegarde. La session authentifiée reste sur l’appareil personnel et n’est jamais exportée.

`Cache-Control: no-store` sur l’API, pas de CORS permissif, jeton bearer obligatoire, demande JSON <=1 Ko, méthodes limitées, rate limit 60/min par UID et instance. La connexion par code borne le JSON à 256 octets, refuse les origines étrangères et limite à 5 essais/minute/IP/instance, en plus des limites Auth Supabase. Le rate limit mémoire n’est pas une protection distribuée complète et ne remplace pas un code long ni un pare-feu distribué. Un client légitime peut créer plusieurs snapshots : pas de quota global par utilisateur ni rétention automatique implémentés.

## CSP

Le parent autorise les scripts de son origine et inline pour le lecteur interactif ; connect-src est limité au site et au projet Supabase. L’iframe ajoute sa propre CSP : default-src none, connect-src none, formes/objets/frames/base bloqués, images et médias data/blob uniquement, styles inline, scripts inline uniquement après confiance. Les permissions camera/micro/geolocation sont désactivées. Les ressources distantes légitimes sont donc bloquées, sans téléchargement automatique. Les fonctions HTML utilisant localStorage ne sont pas rétablies en supprimant l’isolation.

## Preuves

`npm run test:e2e` vérifie les tentatives synthétiques de parent DOM, localStorage, fetch, image distante, formulaire, lien, popup et navigation top dans Chromium et WebKit. `scripts/test-cloud.mjs` vérifie auth réelle, accès croisés SELECT/INSERT/UPDATE/DELETE, bucket privé, IDOR, traversée et expiration d’URL. `scripts/test-cloud-browser.mjs` vérifie le cycle complet via l’interface avec deux sessions du compte A et un compte B.

Les tests ne prouvent pas la sécurité de tout JavaScript possible. Pas d’audit indépendant, de test physique téléphone, ni de garantie d’absence de faille inconnue. En cas de doute, utiliser le mode sécurisé ou le texte indexé.

Les formulaires sont remplacés dans la copie de lecture par des conteneurs conservant les IDs et contrôles ; les actions de soumission sont retirées. Sandbox sans allow-forms et form-action none restent actifs. La navigation par fragments reste dans le cadre opaque, sans pont avec l’application. À la demande explicite de l’utilisateur, toute nouvelle édition s’ouvre automatiquement en mode interactif. Le choix Désactiver JS est mémorisé localement pour cet ID d’édition et conservé aux prochaines ouvertures. Réactiver manuellement le mode interactif après ce choix conserve la confirmation de confiance. Le sandbox reste limité à allow-scripts en interactif, sans autre permission.

## Pont Google Mode IA (local, non publié)

Le parent n’accepte que les messages version 1 de `iframeRef.current.contentWindow`, en mode interactif, sous origine opaque `null`. Une autre fenêtre opaque n’est pas acceptée. Le handshake renvoie uniquement `{type:"journal360:google-ai:capability",version:1,enabled:true}` au WindowProxy vérifié. Le destinataire opaque impose `"*"` ; aucun jeton, note, état ou contenu de bibliothèque n’est joint. Voir [MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) et [sandbox iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).

Les destinations admises sont des URL littérales HTTPS de `www.google.com/search`, sans normalisation réparatrice, identifiants, port explicite ou fragment. Seuls `hl=fr` (facultatif), `udm=50` et une seule question `q` sont admis ; tout autre paramètre, notamment une redirection, est refusé. Limites : 4096 caractères pour l’URL et 2000 caractères pour la question décodée. Les contrôles et caractères de réordonnancement bidirectionnel sont refusés. La question est du texte React, jamais du HTML ou une commande.

Dans la copie interactive, seuls les liens `a[data-ai-link="google-ai-mode"]` dont le href est validé reçoivent un href local et une destination inerte. Un adaptateur placé avant les scripts importés intercepte leur clic et empêche le fallback d’ouvrir ou de naviguer. L’original et `editionData` restent intacts. Le mode sécurisé n’exécute aucun adaptateur et ne permet pas ces liens externes.

Un message valide affiche seulement une confirmation ; il ne provoque aucun appel externe. Une question déjà affichée ne peut pas être remplacée par un message suivant. Seul le clic sur **Ouvrir** appelle `window.open(url, "_blank", "noopener,noreferrer")` dans le parent. La destination et le cadre courant sont revérifiés au clic ; changement d’édition, mode ou recréation du cadre invalident la demande. Annuler ou Échap ferme la demande. Aucun attribut de sandbox ni aucune directive CSP n’est élargi. Voir [MDN window.open](https://developer.mozilla.org/en-US/docs/Web/API/Window/open).

Un HTML interactif reste du code non fiable : il peut demander un dialogue sans clic dans le cadre, mais ne peut pas confirmer ce dialogue dans le parent isolé. La PWA ne peut pas établir automatiquement qu’une question contenue dans le fichier est publique : l’utilisateur voit le texte avant de l’envoyer. La limite existante concernant la navigation de son propre cadre par un script n’est pas supprimée par ce pont. Les navigateurs peuvent décider comment ouvrir un nouvel onglet depuis une PWA ; aucune ouverture dans Safari physique n’est déclarée vérifiée.
