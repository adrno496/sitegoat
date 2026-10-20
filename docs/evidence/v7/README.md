# Preuves locales V7

Les fixtures sont synthétiques et les profils navigateur jetables. Aucune preuve ne provient des données personnelles du navigateur ou d’un service cloud réel.

- `environment.json` : versions de référence et source Git.
- `baseline.txt`, `baseline-browser.json`, `baseline-performance.txt` : tests de référence, avant modification produit.
- `final-static.txt`, `final-browser.txt`, `final-browser.json`, `final-performance.txt` : exécutions finales. Les sorties intermédiaires ne sont pas des validations finales.
- `validation.json` : bilan structuré final, périmètre et limites.
- `before/performance.json`, `after/performance.json`, `bundle.json`, `search-performance.json` : comparaison et indexation. Les fichiers `performance-pre-gc.json` sont les premiers relevés exploratoires sans GC, conservés pour transparence.
- `demo/` : captures et contrôles des prompts dans le build final ; presse-papiers simulé, aucun accès au presse-papiers système.
- `mutations.json`, `mutation-*.txt` : mêmes assertions sur fixture intacte, mutations jetables réellement rejetées, puis fixture intacte.
- `legacy-journal.zip`, `legacy-export.txt` : archive synthétique produite par le code de référence ; la restauration est couverte par les tests V7.
- `source-files.json`, `source.patch`, `protected-final.json` : empreintes des changements, diff binaire complet sur leur périmètre, 19 fichiers protégés identiques. Le patch n’inclut pas ces preuves ni les captures. Contrôle inverse effectué sans l’appliquer, index Git réel inchangé.
- `intermediate-*`, `*-before-fix.*`, `initial-*`, `*-failure.txt`, `demo-failure-trace.zip` : défauts rencontrés et preuves avant correction.
- `interrupted-*` : exécutions arrêtées explicitement pour corriger, jamais comptées comme PASS.

Les tests système et de production absents sont recensés dans le [rapport](../../JOURNAL360_V7_REPORT.md). Les horodatages de test sont conservés tels que fournis par l’horloge de la machine ; la date du contenu synthétique est indépendante.
