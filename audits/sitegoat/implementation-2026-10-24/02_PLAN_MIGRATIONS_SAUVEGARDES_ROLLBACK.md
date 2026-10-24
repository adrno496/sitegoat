# Compatibilité, sauvegarde et rollback

Invariants : originaux SHA et octets immuables ; notes et états séparés ; pas de purge ; aucune bibliothèque réelle migrée ; seuls les HTML fournis sont importés dans des profils jetables. Bases journal v4 et futur v1 inchangées. ZIP 1/2/3 relus. Toute nouvelle enveloppe est additive, ses segments restent des ZIP historiques ; les originaux et archives de départ sont conservés.

Recherches : préférer Web Locks exclusif sur la clé existante, relecture sous verrou et comparaison du même ID avant écriture. Sans Web Locks ou stockage accessible : erreur explicite, aucune écriture de repli dangereuse. Aucune migration ni suppression de clé. Ancien client sans verrou : non couvert ; fermer les anciennes versions avant usage. Export des réglages par liste blanche, jamais tokens/sessions/jobs/cloud.

Restauration segmentée : valider tous les fragments et hashes avant une transaction unique des quatre tables du journal. Refuser les manquants/doublons/conflits d'identité ; aucune écriture progressive partielle. Enveloppe personnelle : bases indépendantes, pas d'atomicité interbases possible ; ne pas revendiquer restauration complète atomique sans protocole d'étapes/reprise validé. Aperçu et actions explicites nécessaires.

Rollback code : arrêter uniquement les serveurs de test de cette mission. Créer une nouvelle branche au HEAD initial dans un autre worktree ou appliquer `git revert` aux commits du lot en ordre inverse sur une branche dédiée, après vérification de l'état Git. Jamais reset/clean ni écrasement de fichier utilisateur. Pas de rétrogradation du stockage. Les segments historiques se restaurent aussi un par un sur ancien client ; garder l'inventaire et vérifier tous les segments avant de considérer la reprise complète.

Déploiement autorisé après restauration synthétique, compatibilité et revue finale ; preuves remplies puis publication exécutée dans 08 ; l'usage sur bibliothèque réelle reste une décision séparée avec export et restauration sur profil vierge. Cloud réel et appareils physiques hors mandat.


## Procédure concrète de retour au code initial

À exécuter depuis le dépôt correct et uniquement dans de nouveaux chemins libres. Les commandes ci-dessous sont une procédure, pas des actions déjà exécutées sur main.

```sh
git fetch origin
git worktree add -b codex/sitegoat-rollback-review /chemin/libre/sitegoat-rollback origin/main
cd /chemin/libre/sitegoat-rollback
git revert --no-commit 987b5637707ef0af05bb1900fa8e187a96848246..1a06ce79942a374db56e392786780bbca56d00e9
npm ci
npm run check
```

Les reverts traitent le candidat complet, pas un helper intermédiaire isolé. En cas de conflit, examiner et résoudre dans ce worktree ; `git revert --abort` annule uniquement la séquence en cours. Ne pas effacer de base pour faire passer un test. Vérifier à nouveau les ZIP historiques et les trois espaces sur un profil vierge. Un éventuel commit/push de rollback serait une nouvelle publication à décider ; il n’a pas été effectué par cette mission.

Pour consulter l’ancien code sans aucune publication : `git worktree add --detach /autre/chemin/libre 987b5637707ef0af05bb1900fa8e187a96848246`. Ne jamais lancer `git reset --hard`, `git clean` ni un effacement de données navigateur comme procédure de rollback. Le service worker d’un client existant nécessite un rechargement/une fermeture-réouverture pour adopter le build publié, sans purge des données.

La baseline initiale présente 333 unitaires PASS/1 skip et 243 E2E PASS/28 FAIL/1 skip. Un rollback vers cet état réintroduit ces défauts ; le `check` de rollback sert à constater la comparaison et ne doit pas être déclaré vert par suppression d’assertions. Les tests de formats et de restauration du candidat sont exécutés ; les commandes Git de rollback ci-dessus ne l’ont pas été.
