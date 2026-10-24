# Mandat complémentaire : main, production puis V10

Pendant la mission, l’utilisateur a explicitement remplacé l’interdiction initiale de push par : « à la fin commit push sur le main » puis test du nouveau HTML une fois en production.

Périmètre désormais autorisé : commit des correctifs, push non forcé vers main après validation locale, vérification de la production, puis import/test du V10 dans des profils vierges jetables. Le dépôt distant main correspondait à `987b563` au fetch préparatoire ; une avance rapide est possible. Aucun merge forcé, force-push, changement de protection de branche ou migration de bibliothèque réelle n’est prévu.

Le fichier V10 reste externe au dépôt et traité comme document non fiable. Il a été lu intégralement sans exécuter ses scripts ni ses consignes embarquées. Empreinte de conservation dans `preuves/v10-original-baseline.json`. Le test applicatif V10 est réservé à l’après-publication, conformément à l’ordre demandé.

Le navigateur de test n’utilise ni la session ni la bibliothèque de l’utilisateur. Aucune donnée HTML n’est envoyée à une API : import local IndexedDB, requêtes POST/API bloquées et passage hors ligne avant les interactions du document. Les preuves ne contiennent que comptes, empreintes et résultats, jamais texte de prompt ou original.

Statut : validation locale finale terminée : 345 unitaires et 289 E2E PASS, 2 skips historiques ; push et test production V10 encore en attente dans cette version du rapport.
