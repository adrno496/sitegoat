# Architecture

React, TypeScript strict, Vite, vite-plugin-pwa, Dexie, Supabase JS, ZIP/JSZip et validation Zod. Pas de backend permanent. Deux fonctions Vercel Node servent à la connexion privée par code et à l’autorisation des sauvegardes.

## Données locales

Base `journal360-private`, schéma v3 :

- `editions` : métadonnées, texte régénérable et articles validés. Date éditoriale distincte de la date d’import ; date absente affichée comme inconnue. Familles de versions conservées explicitement.
- `originals` : octets UTF-8 intacts et SHA-256, séparés des métadonnées.
- `states` : ouvertures, lecture manuelle et favoris par édition / article.
- `notes` : notes et décisions appendues ; aucune modification silencieuse de note existante.
- `preferences` : thème et dates de sauvegardes. Les sessions Supabase ne sont jamais exportées.
- `jobs` : file de sauvegardes, propriétaire Auth, nombre de tentatives, erreur visible. Trois essais au maximum avant nouvelle action manuelle. Traitement sérialisé par propriétaire ; reprise à la reconnexion ou lors du retour au premier plan. Le snapshot représente la base à l’exécution du transfert.
- `pending` : fichiers reçus par l’OS ou le service worker. Les octets sont stockés localement et passent par la même prévisualisation que l’import normal. L’annulation explicite retire les fichiers en attente.

Chaque édition et son original sont enregistrés dans une transaction. La restauration est une transaction couvrant originaux, éditions, états et notes. La migration v1 → v3 conserve les données ; test dédié.

## Mémoire

Les graphiques comptent les vraies éditions connues. Les sujets communs utilisent exclusivement un `event_id` explicite. Les textes d’origine sont affichés ; une différence de caractères est étiquetée comme comparaison technique, jamais comme analyse factuelle. Aucun rapprochement sémantique inventé.

## Lecteur

Analyse par DOMParser détaché, sans exécution de scripts. JSON `#editionData[type=application/json]` validé ; aucune tentative d’évaluer `DATA.items` dans du JavaScript. HTML générique : texte intégral et zéro article inventé. L’original est préservé.

Le lecteur utilise `srcdoc` dans une iframe sandboxée. Mode interactif par défaut à la demande de l’utilisateur ; `allow-scripts` seul, sans autre permission. Le choix explicite de désactiver JS reste mémorisé localement par édition. Jamais `allow-same-origin`, popups, téléchargement par le cadre ou navigation top. CSP restrictive injectée avant le contenu et nettoyage des ressources externes / bases / redirections et neutralisation des formulaires en conservant leurs contrôles. Le téléchargement intact passe par la PWA comme pièce jointe Blob. Les liens sources validés sont présentés dans la lecture textuelle, ouverts sur action de l’utilisateur.

## Cloud

`api/access.mjs` dérive un mot de passe Supabase par HMAC du code fourni avec le secret serveur ; le compte fixe est une variable serveur. Une vraie session Auth est obtenue, conservée et renouvelée sur l’appareil. Aucun fournisseur SMTP ni compte anonyme. `CloudRepository` fabrique une archive complète validée. `SyncCoordinator` conserve la file locale. La fonction `api/backup.mjs` vérifie le bearer via `auth.getUser()` ; le préfixe est toujours l’UID vérifié. Les chemins sont `<uid>/<uuid>.zip`, jamais un nom de fichier utilisateur. Aucun owner_id fourni par le client n’est accepté.

Storage privé, limite 50 Mo par snapshot. La RLS restrictive `journal360_server_only` interdit les opérations clients directes sur ce bucket, même si d’autres politiques permissives existent. Le serveur signe les uploads immuables et les téléchargements (60 secondes). Aucune table PostgreSQL applicative supplémentaire : les métadonnées d’édition et les états sont dans les archives privées, les dates/taille des snapshots dans Storage. Les autres buckets et tables du projet restent inchangés.

La restauration fusionne les identifiants/hash ; collision d’original → nouvelle édition. Note avec même ID et texte différent → conservation des deux. Favori / lecture → union conservative. Les archives locales et cloud ne sont pas écrasées et aucune suppression distante n’est propagée. Affichage des 100 snapshots les plus récents. `DeviceSynchronizer` synchronise automatiquement ces snapshots entre les appareils connectés au même UID. Chaque appareil mémorise les identifiants et empreintes des snapshots traités dans ses préférences privées. Il fusionne toutes les branches encore inconnues parmi les 100 archives disponibles, dans l’ordre chronologique, puis publie un snapshot si le contenu local diffère du dernier contenu confirmé et des archives connues. Aucune archive identique n’est envoyée en boucle. Une empreinte JSON canonique ignore l’ordre de stockage et les octets déjà représentés par SHA-256 ; l’export contrôle toujours les octets. L’archive est générée depuis le snapshot exact dont l’empreinte est confirmée, pour qu’une modification pendant le transfert reste à envoyer. Un échec réseau n’avance pas la confirmation.

En mode synchronisation, les identifiants d’édition sont conservés, y compris deux imports indépendants du même HTML. Les métadonnées et états prennent le `updatedAt` le plus récent, avec départage déterministe à date égale. Les notes en conflit gardent les deux textes avec un identifiant de conflit déterministe, sans duplication aux fusions suivantes. La restauration manuelle conserve son union conservative. Les suppressions sont des changements de corbeille ; aucune suppression Storage n’est propagée.

Observation IndexedDB avec délai de deux secondes, vérification distante toutes les 30 secondes tant que l’application est visible, et au retour réseau/au premier plan. Connexion persistante par le même code sur PC et smartphone. La synchronisation peut être suspendue par appareil, et un bouton permet une vérification immédiate. Pas de promesse de synchronisation lorsque la PWA est fermée.

## PWA et fichiers

Service worker injectManifest : cache versionné du shell et des démos publiques, aucun journal utilisateur dans CacheStorage. `/api/` est exclu du fallback et du cache ; aucun cache de session ou réponse cloud. POST `/share-target` est intercepté localement, stocké en `pending`, puis redirigé vers le shell. Les fichiers privés ne sont jamais renvoyés par une URL du serveur.

Le manifest déclare `file_handlers` et `share_target`. File Handling n’a pas de polyfill et reste limité aux plateformes compatibles ; l’import depuis Fichiers est le parcours universel. Une mise à jour demande l’action de l’utilisateur et conserve IndexedDB. Les tâches cloud ne présument pas la disponibilité de Background Sync.

La lecture occupe le viewport dès l’ouverture ; agrandir/réduire conserve la même iframe et son état courant. La confiance par édition est stockée localement dans preferences et exclue des sauvegardes. En interactif, un adaptateur de history pushState/replaceState se limite aux fragments en cas de refus SecurityError dans srcdoc : aucun accès à l’historique parent. Affichage mobile 70 % avec hauteur plein écran compensée.

Le srcdoc est calculé avec useMemo avant le montage : aucune iframe ne démarre avec un document vide ni un contenu du mode précédent. Le cadre est recréé lors du changement de mode. Le zoom HTML redimensionne son viewport interne et applique une transformation CSS de 70 % par défaut ; changer le zoom ou agrandir/réduire conserve le même cadre et son état. Recharger le HTML recrée uniquement le cadre, sans toucher aux octets ni annotations.
