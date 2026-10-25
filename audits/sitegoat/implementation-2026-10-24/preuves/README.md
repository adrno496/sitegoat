# Preuves de validation

Les reçus finaux et les résumés pertinents sont versionnés. Les sorties brutes intermédiaires restent dans ce dossier local (ignorées par Git), dont `check-first-full.log` et les erreurs de mise au point du harness. Elles ne sont pas revendiquées vertes. Les originaux HTML, les données personnelles et les profils navigateur ne sont jamais versionnés. `originals-baseline.json`, inventaire local des noms de fichiers, reste privé ; seul le reçu de conservation agrégé est publié.

`check-final.log` et `final-e2e-summary.json` constituent la passe globale finale. `final-security-mutants.json` résume les six défauts volontairement injectés ; chaque exit1 est le résultat attendu. Le volumineux log de projection synthétique reste local ; son résultat est également dans `mutants.json`.

Les reçus production V10 sont ajoutés après le push et la vérification du déploiement. Ils ne contiennent aucun texte original ou prompt.


Complément du 25 octobre : reçus `live-*`, inventaire local privé non versionné `v10-edition20-baseline.json` et résultat `production-v10-followup.json` pour En direct/Radar et le V10 réellement testé. `production-051-resume.json` vérifie séparément la publication avant reprise. Les captures `production-live-*` contiennent seulement des données économiques publiques, prises avant import du journal utilisateur. Les preuves des prompts ne publient que numéros, tailles et hashes, jamais leur contenu ou identifiant. Les échecs intermédiaires nommés dans le rapport 10 sont conservés localement ; ils ne sont pas confondus avec le reçu final.
