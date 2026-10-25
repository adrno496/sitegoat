# Repères orange — dernière édition

Complément du 25 octobre 2026 demandé par l’utilisateur. Travail dans le worktree et la branche isolés existants ; l’autorisation antérieure de commit/push sur `main` reste applicable.

## Résultat

Les articles et brèves de la dernière édition reçoivent un fond orange clair, un bord orange et le badge **Dernière édition**. Le thème sombre a ses couleurs adaptées. Ce repère est partagé par Accueil, Aujourd’hui, Articles, le détail d’article et Actualité rapide. Les titres gras, les dates compactes et la disposition sont conservés.

Le calcul précédent retenait uniquement les contenus partageant l’instant de publication maximal. Le nouveau calcul retient le dernier créneau de la dernière journée disponible, indépendamment de l’ordre d’import. Dans cette édition, un article est orange s’il apparaît pour la première fois dans ce créneau, ou si sa publication ou sa dernière modification appartient à ce créneau, en heure de Paris. Les anciens articles inchangés restent neutres. Archives, corbeille et documents rangés dans une collection ne remplacent pas le dernier journal lorsqu’un journal actif existe.

Les brèves ne disposent que d’une date civile : lorsqu’un snapshot précédent est disponible pour la même brève, une brève répétée inchangée reste neutre ; une nouvelle brève ou une version modifiée devient orange. Sans historique, le repère signifie « présente dans la dernière édition », sans prétendre connaître son heure de publication. Pour un document sans créneau exploitable, le repère reste au niveau de l’édition. Les données du radar et les flux API conservent leurs propres dates : une récupération récente ne devient pas une nouveauté éditoriale.

## Vérifications réellement exécutées

- `npm run lint` : PASS.
- `npm run build` (TypeScript et bundle/PWA) : PASS.
- `npm test` : **370 PASS, 1 skip historique**, 39 fichiers.
- `npx playwright test tests/e2e/v9-orange-edition.spec.ts tests/e2e/v9-workspace.spec.ts` : **18 PASS**, Chromium, WebKit et Chromium mobile émulé, sans retry.
- Le nouveau scénario vérifie plusieurs heures dans un créneau, une correction d’article ancien, un article ancien inchangé, recherche, détail, rechargement, couleurs calculées des deux thèmes et absence de violation axe dans Aujourd’hui. Les tests unitaires couvrent également l’import tardif d’une ancienne édition, archives/corbeille, brèves et changement d’heure de Paris.
- Capture synthétique sombre inspectée visuellement ; journaux de sortie et capture conservés dans `preuves/orange-derniere-edition/`.

La suite navigateur complète de la publication précédente reste une preuve historique : ses 301 succès ne sont pas présentés comme une nouvelle exécution locale de cette modification. Le fichier réel `JOURNAL_360_V10_2026-10-24_EDITION_20_CORRIGE_DATES_V2.html` n’est plus présent à son chemin précédent ; la recherche de son nom dans Downloads ne l’a pas retrouvé. Son ancien test en production reste documenté dans le rapport 10. Aucun nouveau test réel de ce fichier n’est revendiqué ici. La vérification après publication utilise des données synthétiques dans des profils neufs.

## Conservation et limites

Aucun changement de schéma, migration de données, modification de journal original, sauvegarde ou accès aux clés API. Aucun contenu personnel ajouté aux preuves. Les tests navigateur existants couvrent la lecture originale hors ligne ; le nouveau repère ne dépend d’aucun appel réseau. Il reflète les métadonnées fournies par l’édition, sans revalidation de l’actualité auprès des sources. La limite mémoire SG-03 du rapport principal demeure.

## Retour arrière

Le commit de code de ce complément peut être annulé par `git revert a84bc6af24501e7df67665687374857c6ddfcf1e`, puis `npm run lint`, `npm run build`, `npm test` et les deux fichiers Playwright ci-dessus. Examiner le diff, puis pousser le commit d’annulation selon l’autorisation de publication applicable. L’applicabilité du diff inverse a été vérifiée sur ce commit par `git diff --binary a84bc6a^ a84bc6a | git apply --reverse --check` : PASS, sans appliquer le patch. Le revert réel n’a pas été exécuté ; aucune restauration de données n’est nécessaire. Le patch `rollback-en-direct.patch` du rapport 10 reste une procédure historique construite pour `46875a2` ; il ne faut pas supposer son application directe après ce complément sans vérification et adaptation.

## Reçu après publication

- Code commité et poussé sans force ni merge sur `main` : **`a84bc6af24501e7df67665687374857c6ddfcf1e`**. Le dépôt d’origine est resté à son état initial avec son seul dossier `audits/` non suivi.
- Le statut GitHub/Vercel de ce commit est **success**. L’origine publique `https://sitegoat.vercel.app` répond 200 ; ses cinq ressources JS/CSS référencées dans le HTML correspondent exactement aux SHA-256 du build local. La première vérification, pendant le déploiement encore pending, trouvait naturellement les deux nouveaux assets absents ; après succès Vercel, les cinq comparaisons sont PASS.
- Le scénario orange a été rejoué contre cette origine, profils neufs sans cookies ni bibliothèque personnelle, avec la fixture synthétique : **3 PASS, 0 FAIL, 0 retry**, Chromium/WebKit/Chromium mobile. La configuration temporaire supprime les serveurs/proxy locaux et la préférence interactive historique et remplace `testMatch` dans **chaque projet** par `v9-orange-edition.spec.ts`. Commande : `npx playwright test --config /tmp/sitegoat-orange-production.config.ts`. Résumé et log conservés dans les preuves.
- Incident de harnais conservé dans `production-harness-initial.log` : une première configuration n’a pas supprimé le serveur local hérité (arrêt avant tests, faute de package dans `/tmp`), puis le filtre mobile du projet a pris le pas sur le filtre global. Deux contrôles orange PASS ont été suivis d’un scénario Google IA non prévu en échec et d’un autre interrompu ; les 93 suivants n’ont pas été exécutés. L’échec venait de l’attente historique d’un lecteur interactif dans le profil neuf configuré sans cette préférence (sandbox sûre observée). Après arrêt et correction du filtre par projet, seuls les trois contrôles voulus sont exécutés et PASS. Aucune assertion de sécurité ni préférence produit n’a été modifiée pour cette correction du harnais.
- CI complète automatique : [exécution du commit de code](https://github.com/adrno496/sitegoat/actions/runs/40176521486), **en cours au moment de ce reçu**. Installation et navigateurs terminés ; `npm run check` en cours. Les résultats locaux et production ci-dessus sont achevés ; aucun succès final de cette CI n’est encore revendiqué.
