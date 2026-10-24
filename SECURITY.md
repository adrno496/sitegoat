# Sécurité et limites

## Menaces et protections

| Menace                                 | Protection                                                                                | Limite                                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Script HTML accédant au parent/session | Iframe origine opaque, sandbox sans same-origin                                           | Scripts inline actifs par défaut sur demande ; JS peut monopoliser le CPU                              |
| Exfiltration réseau                    | CSP du cadre, ressources et liens externes retirés, connect-src none                      | Un script peut naviguer son propre cadre ; absence d’exfiltration totale non garantie en interactif    |
| XSS du shell                           | React rend les données comme texte ; aucun dangerouslySetInnerHTML                        | CSP du parent autorise inline pour permettre les scripts du srcdoc : cette défense seule ne suffit pas |
| Accès au cloud d’autrui                | JWT vérifié côté serveur, UID forcé, UUID validé, RLS restrictive et bucket privé         | Clé serveur très privilégiée : uniquement dans environnement serveur                                   |
| Fichier / ZIP hostile                  | UTF-8, taille bornée, schémas, comptes, chemins whitelist, tailles décompressées, SHA-256 | Un navigateur dispose de ressources limitées ; ZIP jusqu’à 150 Mo peut être lourd sur téléphone        |
| Perte du navigateur                    | Export ZIP, restauration atomique, snapshot privé                                         | IndexedDB et stockage persistant ne garantissent pas une conservation éternelle                        |
| Notes concurrentes                     | Conserver les deux textes                                                                 | Fusion volontairement conservative : favoris/lecture peuvent être réactivés par un ancien snapshot     |
| Changement de compte                   | Jobs indexés par propriétaire ; aucun job d’un autre UID exécuté                          | Bibliothèque locale conservée, appareil supposé personnel ; déconnexion ne la purge pas                |

## Déclaration historique du cloud — non réinspectée le 24 octobre 2026

Bucket `journal360-backups` privé, limite 50 Mo. Règle RLS restrictive ALL pour anon/authenticated exécutée et vérifiée dans le dashboard, isolée au bucket. Le serveur utilise la clé secret pour signer les transferts après vérification Auth. Une URL signée donne un accès temporaire à son détenteur ; elle n’est jamais copiée dans une édition ou un export. Les tokens d’upload ne sont pas conservés dans IndexedDB. Aucune clé secrète dans VITE_*, Git, archives ni preuves de tests.

La clé publique n’est pas une clé administrateur. Elle configure le client Auth/Storage ; l’accès reste soumis aux sessions, au serveur et à la RLS. L’interface ne propose pas d’inscription ouverte. L’accès privé utilise un code vérifié par le serveur ; aucun SMTP nécessaire. `api/access.mjs` utilise un mot de passe HMAC dérivé du code et du secret serveur pour obtenir les jetons du compte fixe. Aucun mot de passe dérivé ni secret serveur n’est transmis au client. Le code choisi est court : sa confidentialité reste nécessaire ; toute personne qui le connaît peut ouvrir cet espace de sauvegarde. La session authentifiée reste sur l’appareil personnel et n’est jamais exportée.

`Cache-Control: no-store` sur l’API, pas de CORS permissif, jeton bearer obligatoire, demande JSON <=1 Ko, méthodes limitées, rate limit 60/min par UID et instance. La connexion par code borne le JSON à 256 octets, refuse les origines étrangères et limite à 5 essais/minute/IP/instance, en plus des limites Auth Supabase. Le rate limit mémoire n’est pas une protection distribuée complète et ne remplace pas un code long ni un pare-feu distribué. Un client légitime peut créer plusieurs snapshots : pas de quota global par utilisateur ni rétention automatique implémentés.

## CSP

Le parent autorise les scripts de son origine et inline pour le lecteur interactif ; connect-src est limité au site et au projet Supabase. L’iframe ajoute sa propre CSP : default-src none, connect-src none, formes/objets/frames/base bloqués, images et médias data/blob uniquement, styles inline, scripts inline uniquement après confiance. Les permissions camera/micro/geolocation sont désactivées. Les ressources distantes légitimes sont donc bloquées, sans téléchargement automatique. Les fonctions HTML utilisant localStorage ne sont pas rétablies en supprimant l’isolation.

## Preuves

`npm run test:e2e` vérifie les tentatives synthétiques de parent DOM, localStorage, fetch, image distante, formulaire, lien, popup et navigation top dans Chromium et WebKit. `scripts/test-cloud.mjs` vérifie auth réelle, accès croisés SELECT/INSERT/UPDATE/DELETE, bucket privé, IDOR, traversée et expiration d’URL. `scripts/test-cloud-browser.mjs` vérifie le cycle complet via l’interface avec deux sessions du compte A et un compte B.

Les tests ne prouvent pas la sécurité de tout JavaScript possible. Pas d’audit indépendant, de test physique téléphone, ni de garantie d’absence de faille inconnue. En cas de doute, utiliser le mode sécurisé ou le texte indexé.

Les formulaires sont remplacés dans la copie de lecture par des conteneurs conservant les IDs et contrôles ; les actions de soumission sont retirées. Sandbox sans allow-forms et form-action none restent actifs. La navigation par fragments reste dans le cadre opaque, sans pont avec l’application. Dans le candidat local du 24 octobre, un fichier sans choix mémorisé commence en mode sûr et demande une décision. Un réglage explicite peut rétablir le mode interactif habituel ; les choix par édition restent prioritaires. Le choix Désactiver JS est mémorisé localement pour cet ID d’édition et conservé aux prochaines ouvertures. Réactiver manuellement le mode interactif après ce choix conserve la confirmation de confiance. Le sandbox reste limité à allow-scripts en interactif, sans autre permission.

## Pont Google — 2.0.6

Les requêtes d’action passent par une session v3 liée au `WindowProxy` exact du cadre de lecture actuel et à son origine opaque `null`. La seule valeur `null` n’authentifie pas un expéditeur. Les réponses de capacité v1/v2 sont conservées pour compatibilité d’affichage ; une action v1/v2 sans session n’accorde aucune capacité. L’adaptateur de la copie de lecture traduit les clics marqués, les boutons V6.1 reconnus et les liens Google strictement admis en requêtes v3. Aucun second canal de navigation n’est ajouté.

Un nonce public imprévisible est communiqué uniquement au cadre vérifié. Il expire après cinq minutes ; un identifiant de requête à usage unique empêche le rejeu, avec une mémoire bornée à 256 entrées. La session change à la recréation/réinitialisation du cadre. Le parent refuse les schémas ouverts, tailles excessives, nonce invalide/expiré et identifiants réutilisés. Le nonce n’est ni un secret applicatif ni une preuve de confiance du document importé : seule une confirmation humaine dans le parent autorise une ouverture.

`postMessage(..., "*")` est nécessaire vers le destinataire à origine opaque, après vérification du cadre exact. Seuls capacité, nonce public et expiration sont renvoyés. Aucun token d’authentification, note, état de bibliothèque ou article n’est transmis. L’adaptateur enfant adresse le parent par son origine exacte et vérifie `event.source === parent` et l’origine de la réponse. [MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

La liste des destinations entrantes est fermée : HTTPS, hôte exact `www.google.com`, `/search` avec `q` unique borné et `hl=fr` facultatif, ou `/ai` sans question (éventuellement `hl=fr`). Le paramètre historique `udm=50` reste lisible en entrée, pour récupérer la question des anciennes éditions. Toute autre clé, redirection, userinfo, port explicite, réparation d’URL, fragment, protocole ou domaine voisin est refusé. URL : 4096 caractères ; question décodée : 2000. Les contrôles et caractères bidi sont refusés.

Le parent construit exclusivement une **recherche classique** `/search?hl=fr&q=...` depuis le texte confirmé, ou l’entrée constante `https://www.google.com/ai`, sans question. Aucun préremplissage IA n’est promis. Les questions restent du texte React et ne sont jamais évaluées comme commande ou HTML. Les marqueurs connus de données sensibles, identifiants/secrets, adresses mail, chemins locaux, IP privées et sujets AXDIA/SENTINEL bloquent les ouvertures jusqu’à reformulation. Ce filtre est limité : noms privés inconnus et données non reconnaissables ne peuvent pas être détectés universellement. Le dialogue demande une vérification humaine ; il ne certifie jamais qu’une question est publique.

Le message n’ouvre rien. Le dialogue conserve une question modifiable et copiable ; seul un clic parent sur **Rechercher sur Google**, **Ouvrir Google Mode IA** ou un lien de repli appelle une ouverture avec `noopener,noreferrer`. Source, session et destination sont revérifiées au clic. Une demande déjà affichée n’est pas remplacée par la suivante. Hors ligne, aucun lancement n’est tenté. Une valeur `null` retournée par `window.open` ne prouve pas un blocage, car `noopener` peut également la produire en cas de succès : le message reste « ouverture demandée » et propose un lien. Un refus du presse-papiers conserve la sélection/copie manuelle. [MDN window.open](https://developer.mozilla.org/en-US/docs/Web/API/Window/open), [Clipboard](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText).

Les originaux et `editionData` restent intacts. Sandbox et CSP ne changent pas. Le mode sécurisé n’exécute aucun pont enfant ; les questions explicitement disponibles peuvent être préparées depuis les outils du parent. Un HTML interactif reste non fiable et peut demander un dialogue sans clic enfant, mais ne peut confirmer ce dialogue dans le parent isolé. Le choix du navigateur externe depuis une PWA installée dépend du système ; les tests simulés ne certifient pas Safari iOS ni un WebView Android physique. [Rapport et limites du candidat](docs/JOURNAL360_GOOGLE_NAVIGATION.md).

## Complément — 2.0.7

Aucune permission nouvelle : sandbox `allow-scripts`, CSP du cadre et du parent, Permissions-Policy et absence d’attribut `allow` sont inchangés. Le presse-papiers n’est pas délégué au HTML importé ; la copie se fait dans la PWA après un clic sur **Copier la question**.

Pour les producteurs reconnus `6.1` et `6.4` seulement, la PWA lit les questions explicites (`items[].aiQuestion`, `#public-sentinel`, `#public-axdia`) et les place sur les boutons « En savoir plus » à fenêtre producteur ou sur le lien `https://www.google.com/ai` voisin d’un bouton. Dans le cadre, l’adaptateur peut aussi relire le champ de question affiché (`textarea#question`, `#deepQuestion`) au moment du clic ; ce texte reste non fiable, il est revalidé, affiché et modifiable dans la PWA avant toute action. Une question vide ou invalide ouvre le dialogue sans texte. **Ouvrir Google Mode IA** n’envoie aucun texte et reste donc disponible quand la question est vide ; il reste bloqué par les marqueurs sensibles connus, comme la recherche classique. [Diagnostic et tests 2.0.7](docs/JOURNAL360_GOOGLE_BUTTONS_V64.md).


## Correctifs locaux de l’audit du 24 octobre

Le pont de téléchargement v2 ne modifie que le srcdoc. Il prend aussi en charge `a.click()` détaché, sans `allow-downloads` ni `allow-same-origin`. Un prompt doit correspondre au nom et au texte validés ; la confirmation parent contrôle le SHA et le cadre courant. Les messages inconnus/périmés sont refusés ; un double clic parent ne crée qu’un téléchargement. Les mutations du contrôle parent et des permissions doivent faire échouer les tests négatifs.

La restauration contrôle les projections V7 depuis l’original vérifié, séparément du titre personnel et des notes. Pour les HTML historiques sans contrat unifié reconnu, les anciennes projections ne sont pas certifiées par reconstruction ; SHA et contrats historiques restent appliqués. Les inventaires de segments sont des contrôles d’intégrité, pas une signature d’auteur.

L’assistant personnel ne promet pas une transaction entre IndexedDB et localStorage. Chaque espace et chaque type de réglage demandent une action distincte ; les conflits de recherches sont conservés. Les anciens clients sans verrou ne doivent pas écrire simultanément avec ce candidat. Aucun test cloud réel ni profil personnel n’a été exécuté.


## Sources en ligne facultatives

Les clés Brave/Tavily/Exa autorisées par le propriétaire sont des variables serveur sensibles ; aucune clé dans le bundle, le cache navigateur ou les exports. Les sources privées exigent un Bearer Supabase du compte privé configuré vérifié, un Origin correspondant et une recherche publique bornée. Pas d’accès par cookie ni de formulaire tiers ; aucune requête calculée à partir d’un journal ou d’une note. Les endpoints sont fixés, les redirects refusés et les liens des réponses ne sont pas suivis par le serveur. Le HTML des réponses n’est jamais interprété dans l’interface.

Les cadences et caches sont bornés **par processus**, sans garantie de plafond de dépenses distribué. Les erreurs fournisseur sont ramenées à des codes sans corps brut. Le contrôle contre les clés connues et motifs de données privées n’est pas un classificateur universel de confidentialité. Les trois fournisseurs ont répondu séparément en test réel ; l’authentification privée en production n’a pas été exercée avec la session personnelle. Les tests de restauration/RLS cloud de la mission initiale restent hors périmètre. La CSP client n’est pas élargie pour les fournisseurs.
