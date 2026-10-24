# Preuves de validation

Les reçus finaux et les résumés pertinents sont versionnés. Les sorties brutes intermédiaires restent dans ce dossier local (ignorées par Git), dont `check-first-full.log` et les erreurs de mise au point du harness. Elles ne sont pas revendiquées vertes. Les originaux HTML, les données personnelles et les profils navigateur ne sont jamais versionnés. `originals-baseline.json`, inventaire local des noms de fichiers, reste privé ; seul le reçu de conservation agrégé est publié.

`check-final.log` et `final-e2e-summary.json` constituent la passe globale finale. `final-security-mutants.json` résume les six défauts volontairement injectés ; chaque exit1 est le résultat attendu. Le volumineux log de projection synthétique reste local ; son résultat est également dans `mutants.json`.

Les reçus production V10 sont ajoutés après le push et la vérification du déploiement. Ils ne contiennent aucun texte original ou prompt.
