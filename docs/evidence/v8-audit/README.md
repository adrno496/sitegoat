# Preuves — correction ciblée V8

Référence Git : `1845fc63181d355d3c2f8fca701e5b487edc6746`. Base vierge et navigateurs isolés, cloud désactivé. Les deux fichiers réels fournis sont testés sur sélection explicite ; ils ne sont pas copiés dans le dépôt. Les captures candidat sont synthétiques.

- `baseline-reproduction.json` (capture réelle conservée localement dans `/tmp/sitegoat-audit-baseline-today.png`, non publiée) : six cartes au lieu de huit, véritable fichier 08 h ouvert, retour Aujourd’hui perdu.
- `baseline-{unit,browser,build}` : sorties avant correction ; 294 tests unitaires et 214 navigateurs passés, un skip conditionnel historique.
- `actions-reference.json`, `actions.json` : inventaire AST avant/après, sans mesure d’usage.
- `real-browser.json`, `real-browser.txt` : six parcours avec les vrais fichiers (deux scénarios × trois profils), dont import 10 h seul hors ligne et téléchargement exact des trois prompts.
- `capacity.json`, `capacity-browser.json` : 500 articles par snapshot, bibliothèque totale 500 puis 2 000 sur quatre dates ; API mémoire Chromium quantifiée, non disponible WebKit.
- `regression-targets.json` : 24 parcours relancés après correction des premiers échecs.
- `initial-*.txt`, `intermediate-capacity-failures.txt` : échecs intermédiaires conservés, pas des verdicts finaux.
- `after-*.png`, `candidate-capture.json` : aperçus locaux clair/noir/mobile, huit cartes, zéro erreur de page.
- `source-files.json`, `protected.json` : empreintes des sources de correction et des 28 fichiers de données/import/sauvegarde/sécurité conservés.
- `secrets.json` : FAIL brut préexistant du témoin synthétique, revue PARTIAL sans nouveau motif ; aucun `.env*` inclus dans la copie scannée.
- `bundle.json` : comparaison avec la référence ; aucun seuil nouveau déclaré après coup.

La validation finale sera consignée dans `validation.json` et les sorties finales après achèvement effectif des commandes. Les JSON Playwright enregistrent durées, résultats et pièces jointes ; ils ne constituent pas des essais sur téléphone physique ni sur un compte de production.
