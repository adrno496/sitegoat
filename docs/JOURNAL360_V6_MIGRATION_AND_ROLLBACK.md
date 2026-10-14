# Migration et retour arrière V6

Travail **local uniquement**, 14 octobre 2026. Original `journal360-pwa`, branche main, HEAD `b1fc804f9767a97afe789d93323846eb57330df6` conservé. Worktree de développement : `../journal360-v6-worktree`, branche `codex/journal360-v6-local`, même point de départ, modifications non commitées. Pas de production ni de base personnelle ouverte par les tests.

## Avant toute activation réelle

1. Exporter chaque bibliothèque réelle avec le client qui la comprend ; conserver les originaux, notes et favoris dans un emplacement privé. Les ZIP sont non chiffrés. Conserver aussi un export antérieur 1.1.1/format1 pour les données historiques.
2. Vérifier un export dans une origine/profil séparé avec cette version, nombre d’éditions/notes/états et SHA des originaux. Ne pas vider IndexedDB ni le cache de l’application utilisée quotidiennement.
3. Tester les HTML du vrai producteur V6, les fichiers illustrés et les appareils physiques. Ces essais restent NON TESTÉS dans cette mission.
4. Mettre à jour ensemble les appareils avant de produire/synchroniser des ZIP format2. Le vieux client n’en comprend pas les métadonnées et rejette le format2. Ne pas lancer une ancienne PWA sur une bibliothèque V6 active en supposant une compatibilité complète.
5. Si déploiement ultérieur autorisé, client et API de pagination doivent être coordonnés ; le nouveau client détecte la réponse potentiellement tronquée d’un ancien serveur à100 snapshots et signale une erreur explicite. Pas de purge pour contourner l’erreur.

## Migration additive

Dexie v4 ajoute seulement les index `dayKey`, `externalEditionId`, `[dayKey+sha256]` à editions. Tables v1–v3, UUID et enregistrements inchangés. Aucun rétroclassement automatique des anciennes éditions. La date/titre legacy ne suffit pas à fusionner des journées. Les métadonnées V6 ne sont ajoutées qu’aux nouveaux imports valides, ou rattachement manuel explicite de même date.

Les UUID V6 déterministes ne remplacent pas les UUID historiques. SHA de l’original = identité du contenu ; révision externe = déclaration du producteur ; compteur local = ordre d’ajout. Toute nouvelle version garde ses propres octets. Déclarer une version COMPLETE ne supprime pas ses ancêtres. Le champ `supersedes` est informatif ; la sélection fiable est recalculée, surtout après réception hors ordre.

Import de lot : une transaction IndexedDB couvre éditions/originaux/pending, aucun réseau dedans ; échec simulé au second fichier → zéro écriture du lot. ZIP : inspection complète avant fusion transactionnelle ; collisions conservées et répétitions idempotentes. Migration v1→v4, v3→v4, restauration vide, notes/favoris et1095 originaux vérifiés par les tests locaux.

Archives : format1 toujours lu ; format2 écrit dès présence de métadonnées V6, afin de ne pas perdre silencieusement les champs dans un client ancien. 4000 éditions maximum, pas stockage illimité ; aucune garantie de mémoire mobile à cette limite. Le manifeste64 MiB et total150 MiB sont plafonnés, fichier10 MiB et cloud50 MiB inchangés. Message d’erreur avant export impossible à restaurer.

## Retour du code

La copie main d’origine est le point de retour immédiat : elle n’a reçu aucune modification. Le worktree séparé peut rester pour analyse ; aucun reset, nettoyage global ou réécriture d’historique nécessaire. Les modifications sont documentées dans CHANGES et une pièce `evidence/v6/source-changes.patch` est produite pour revue locale. Son application puis inversion sur une copie temporaire du commit de base sont contrôlées, sans toucher aux fichiers de l’utilisateur.

Pour revenir fonctionnellement après une éventuelle activation future : arrêter les écritures, exporter avec le nouveau lecteur, garder le nouveau lecteur disponible pour restaurer ses ZIP2, revenir au bundle source précédent après autorisation de déploiement, et vérifier le service worker. L’E2E couvre mise à jour du shell avec original/favori conservés ; un aller-retour réel entre ces deux releases sur iOS n’a pas été effectué.

## Retour de la base / des index

**Une réversion du code n’abaisse pas la version native IndexedDB.** Le test a d’abord supposé à tort un VersionError : l’exécution montre que **Dexie4.4.6 réessaie sans version imposée et ouvre la base additive plus récente**. Le test final utilise l’ancien schéma3 sur la base4, lit le dayKey, modifie archived, réouvre le nouveau schéma et vérifie original/nouveaux champs intacts. C’est une compatibilité structurelle testée, pas une compréhension de V6 par l’ancien code.

Ne pas supprimer/recréer l’index ou la base en place pour obtenir v3. Conserver v4 est la voie prudente après rollback du shell. Si un ancien environnement exige réellement v3 : utiliser un profil/origine distinct, restaurer un export format1 pré-migration pour les seules données historiques ; garder le profil v4 et son ZIP2 pour toutes les données V6. Conversion V6→legacy avec conservation de l’index/identités nécessiterait un outil dédié et une validation séparée ; elle n’est pas implémentée ni simulée comme sans perte.

Aucune restauration sur la base personnelle, modification de secrets, RLS, Vercel ou Supabase réel. Autorisation séparée requise pour commit, push, déploiement et opérations distantes ; cette mission ne les réalise pas.
