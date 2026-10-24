# Architecture

React, TypeScript strict, Vite, vite-plugin-pwa, Dexie, Supabase JS, ZIP/JSZip et validation Zod. Pas de backend permanent. Deux fonctions Vercel Node servent à la connexion privée par code et à l’autorisation des sauvegardes.

## Données locales

Base `journal360-private`, schéma v4 :

- `editions` : métadonnées, texte régénérable et articles validés. Date éditoriale distincte de la date d’import ; date absente affichée comme inconnue. Familles de versions conservées explicitement.
- `originals` : octets UTF-8 intacts et SHA-256, séparés des métadonnées.
- `states` : ouvertures, lecture manuelle et favoris par édition / article.
- `notes` : notes et décisions appendues ; aucune modification silencieuse de note existante.
- `preferences` : thème et dates de sauvegardes. Les sessions Supabase ne sont jamais exportées.
- `jobs` : file de sauvegardes, propriétaire Auth, nombre de tentatives, erreur visible. Trois essais au maximum avant nouvelle action manuelle. Traitement sérialisé par propriétaire ; reprise à la reconnexion ou lors du retour au premier plan. Le snapshot représente la base à l’exécution du transfert.
- `pending` : fichiers reçus par l’OS ou le service worker. Les octets sont stockés localement et passent par la même prévisualisation que l’import normal. L’annulation explicite retire les fichiers en attente.

Chaque édition et son original sont enregistrés dans une transaction. La restauration est une transaction couvrant originaux, éditions, états et notes. Les migrations v1/v3 → v4 conservent les données ; tests dédiés. La v4 ajoute seulement les index dayKey, externalEditionId et [dayKey+sha256]. Les UUID locaux restent distincts des identifiants éditoriaux ; métadonnées V6 optionnelles, contrôle des cumuls recalculé avec les versions reçues.

## Mémoire

Les graphiques comptent les vraies éditions connues. Les sujets communs utilisent exclusivement un `event_id` explicite. Les textes d’origine sont affichés ; une différence de caractères est étiquetée comme comparaison technique, jamais comme analyse factuelle. Aucun rapprochement sémantique inventé.

## Lecteur

Analyse par DOMParser détaché, sans exécution de scripts. JSON `#editionData[type=application/json]` validé ; aucune tentative d’évaluer `DATA.items` dans du JavaScript. HTML générique : texte intégral et zéro article inventé. L’original est préservé.

Le lecteur utilise `srcdoc` dans une iframe sandboxée. Mode interactif par défaut à la demande de l’utilisateur ; `allow-scripts` seul, sans autre permission. Le choix explicite de désactiver JS reste mémorisé localement par édition. Jamais `allow-same-origin`, popups, téléchargement par le cadre ou navigation top. CSP restrictive injectée avant le contenu et nettoyage des ressources externes / bases / redirections et neutralisation des formulaires en conservant leurs contrôles. Le téléchargement intact passe par la PWA comme pièce jointe Blob. Les liens sources validés sont présentés dans la lecture textuelle, ouverts sur action de l’utilisateur.

## Cloud

`api/access.mjs` dérive un mot de passe Supabase par HMAC du code fourni avec le secret serveur ; le compte fixe est une variable serveur. Une vraie session Auth est obtenue, conservée et renouvelée sur l’appareil. Aucun fournisseur SMTP ni compte anonyme. `CloudRepository` fabrique une archive complète validée. `SyncCoordinator` conserve la file locale. La fonction `api/backup.mjs` vérifie le bearer via `auth.getUser()` ; le préfixe est toujours l’UID vérifié. Les chemins sont `<uid>/<uuid>.zip`, jamais un nom de fichier utilisateur. Aucun owner_id fourni par le client n’est accepté.

Storage privé, limite 50 Mo par snapshot. La RLS restrictive `journal360_server_only` interdit les opérations clients directes sur ce bucket, même si d’autres politiques permissives existent. Le serveur signe les uploads immuables et les téléchargements (60 secondes). Aucune table PostgreSQL applicative supplémentaire : les métadonnées d’édition et les états sont dans les archives privées, les dates/taille des snapshots dans Storage. Les autres buckets et tables du projet restent inchangés.

La restauration conserve les UUID des versions physiques, y compris de même hash ; collision d’UUID avec original différent → édition conflictuelle déterministe. Note avec même ID et texte différent → conservation des deux. Favori / lecture → union conservative. Les archives locales et cloud ne sont pas écrasées et aucune suppression distante n’est propagée. Inventaire paginé par100, jusqu’à5000 archives puis erreur explicite. `DeviceSynchronizer` synchronise automatiquement ces snapshots entre les appareils connectés au même UID. Chaque appareil mémorise les identifiants et empreintes des snapshots traités dans ses préférences privées. Il fusionne les branches inconnues dans l’ordre chronologique, par lots de10 archives avec progression persistée après chaque fusion, puis publie un snapshot si le contenu local diffère du dernier contenu confirmé et des archives connues. Aucune archive identique n’est envoyée en boucle. Une empreinte JSON canonique ignore l’ordre de stockage et les octets déjà représentés par SHA-256 ; l’export contrôle toujours les octets. L’archive est générée depuis le snapshot exact dont l’empreinte est confirmée, pour qu’une modification pendant le transfert reste à envoyer. Un échec réseau n’avance pas la confirmation.

En mode synchronisation, les identifiants d’édition sont conservés, y compris deux imports indépendants du même HTML. Les métadonnées et états prennent le `updatedAt` le plus récent, avec départage déterministe à date égale. Les notes en conflit gardent les deux textes avec un identifiant de conflit déterministe, sans duplication aux fusions suivantes. La restauration manuelle conserve son union conservative. Les suppressions sont des changements de corbeille ; aucune suppression Storage n’est propagée.

Observation IndexedDB avec délai de deux secondes, vérification distante toutes les 30 secondes tant que l’application est visible, et au retour réseau/au premier plan. Connexion persistante par le même code sur PC et smartphone. La synchronisation peut être suspendue par appareil, et un bouton permet une vérification immédiate. Pas de promesse de synchronisation lorsque la PWA est fermée.

## PWA et fichiers

Service worker injectManifest : cache versionné du shell et des démos publiques, aucun journal utilisateur dans CacheStorage. `/api/` est exclu du fallback et du cache ; aucun cache de session ou réponse cloud. POST `/share-target` est intercepté localement, stocké en `pending`, puis redirigé vers le shell. Les fichiers privés ne sont jamais renvoyés par une URL du serveur.

Le manifest déclare `file_handlers` et `share_target`. File Handling n’a pas de polyfill et reste limité aux plateformes compatibles ; l’import depuis Fichiers est le parcours universel. Une mise à jour demande l’action de l’utilisateur et conserve IndexedDB. Les tâches cloud ne présument pas la disponibilité de Background Sync.

La lecture occupe le viewport dès l’ouverture ; agrandir/réduire conserve la même iframe et son état courant. La confiance par édition est stockée localement dans preferences et exclue des sauvegardes. En interactif, un adaptateur de history pushState/replaceState se limite aux fragments en cas de refus SecurityError dans srcdoc : aucun accès à l’historique parent. Zoom du HTML70% par défaut, réglable jusqu’à200%, sans réduire la taille du shell.

Le srcdoc est calculé avec useMemo avant le montage : aucune iframe ne démarre avec un document vide ni un contenu du mode précédent. Le cadre est recréé lors du changement de mode. Le zoom HTML redimensionne son viewport interne et applique une transformation CSS de 70 % par défaut ; changer le zoom ou agrandir/réduire conserve le même cadre et son état. Recharger le HTML recrée uniquement le cadre, sans toucher aux octets ni annotations.

Depuis 2.0.3, l’affichage courant est calculé par date éditoriale pour tous les imports datés, y compris les anciens records indépendants ou sans contrat V6. Il ne présente que la dernière édition de chaque journée ; les autres records restent conservés pour leurs originaux et annotations. La même sélection déterministe s’applique après une fusion de snapshots, sans réécriture massive ni suppression distante. Voir [règles et validation](docs/JOURNAL360_ONE_HTML_PER_DAY.md).


## Cartographie du candidat local — audit du 24 octobre 2026

Racine de travail : `/Users/dreano/Downloads/veille/sitegoat-implementation` ; dépôt d’origine conservé dans `/Users/dreano/Downloads/veille/veille`. Branche dédiée `codex/sitegoat-audit-v4-local`. Publication main/Vercel et preuves V10 : voir le [rapport 08](audits/sitegoat/implementation-2026-10-24/08_PUBLICATION_ET_TEST_V10.md).

- Import UTF-8 inerte → schémas V7 et brèves V9 distincts → transaction `journal360-private` v4. Originaux jamais modifiés.
- Reader → copie d’affichage opaque → pont v2 lié à WindowProxy, hash d’édition, révision, session et requestId. La confirmation du parent décide du téléchargement ; les permissions restent `allow-scripts` uniquement après choix explicite.
- `editorialPresentation` sépare dates et statuts déclarés ; horloge Paris recalculée au premier plan et chaque seconde, sans réécrire les dates sources.
- Sauvegarde journaux ZIP historique → vérification SHA et projections V7 depuis l’original → transaction de fusion. `segmentedBackup` ajoute un inventaire inerte commun et des ZIP historiques ; restauration uniquement après validation de tous les segments.
- Base `journal360-future-private` v1 indépendante ; sauvegarde ZIP Le Futur dédiée. Pas de fusion physique des bases ni d’atomicité interbases revendiquée.
- localStorage : `journal360.display.v9`, `journal360.interface.v1`, `journal360.recurring-searches.v1`, `journal360.reader-default.v1`. Recherches protégées par Web Locks et comparaison d’ID ; ancienne clé conservée. L’export personnel ne contient que les trois premières clés et le thème IndexedDB. Permissions de confiance exclues.
- CacheStorage : shell et exemples publics précachés. Les données privées restent dans IndexedDB. Cloud optionnel et ses règles distantes non vérifiés par cette mission.

Les exports de lecture et modèles de notes sont des actions locales explicites ; aucun moteur IA, téléchargement de modèle, télémétrie ou fetch éditorial ajouté. Les mesures et limites sont dans le rapport d’implémentation.


Complément Sources : `QuickNews → SourceExplorer → /api/sources → server/source-providers.mjs`. Les pages normales n’appellent pas de fournisseur. Le catalogue est lu uniquement à l’ouverture de Sources ; la récupération est explicite. Neuf sources fixes, trois clés serveur distinctes de Supabase ; seules les trois recherches privées demandent un JWT vérifié. Cache public local `journal360.online-sources.v1`, dix récupérations au plus, sans migration de base et exclu des sauvegardes personnelles. Le serveur local sait router cette API uniquement lorsque le mode connecté explicite est activé ; le mode de test conserve ses appels réseau bloqués.
