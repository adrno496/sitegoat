# Preuves V8 — profils jetables, données synthétiques

- `environment.json` : dépôt, référence, sauvegarde et 549 identités restaurées.
- `baseline.txt`, `baseline-browser.json`, `baseline-performance.txt` : référence V7 rejouée, non déduite des archives précédentes.
- `targeted-before-final-font.txt` : 30 parcours ciblés complémentaires avant l’ultime correction de priorité CSS ; la suite générale finale inclut ensuite l’assertion effective à 14 px.
- `old-defect-unit.txt`, `old-defect-browser.*` : les nouvelles assertions détectent l’ancien diagnostic malgré 8 articles déjà disponibles.
- `final-static.txt`, `final-browser.txt/json`, `final-performance.txt` : exécutions finales ; les sorties intermédiaires ne sont pas des PASS finaux.
- `mutations.json`, `mutation-*.txt` : 5 défauts jetables détectés avec raison attendue, fixture intacte passée avant/après. Le manifeste attendu est un témoin synthétique de test, pas un registre factuel réel.
- `initial-zoom-*`, `zoom-model-comparison.json` : débordement préexistant dans le modèle CSS 200 %, puis correction sans supprimer l’assertion.
- `initial-history-query-failure.txt` : attente incorrecte sur une recherche non unique, remplacée par un marqueur historique précis.
- `before/`, `after/`, `before-search.json`, `after-search.json`, `search-100.json`, `search-1000.json`, `bundle.json` : mesures comparatives locales, limites détaillées au rapport. GC forcé aux checkpoints du tas ; aucune mesure de pic garanti ni téléphone réel.
- `demo/t01.json` et captures : import d’un SEUL HTML 22 h dans un contexte neuf, sans données réelles ; quantités et octets téléchargés vérifiés.
- `secrets.json`, `secrets-script.txt`, `baseline-secrets-script.txt` : scanner brut exit 1 en V7 et V8 sur un témoin de test de confidentialité intentionnel et inchangé. Aucune valeur sensible publiée dans les preuves V8. Aucun nouveau motif dans les fichiers modifiés/ajoutés ni dans le bundle ; cela ne certifie pas un audit exhaustif de secrets. Tous les .env* ont été exclus de la copie de contrôle.
- `source-files.json`, `source.patch`, `protected.json`, `package.txt` : empreintes, diff sur le périmètre produit/tests/outils/guide, contrôle inverse sans application, index réel inchangé. Rapports et preuves livrés séparément pour éviter un diff récursif.
- `architecture-decision.md` : snapshots + réconciliation locale, registre producteur externe désactivé.

[Rapport](../../JOURNAL360_V8_REPORT.md) · [Guide/rollback](../../JOURNAL360_V8_IMPORT_GUIDE.md). Les horodatages des commandes sont conservés tels que fournis ; la date de contexte utilisateur est le 21 octobre 2026, Europe/Paris.
