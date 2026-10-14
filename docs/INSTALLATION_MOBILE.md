# Installer Journal 360 sur téléphone

Les captures dans `docs/screenshots/` représentent **des navigateurs automatisés à des largeurs simulées**, pas des captures d’un iPhone ou Android physique.

## Retrouver la même bibliothèque sur PC et téléphone

1. Ouvrir **https://sitegoat.vercel.app** sur le PC et le smartphone.
2. Sur chaque appareil, ouvrir **Réglages** et saisir le **même code d’accès privé**.
3. Laisser **Synchroniser automatiquement cet appareil** coché. La bibliothèque apparaît sans restaurer manuellement une archive.
4. Importer vos HTML et écrire vos notes sur l’un des appareils : les changements sont envoyés après quelques secondes, puis récupérés sur l’autre appareil sous environ 30 secondes lorsque l’application est ouverte et connectée. **Synchroniser maintenant** accélère la vérification.

Une modification faite hors ligne reste enregistrée localement et sera envoyée au retour du réseau ou à la prochaine ouverture. Garder aussi un export ZIP indépendant.

## iPhone

1. Ouvrir l’URL HTTPS réellement indiquée dans le compte rendu avec **Safari**.
2. Toucher le bouton **Partager** de Safari.
3. Choisir **Ajouter à l’écran d’accueil**, puis **Ajouter**.
4. Lancer Journal 360 depuis son icône.
5. Toucher **+** ou **Importer**, puis **Choisir un fichier**. Sélectionner le `.html` dans **Fichiers** / **iCloud Drive** / **Téléchargements**.
6. Vérifier les informations, puis enregistrer et ouvrir l’édition.

Safari iOS ne propose pas aujourd’hui File Handling pour cette PWA ni la réception de fichiers via Web Share Target. On ne peut pas promettre qu’elle figurera dans « Ouvrir avec » depuis Fichiers : le parcours fiable est la sélection **dans la PWA**. Le navigateur et la PWA installée peuvent avoir des stockages distincts ; sauvegarder / restaurer ou utiliser le compte cloud pour transférer.

## Android

1. Ouvrir l’URL HTTPS dans **Chrome**.
2. Menu **⋮ → Installer l’application** (ou Ajouter à l’écran d’accueil selon le navigateur).
3. Lancer Journal 360 depuis son icône.
4. Depuis l’app Fichiers, sélectionner un `.html`, puis **Partager → Journal 360** si proposé. Le fichier arrive dans la prévisualisation d’import, sans exécuter ses scripts.
5. Sinon ouvrir Journal 360, toucher **Importer** et choisir le fichier local.
6. Lire en mode sécurisé, ajouter un favori ou une note, puis exporter une sauvegarde.

Le partage dépend du navigateur, de l’installation, du MIME choisi par l’application qui partage et du système. Le manifeste accepte text/html et les extensions .html/.htm, sans accepter arbitrairement tous les types de fichiers.

## Ordinateur compatible File Handling

Installer la PWA avec Chrome/Edge compatible. « Ouvrir avec → Journal 360 » peut ensuite être proposé pour les HTML. Autoriser la demande du navigateur seulement pour les fichiers voulus. La réception launchQueue est implémentée ; aucun polyfill ni association système forcée.

## Hors ligne et sauvegarde

Faire un premier lancement avec réseau pour installer le cache. Importer et enregistrer le journal. Les lectures suivantes fonctionnent hors réseau si le navigateur conserve le cache et IndexedDB. Les scripts externes et ressources distantes sont bloqués même en ligne.

Pour conserver les données après perte / remplacement du téléphone : **Réglages → Exporter tout**, ou se connecter et **Sauvegarder dans Supabase**. Sur le nouveau téléphone, saisir le même code dans Réglages pour récupérer automatiquement la bibliothèque, ou importer le ZIP. Aucune édition future ne s’ajoute automatiquement depuis ChatGPT.

## Références vérifiées pendant l’implémentation

[File Handling — Chrome](https://developer.chrome.com/docs/capabilities/web-apis/file-handling), [Web Share Target — Chrome](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target), [manifest — MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/file_handlers). Les APIs limitées ne peuvent pas être activées artificiellement par le code sur iOS.
