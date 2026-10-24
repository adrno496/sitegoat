# Checklist des limites et vérifications complémentaires

- [ ] Lire le rapport final et ses limites ; ne pas assimiler tests simulés et données réelles.
- [ ] Exporter les trois espaces de la bibliothèque réelle, conserver les anciens ZIP et tous les segments hors navigateur.
- [ ] Restaurer ces copies sur un profil vierge distinct, comparer comptes, originaux SHA, notes, favoris, lectures, Futur, recherches et réglages.
- [ ] Vérifier la mémoire sur le téléphone réel avec le volume visé ; les 4001 petits fichiers synthétiques ne prouvent pas des gigaoctets sur mobile.
- [ ] Fermer les clients anciens sans verrou avant utilisation concurrente des recherches.
- [ ] Contrôler Android/iOS physiques, zoom natif 200 %, lecteur d’écran et installation/partage OS.
- [ ] Sur environnement cloud isolé et après mandat distinct : comptes synthétiques A/B, RLS/bucket en lecture seule, tests croisés d’accès et sync interrompue ; aucune session réelle.
- [ ] Vérifier les limites Storage/egress/rétention effectives ; le ZIP segmenté local ne change pas la limite cloud de 50 Mio.
- [ ] Vérifier code et formats de rollback sur copie ; garder tous les fichiers source.
- [x] Mandat complémentaire reçu pour le push main et le test V10 en production.
- [ ] Une migration de bibliothèque réelle ou un test cloud distant avec comptes reste une mission distincte.

Les cases ouvertes consignent les vérifications non exécutées ; elles ne constituent pas une nouvelle demande de permission. La publication autorisée est suivie dans 08_PUBLICATION_ET_TEST_V10.md ; les tests cloud et migrations de données personnelles restent exclus.
