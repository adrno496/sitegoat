# Preuves Le Futur

[validation.json](validation.json) est l’index final des vérifications locales. Les fichiers final-release-* concernent la source finale, batch-final-future-e2e.log les 18 parcours après ajustement des lots, final-e2e.log la suite complète précédente (154 réussis, 1 ignoré). Le dernier ajustement des dates ISO est couvert par les tests unitaires finaux.

Les autres fichiers *checks.json, checks.json et development-final-validation.json sont des étapes historiques : ils peuvent contenir des échecs ou interruptions traités ensuite. Ils ne sont pas des résultats de livraison. La baseline et le test de mutation gardent la trace des échecs attendus. Les limites des mesures synthétiques sont détaillées dans [le rapport](../../FUTURE_TEST_REPORT.md).

Aucun de ces fichiers ne certifie une CI distante ou une mesure sur smartphone physique.
