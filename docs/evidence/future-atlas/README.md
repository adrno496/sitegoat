# Preuves de la refonte de l’atlas

La référence immuable est 5e61d02. [baseline-summary.json](baseline-summary.json) et baseline.log décrivent les contrôles avant changement.

Le résultat de livraison est dans validation.json, validated-full.log et all-future-final.log. Les autres logs sont des étapes de développement, parfois en échec ou interrompues volontairement : ils ne constituent pas une suite finale réussie. Le rapport décrit les corrections et limites. Les traces en erreur ne sont pas supprimées pour obtenir un résultat vert.

- source.patch : diff intégral sans commit ; source-files.json : empreintes des sources vérifiées.
- protected-files.json : 16 fichiers de contrat, stockage, import et navigation inchangés.
- before / after : captures et mesures synthétiques, sans données utilisateur.
- browser-comparison.json et bundle-sizes.json : résultats bruts avant/après.
- baseline-synthetic.zip : archive issue du code de référence, exclusivement synthétique ; restauration et égalité du JSON dans baseline-archive-compatibility.json.
- mutations-*.json et accessibility-*.txt : injections négatives restaurées et arbres d’accessibilité, sans certification globale.
- stable-tabs : comparaison PNG stricte (4 mobiles identiques, 3 pixels d’écart sur chacun des 4 titres desktop) et géométrie/styles identiques sur les 8 vues. Ce résultat est documenté comme PARTIAL, pas comme identité parfaite.

[Rapport de mission](../../FUTURE_ATLAS_REPORT.md). Aucune donnée de profil réel, aucun secret et aucun déploiement ne sont inclus.
