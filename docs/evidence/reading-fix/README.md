# Preuves de la correction de lecture

Rapport : [JOURNAL360_READING_FIX.md](../../JOURNAL360_READING_FIX.md).

Commandes depuis la racine du projet :

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run test:e2e
SITEGOAT_AUDIT_REAL_DIR=/Users/dreano/Downloads npm test -- --run tests/unified-reading.unit.test.ts
SITEGOAT_AUDIT_REAL_DIR=/Users/dreano/Downloads npx playwright test tests/e2e/v8-reading.spec.ts
```

Les deux dernières commandes nécessitent les fichiers 08/10/16 h identifiés dans `input-files.json`. Sans variable d'environnement, les nouveaux tests utilisent des fixtures synthétiques isolées. Exécuter les suites navigateur séquentiellement : elles utilisent les mêmes ports de serveur de test.

`baseline-unit.txt` est le résultat des nouveaux tests sur une copie figée du code de référence, avant correction : cinq échecs attendus détectent le défaut, un test statique passe. Les captures présentes ici utilisent uniquement des fixtures synthétiques. Les tests avec les vrais documents lisent les fichiers fournis sans les modifier et sans utiliser le profil personnel du navigateur.

Les journaux et empreintes sont des preuves locales de test, pas une certification de la couverture factuelle du journal ni un test des données personnelles de production.
