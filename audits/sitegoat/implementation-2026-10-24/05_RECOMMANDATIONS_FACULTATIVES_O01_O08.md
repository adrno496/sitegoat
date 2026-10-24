# Huit décisions facultatives

Aucun déploiement d’option par défaut, aucun modèle ni service externe ajouté. Les gains d’ergonomie ne sont pas présentés comme des mesures de temps humain.

| ID | Option | Décision |
|---|---|---|
| O-01 | Chronologie transjournées | REPORTÉ avec test décisif |
| O-02 | Contre-preuves dans les notes | IMPLÉMENTÉ léger, action explicite |
| O-03 | Atlas annuel hors application | REPORTÉ avec test décisif |
| O-04 | Recherche sémantique locale | REPORTÉ — aucun modèle téléchargé |
| O-05 | Revue éditoriale personnelle | PROTOTYPE facultatif léger ; file dédiée reportée |
| O-06 | Allégement du démarrage | REPORTÉ après mesures |
| O-07 | Lecture HTML assainie et article Markdown | IMPLÉMENTÉ, exports explicites |
| O-08 | Documentation du dépôt de référence | IMPLÉMENTÉ |

## O-01 — Chronologie transjournées

Décision : **REPORTÉ avec test décisif**.

Problème réel / usage quotidien / prototype ou mesure : Les index/historiques conservent déjà les versions par eventId. Ni les deux journées d’exemples ni les titres/URL identiques ne prouvent une identité stable d’événement entre jours.

Alternative sans nouveau code et compatibilité : Archives/recherche/historique existants, test de deux IDs distincts même titre conservé.

Meilleure objection, risque et coût évité : Une table de liens manuels réversibles, édition de liens et cycle de sauvegarde supplémentaires.

Dépendances, estimation, CPU/RAM/stockage, hors ligne et confidentialité : M ; stockage O(liens), local et offline ; aucun réseau, risque de fusion injustifiée évité.

Test décisif pouvant confirmer ou inverser la décision : Corpus synthétique de dix journées + dix tâches de suivi : démontrer moins d’actions et aucune fusion ambiguë avant ajout.

## O-02 — Contre-preuves dans les notes

Décision : **IMPLÉMENTÉ léger, action explicite**.

Problème réel / usage quotidien / prototype ou mesure : Un modèle de cinq champs évite une seconde base et environ une centaine de caractères de structure à retaper ; le brouillon n’est pas enregistré automatiquement.

Alternative sans nouveau code et compatibilité : Notes & décisions actuelles ; tests du modèle et sauvegarde/restauration des notes existantes.

Meilleure objection, risque et coût évité : Aucun nouveau stockage/index ni moteur IA ; code et texte seulement à la demande.

Dépendances, estimation, CPU/RAM/stockage, hors ligne et confidentialité : XS ; CPU constant par clic, octets de note seulement ; offline et privé ; aucun verdict factuel inventé.

Test décisif pouvant confirmer ou inverser la décision : Essai quotidien : garder le modèle si ses cinq champs sont effectivement remplis et repris dans les notes.

## O-03 — Atlas annuel hors application

Décision : **REPORTÉ avec test décisif**.

Problème réel / usage quotidien / prototype ou mesure : La segmentation avec inventaire et originaux vérifiés permet déjà la restauration. Un atlas sûr exige index, chemins relatifs, liens vérifiés et stratégie séparée pour scripts originaux. Aucun besoin quotidien sans application n’a été établi.

Alternative sans nouveau code et compatibilité : ZIP segmentés restaurés sur base synthétique vide, originaux accessibles séparément.

Meilleure objection, risque et coût évité : Deuxième format d’index et QA de liens ; ne pas confondre original scripté et lecture assainie.

Dépendances, estimation, CPU/RAM/stockage, hors ligne et confidentialité : M/L ; temps et espace d’index/export évités ; aucun réseau, offline obligatoire.

Test décisif pouvant confirmer ou inverser la décision : Mesurer dix tâches de consultation annuelle sans application ; prototype inerte doit gagner clairement face au restore/archives, sans doubler les ressources.

## O-04 — Recherche sémantique locale

Décision : **REPORTÉ — aucun modèle téléchargé**.

Problème réel / usage quotidien / prototype ou mesure : Recherche plein texte mesurée sur 1000 articles : environ 3,2–3,7 ms par passage dans le protocole local. Aucun jeu de requêtes quotidiennes réellement échouées n’est disponible. Un gain sémantique n’est pas démontré.

Alternative sans nouveau code et compatibilité : Plein texte, accents normalisés, filtres et recherche locale conservés.

Meilleure objection, risque et coût évité : Téléchargement de modèle, index, RAM/CPU mobile, gestion de versions et confidentialité d’extraits.

Dépendances, estimation, CPU/RAM/stockage, hors ligne et confidentialité : L ; ressources modèle NON MESURÉES car absent ; aucune API IA ni exfiltration.

Test décisif pouvant confirmer ou inverser la décision : Jeu d’échecs plein texte + gain de rappel mesuré sur téléphone ; consentement explicite distinct avant téléchargement local.

## O-05 — Revue éditoriale personnelle

Décision : **PROTOTYPE facultatif léger ; file dédiée reportée**.

Problème réel / usage quotidien / prototype ou mesure : Le Futur possède déjà les états de revue de sources. Pour les journaux, un modèle de note avec case et date évite une seconde base ; il ne constitue pas une file automatique complète.

Alternative sans nouveau code et compatibilité : Notes existantes et revue de source Le Futur ; tests du modèle, restauration des notes.

Meilleure objection, risque et coût évité : File et nouveaux états transversaux non ajoutés tant que leur usage n’est pas démontré.

Dépendances, estimation, CPU/RAM/stockage, hors ligne et confidentialité : XS réalisé ; M évité ; CPU au clic, stockage de note, offline, privé, aucune certification factuelle.

Test décisif pouvant confirmer ou inverser la décision : Sur dix notes à revoir, démontrer une récupération insuffisante avec Mémoire avant d’ajouter une file ; jamais de fetch automatique.

## O-06 — Allégement du démarrage

Décision : **REPORTÉ après mesures**.

Problème réel / usage quotidien / prototype ou mesure : Trois contextes froids : baseline 175–260 ms, candidat 202–214 ms ; chaud ~99–119 ms. Concurrence de tests et faible échantillon : aucune causalité ni gain revendiqué. Le seul poids JS ne prouve pas une lenteur.

Alternative sans nouveau code et compatibilité : Pagination et précache existants, mesures startup.json et examples-and-performance.json.

Meilleure objection, risque et coût évité : Découpage JSZip/cloud et complexité d’activation offline différée non justifiés par ces observations.

Dépendances, estimation, CPU/RAM/stockage, hors ligne et confidentialité : S/M évité ; aucune dépendance/tâche de fond ajoutée ; RAM téléphone NON TESTÉE.

Test décisif pouvant confirmer ou inverser la décision : Profil sur appareil visé avec corpus représentatif, long tasks/mémoire/énergie et répétitions suffisantes ; accepter extraction seulement si gain robuste et offline intact.

## O-07 — Lecture HTML assainie et article Markdown

Décision : **IMPLÉMENTÉ, exports explicites**.

Problème réel / usage quotidien / prototype ou mesure : Actions distinctes depuis la lecture interne. Dates, sources, preuve et SHA de provenance ; résumé/plain/detail/limites/changements/actions/corrections réels. HTML échappé, CSP inerte, aucun script/iframe. Markdown verbatim avec fence adaptée.

Alternative sans nouveau code et compatibilité : Original intact et ZIP restent proposés ; test hostile contenu intégral et encodage.

Meilleure objection, risque et coût évité : Pas de bibliothèque nouvelle ni traitement en fond ; nouveaux fichiers seulement au clic.

Dépendances, estimation, CPU/RAM/stockage, hors ligne et confidentialité : S ; CPU/stockage linéaires au texte d’un article, offline, aucune donnée envoyée.

Test décisif pouvant confirmer ou inverser la décision : Contrôle local du fichier exporté : texte exact, sources autorisées, zéro script/iframe, original SHA inchangé.

## O-08 — Documentation du dépôt de référence

Décision : **IMPLÉMENTÉ**.

Problème réel / usage quotidien / prototype ou mesure : Plusieurs anciennes copies et un chemin worktree historique déplacé étaient présents. README et architecture identifient le worktree actif, le candidat local, les stockages et les procédures.

Alternative sans nouveau code et compatibilité : Documentation et rapports précédents conservés, aucune copie supprimée.

Meilleure objection, risque et coût évité : Maintenance ponctuelle de liens et consignes ; aucun changement de données.

Dépendances, estimation, CPU/RAM/stockage, hors ligne et confidentialité : XS ; zéro coût runtime, réseau ou confidentialité supplémentaire.

Test décisif pouvant confirmer ou inverser la décision : Vérifier les chemins existants et qu’un lecteur peut lancer les tests puis restaurer les trois espaces sur profil vierge.
