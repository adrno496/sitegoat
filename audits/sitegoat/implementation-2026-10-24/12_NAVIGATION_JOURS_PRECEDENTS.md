# Aujourd’hui — navigation entre les jours importés

Complément demandé le 25 octobre 2026, réalisé sur la branche isolée existante. L’autorisation de push sur `main` et de publication donnée dans la conversation reste applicable.

## Comportement

Sous la date de la vue Aujourd’hui, une ligne permet de choisir **Jour précédent**, **Jour suivant** ou directement le **Jour consulté**. Un bouton permet de revenir à la dernière édition. La liste contient une entrée par journée de journal active déjà importée, de la plus récente à la plus ancienne ; les jours absents sont sautés. La version affichée pour chaque journée est son dernier créneau/révision disponible, indépendamment de l’ordre d’import. Collections séparées, archives et corbeille sont exclues de cette navigation.

Les boutons sont désactivés aux bornes ; aucune navigation vide n’est proposée sans journal daté. Les filtres de texte, thème et première apparition sont réinitialisés au changement de jour afin de ne pas masquer le journal choisi. L’ordre de tri et l’onglet courant sont conservés. Le bouton de lecture ouvre **cette édition**, avec son original intact. Revenir de ce lecteur conserve le jour choisi. Recharger l’application ou quitter puis rouvrir Aujourd’hui revient à la dernière édition : le choix de date est un état de consultation, sans nouvelle préférence persistante.

Pour une journée précédente, les articles, le radar économique, les prompts et les éléments importés de Chronologie IA/Le Futur sont limités aux éditions de cette journée. Les liens Recherche globale, Tous les articles et Atlas conservent leur portée globale ; le catalogue personnel Le Futur reste distinct. L’avertissement « aucune édition reçue aujourd’hui » ne remplace pas la date d’une journée volontairement consultée dans le passé. Le repère orange reste exclusivement attaché à la dernière édition globale, sans transformer les anciennes nouvelles en nouveautés.

## Vérification et conservation

Les tests utilisent uniquement des documents synthétiques dans des profils neufs. Le nouveau parcours couvre trois journées, dont un jour manquant et deux créneaux d’une même journée importés dans un ordre différent ; il contrôle les bornes, la sélection directe, la remise à zéro des filtres, le radar correspondant au jour, les repères orange, le retour à la dernière édition et la lecture du bon original. Le service worker est attendu, le réseau est coupé, puis l’original et la navigation sont vérifiés hors ligne après rechargement. Une bibliothèque vide et une seule journée sont également couvertes. Axe et l’absence de débordement horizontal sont contrôlés.

Une première exécution a donné 21 PASS et 3 échecs sur le nom exact du sélecteur : le texte du label enveloppant comprenait aussi les options. Un nom accessible explicite `Jour consulté` a été ajouté au contrôle, sans affaiblir l’assertion ; le parcours Chromium ciblé passe ensuite (2 tests). Les sorties initiales et finales sont conservées dans `preuves/navigation-jours/`.

Aucun schéma ni format de sauvegarde modifié, aucune migration ou écriture dans une bibliothèque personnelle réelle. Aucun original HTML ni fichier personnel modifié, aucune nouvelle lecture/copie de clé API. Le fonctionnement repose sur les données locales et reste disponible hors ligne. Les limites déjà documentées, notamment SG-03 mémoire, ne sont pas résolues par ce complément. Les journaux non unifiés restent ouvrables par leur bouton de lecture ; cette modification ne reconstruit pas leur contenu en cartes unifiées.

Résultats locaux achevés : `npm run lint` et `npm run build` PASS ; `npm test` **370 PASS, 1 skip historique**, 39 fichiers ; `npx playwright test tests/e2e/v9-day-navigation.spec.ts tests/e2e/v9-orange-edition.spec.ts tests/e2e/v9-workspace.spec.ts` **24 PASS**, Chromium/WebKit/Chromium mobile, sans retry. Les six cas de navigation ont ensuite été rejoués pour une capture limitée à la fenêtre visible : **6 PASS**. La capture mobile synthétique a été inspectée visuellement. Il ne s’agit pas de 30 scénarios différents.

Le commit publié et la vérification de production sont consignés dans le reçu ci-dessous. Le fichier réel Édition 20 CORRIGE_DATES_V2 manquant lors du complément 11 n’a pas été remplacé par un autre journal personnel : ce contrôle utilise des fixtures synthétiques. La CI complète du code orange précédent `a84bc6a` est désormais verte ; elle ne vaut pas nouvelle exécution complète pour ce complément.

## Retour arrière

Le runtime de ce complément est `ba245726edc96c936ceebaf2682d699acb0be852` ; la référence précédente est `cd98589`. Un revert intégral peut nécessiter une résolution sur les preuves et le nouveau test, modifiés dans le reçu. Pour annuler uniquement cette fonctionnalité en conservant les rapports, sur une branche isolée :

```sh
git restore --source=cd98589 -- src/features/unified/UnifiedWorkspace.tsx src/features/unified/selectors.ts src/features/unified/unified.css
git rm tests/e2e/v9-day-navigation.spec.ts
npm run lint
npm run build
npm test
npx playwright test tests/e2e/v9-orange-edition.spec.ts tests/e2e/v9-workspace.spec.ts
```

Examiner le diff et vérifier manuellement que les commandes de date ont disparu et que la dernière édition s’ouvre toujours, puis commiter et publier l’annulation selon l’autorisation applicable. Cette procédure est destinée à l’état de ce complément ; comparer d’abord les trois fichiers si des évolutions ultérieures les ont modifiés. L’applicabilité du diff inverse des trois fichiers runtime a été contrôlée par `git diff --binary HEAD cd98589 -- <les trois chemins ci-dessus> | git apply --check` : PASS. La restauration et la suppression du nouveau test n’ont pas été exécutées. Aucun journal ni donnée personnelle ne sont visés ; aucune restauration de données n’est nécessaire. Ne pas appliquer directement les anciens patchs de rollback préparés pour d’autres commits.

## Reçu de publication

- Commit de fonctionnalité **`ba245726edc96c936ceebaf2682d699acb0be852`**, poussé sans force ni merge sur `main`. Vercel **success** ; `https://sitegoat.vercel.app` répond 200. Les cinq ressources JS/CSS référencées dans le shell et les trois ressources différées `unified`/`UnifiedWorkspace` correspondent aux huit SHA-256 du build local.
- `npx playwright test --config /tmp/sitegoat-days-production.config.ts` : **6 PASS, 0 FAIL, 0 retry**, Chromium/WebKit/Chromium mobile, profils neufs, fixtures synthétiques. Le fichier de configuration remplace `testMatch` dans chacun des projets, désactive serveurs/proxy locaux et utilise l’origine publique sans préférence interactive historique. Le test ouvre l’ancien original et recharge effectivement l’application avec le contexte hors ligne.
- Première tentative en profil neuf : deux tests bloqués 45 secondes au retour du lecteur, deux cas simples PASS, un interrompu et un non exécuté (log conservé). Le bon original était affiché, mais la confirmation « Activer les interactions ? » interceptait le clic retour. Le test choisit désormais explicitement **Rester en mode sécurisé**, vérifie la sandbox vide, puis poursuit le retour. Aucun changement de runtime ni contournement de la confirmation. Cette adaptation du test passe également localement dans les trois configurations : **6 PASS** ; lint final PASS. Les 24 tests ciblés précédents restent la preuve des autres parcours.
- [CI complète du commit de fonctionnalité](https://github.com/adrno496/sitegoat/actions/runs/40178456916) déclenchée automatiquement ; son état était encore **en cours** lors de la rédaction du reçu. Aucun résultat final de cette exécution n’est revendiqué ici.
