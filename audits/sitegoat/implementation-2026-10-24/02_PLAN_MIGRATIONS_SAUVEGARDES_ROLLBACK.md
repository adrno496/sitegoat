# Compatibilité, sauvegarde et rollback

Invariants : originaux SHA et octets immuables ; notes et états séparés ; pas de purge ; aucune donnée réelle utilisée. Bases journal v4 et futur v1 inchangées. ZIP 1/2/3 relus. Toute nouvelle enveloppe est additive, ses segments restent des ZIP historiques ; les originaux et archives de départ sont conservés.

Recherches : préférer Web Locks exclusif sur la clé existante, relecture sous verrou et comparaison du même ID avant écriture. Sans Web Locks ou stockage accessible : erreur explicite, aucune écriture de repli dangereuse. Aucune migration ni suppression de clé. Ancien client sans verrou : non couvert ; fermer les anciennes versions avant usage. Export des réglages par liste blanche, jamais tokens/sessions/jobs/cloud.

Restauration segmentée : valider tous les fragments et hashes avant une transaction unique des quatre tables du journal. Refuser les manquants/doublons/conflits d'identité ; aucune écriture progressive partielle. Enveloppe personnelle : bases indépendantes, pas d'atomicité interbases possible ; ne pas revendiquer restauration complète atomique sans protocole d'étapes/reprise validé. Aperçu et actions explicites nécessaires.

Rollback code : arrêter uniquement les serveurs de test de cette mission. Créer une nouvelle branche au HEAD initial dans un autre worktree ou appliquer `git revert` aux commits du lot en ordre inverse sur une branche dédiée, après vérification de l'état Git. Jamais reset/clean ni écrasement de fichier utilisateur. Pas de rétrogradation du stockage. Les segments historiques se restaurent aussi un par un sur ancien client ; garder l'inventaire et vérifier tous les segments avant de considérer la reprise complète.

Déploiement bloqué tant que restauration synthétique, compatibilité et revue finale ne sont pas prouvées ; l'usage sur bibliothèque réelle reste une décision séparée avec export et restauration sur profil vierge. Cloud réel et appareils physiques hors mandat.
