# Décision A + C, registre B désactivé

A — Import manuel de snapshots HTML autonomes : implémentation locale, contrat V7 inchangé. Le dernier fichier fournit directement ses articles et annexes. Aucune dépendance sur une exécution antérieure du producteur.

C — Réconciliation de consultation : les versions déjà reçues sont des témoins locaux, jamais un registre universel. Conserver événements/annexes antérieurs avec leur original et provenance ; indiquer les omissions dans le snapshot plus récent. Aucune réécriture de l'HTML, reconstruction automatique ou déplacement vers la base Future. Correction avec même ID conserve les révisions ; conflits visibles, choix courant technique et non arbitrage factuel.

B — Registre producteur persistant : NON CONNECTÉ. Proposition : manifest quotidien privé append-only, révision/empreinte/source/horodatage et liste d'événements ; écriture conditionnelle par ETag avec clé d'idempotence, conflits conservés, journal d'audit et export hors ligne. Compte de service à droits minimaux côté serveur, jamais clé dans frontend ni notes privées envoyées. Authentification, hébergement, coûts/rétention, concurrence, échec réseau, restauration et permissions doivent être choisis puis testés séparément. Aucune automatisation ChatGPT ou infrastructure distante n'est modifiée ici. Sans registre indépendant établi, couverture factuelle UNKNOWN même si toute la chaîne d'imports est présente.

L'ancien script check-secrets lit .env.local : ne pas l'exécuter sur le profil réel sans autorisation. Le contrôle sera exécuté dans une copie ne contenant que les fichiers de code suivis et le bundle, sans fichiers d'environnement, ou remplacé par une analyse de ces seuls artefacts. Aucune valeur sensible n'est affichée.
