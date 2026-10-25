# Import — suppression du plafond de 30 avertissements

À la demande explicite de l’utilisateur, le plafond de nombre d’éléments a été supprimé uniquement pour les deux champs `warnings` : `unifiedSchema` (avertissements éditoriaux du journal) et `editionSchema` (diagnostics de l’édition locale et de la sauvegarde). Le dépassement de 30 ne bloque plus l’import ou la relecture d’une sauvegarde. Les listes sont conservées intégralement, sans troncature ni remplacement par une liste vide.

Les autres plafonds de 30, notamment les sources et relations entre articles, restent inchangés. Les avertissements restent des chaînes ; chaque avertissement éditorial reste limité à 1 000 caractères. Les contrôles de taille demeurent : HTML de 10 Mio maximum, bloc unifiedData de 2 Mio maximum, manifeste ZIP de 64 Mio et budget total de restauration de 150 Mio. Il ne s’agit donc pas d’autoriser un fichier de taille arbitraire.

## Vérifications

Les nouvelles régressions utilisent exclusivement des données synthétiques : imports réels de 31 et 300 avertissements sans perte, sauvegarde ZIP puis restauration dans une base jetable avec 100 avertissements éditoriaux et 100 diagnostics, égalité des octets de l’original et de son SHA-256. Les types invalides, une ligne éditoriale de 1 001 caractères et les métadonnées de plus de 2 Mio restent refusés. Le scénario navigateur importe 100 avertissements, vérifie les articles puis leur présence après rechargement, dans trois configurations.

Résultats finaux locaux : `npm run lint` PASS ; `npm run build` PASS ; `npm test` **374 PASS, 1 skip historique**, 40 fichiers ; `npx playwright test tests/e2e/v9-many-warnings.spec.ts` **3 PASS**, Chromium, WebKit et Chromium mobile émulé, sans retry. Le contrôle unitaire ciblé des quatre nouvelles régressions est également PASS. Les logs sont conservés dans `preuves/warnings-sans-plafond/`. La suite navigateur complète antérieure n’est pas revendiquée comme rejouée pour ce changement.

Deux premières exécutions unitaires : chacune 373 PASS, 1 échec, 1 skip historique. Le nouvel aller-retour comparait d’abord un `Buffer` Node à un `Uint8Array` IndexedDB, puis deux `Uint8Array` issus de contextes différents ; les octets étaient identiques mais la comparaison profonde des conteneurs échouait. Le test compare maintenant les listes complètes d’octets, sans supprimer le contrôle d’existence de l’original ni celui du SHA. Les résultats finaux sont consignés ci-dessous ; ces échecs de test n’étaient pas une corruption de données.

Aucun journal personnel réel importé ou modifié, aucune sauvegarde utilisateur touchée, aucune migration de schéma de base, aucun changement au lecteur ni au mode hors ligne, aucun accès aux clés API. Le travail reste sur la branche isolée existante ; l’autorisation de push sur `main` donnée dans la conversation reste applicable. Les limites antérieures, notamment SG-03 mémoire, subsistent. Une ancienne version de l’application peut encore refuser une nouvelle sauvegarde contenant plus de 30 avertissements ; utiliser cette version corrigée pour la restaurer.

## Retour arrière

Le code précédent est `72e15ad`. Sur une branche isolée, après vérification qu’aucune évolution ultérieure n’a modifié ces mêmes fichiers, restaurer uniquement `src/data/model.ts` et `src/data/unified.ts` depuis cette référence. Retirer les deux nouveaux tests `tests/warnings-count.unit.test.ts` et `tests/e2e/v9-many-warnings.spec.ts`, puis exécuter lint, build et tests avant tout commit/publication de rollback. Aucune donnée personnelle n’est à supprimer ou migrer. Une annulation réintroduit le refus des listes de plus de 30 : les journaux originaux restent intacts, mais leur import et la restauration d’archives contenant ces listes demandent de remettre le correctif. Aucun rollback réel n’a été exécuté.

## Reçu après publication

- Code publié sur `main` sans force ni merge : **`3281eb60d7e616fef9c925b1996ea65858527f8a`**. Vercel **success**. L’origine `https://sitegoat.vercel.app` répond 200 ; huit ressources JS/CSS du shell et du journal unifié correspondent exactement aux SHA-256 du build local.
- Après déploiement, le test d’import de 100 avertissements et rechargement a été rejoué sur cette origine : **3 PASS, 0 FAIL, 0 retry**, Chromium/WebKit/Chromium mobile, profils neufs sans données personnelles. Commande : `npx playwright test --config /tmp/sitegoat-warnings-production.config.ts` ; configuration limitée à `v9-many-warnings.spec.ts` dans chaque projet, sans serveurs/proxy locaux ni préférence interactive héritée. Les logs, SHA et résumé sont conservés dans les preuves.
- Applicabilité du retour arrière sur les deux fichiers runtime vérifiée sans mutation par `git diff --binary HEAD 72e15ad -- src/data/model.ts src/data/unified.ts | git apply --check` : PASS.
- [CI complète automatique du commit de code](https://github.com/adrno496/sitegoat/actions/runs/40234837287) : **en cours** lors du reçu. Les vérifications locales et production ci-dessus sont terminées ; aucun résultat final de cette CI n’est encore revendiqué.
