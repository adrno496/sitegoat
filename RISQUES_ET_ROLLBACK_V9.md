# Risques et retour arrière V9

## Point initial et sauvegarde

État initial propre : 8714baa2affbe54140cf903a62305e819503ab8b, branche codex/preserve-original-edition-html. Archive indépendante : `/Users/dreano/Downloads/sitegoat-v9-rollback-20261022/sitegoat-before-v9.tar.gz`. SHA-256 : `422c582cd0003c570103db893cf3539542152bedcfa7dc5d05567ea1d937db67`. L’archive exclut .git, node_modules, dist, résultats temporaires et .env*. Les secrets restent sur place et ne font pas partie du livrable. Aucun profil personnel IndexedDB/cloud n’a été ouvert ni purgé pour les tests.

Vérifier puis extraire dans un nouveau dossier, sans écraser le travail courant :

```sh
shasum -a 256 /Users/dreano/Downloads/sitegoat-v9-rollback-20261022/sitegoat-before-v9.tar.gz
mkdir -p /Users/dreano/Downloads/sitegoat-restauration-v9
tar -xzf /Users/dreano/Downloads/sitegoat-v9-rollback-20261022/sitegoat-before-v9.tar.gz -C /Users/dreano/Downloads/sitegoat-restauration-v9
```

Réinstaller les dépendances avec npm ci puis exécuter lint, build et tests dans cette copie. Réutiliser uniquement les paramètres d’environnement déjà autorisés et nécessaires. Ne jamais copier les secrets dans Git ou dans un rapport.

## Retour arrière du code publié

La demande initiale interdisait commit/push/déploiement ; l’utilisateur les a explicitement autorisés ensuite pour main/production, à la fin. Aucun accès aux données privées de production n’est requis pour publier les fichiers applicatifs. La référence du commit publié et les vérifications de production sont consignées dans RAPPORT_TESTS_V9.md et le compte rendu final.

Pour un rollback ultérieur autorisé : préparer un commit `git revert` du commit V9 sur main, exécuter les contrôles, puis pousser le revert afin de déclencher Vercel. Ne jamais reset --hard, clean, force-push ou réécrire la base. Une restauration manuelle du code initial se fait dans un dossier séparé. Aucun rollback de production n’est exécuté dans cette mission.

## Données et compatibilité

Aucune migration des magasins IndexedDB (journal v4/Future v1), aucun SQL, aucun secret ou réglage cloud modifié. `Edition.quickBriefs` est un champ optionnel local, distinct de `unifiedData` V7 strict. Les octets originaux, identités SHA-256, articles, notes, favoris et anciennes journées sont conservés. La récupération des compagnons anciens est additive après contrôle de l’original ; une erreur ne remplace pas les données.

ZIP3 inclut le champ optionnel et le HTML. V9 réextrait le compagnon de l’original contrôlé à la restauration et refuse une divergence du manifeste. Un ancien client peut ignorer ce champ de manifeste ; les octets du compagnon restent dans le HTML, donc récupérables par V9. Ne pas promettre la vue brèves sur l’ancien client. Les sauvegardes Future et les préférences d’affichage restent séparées ; aucun export atomique interbases n’est ajouté.

Avant un retour arrière sur votre bibliothèque personnelle, exporter les ZIP Journal et Future depuis l’interface autorisée. Cette mission ne les exporte pas. Revenir au code initial ne nécessite ni purge ni reconversion du V7 ; les brèves redeviennent consultables dans l’original et sont réindexables ensuite. Ne pas restaurer une archive au prix de la suppression des originaux récents.

## Sécurité et limites

- Rendu du HTML importé dans une iframe opaque : sandbox vide en mode sûr V7, `allow-scripts` seul après consentement. Jamais allow-same-origin, allow-popups, allow-downloads ou navigation du parent. Aucun document injecté via dangerouslySetInnerHTML dans React.
- Copie de rendu durcie : CSP connect-src none, ressources distantes/objets/iframes bloqués, formulaires neutralisés, ancres locales conservées. CSS et contenu original conservés dans la limite de ces protections ; les octets stockés/exportés restent exacts.
- Sources, recherches et prompts natifs sont transmis comme demandes au parent : source du message égale au cadre courant, origine null, empreinte et révision courantes, forme stricte et liste blanche. Une demande ne lance pas de téléchargement ni d’ouverture externe avant le clic dans la confirmation parent. Les prompts sont pris dans le V7 validé et leur hash revérifié.
- Le mode interactif n’est pas un analyseur de code malveillant. Un script importé peut naviguer son propre cadre ; le sandbox n’est pas une garantie universelle d’absence de réseau par navigation. Les sources inconnues restent en mode sûr ou export HTML. Aucun nouveau droit n’est accordé au cadre.
- Google utilise les questions explicitement publiques et les contrôles de marqueurs sensibles existants ; aucune lecture des notes, sessions ou prompts pour composer une requête. Sans question sûre : entrée Google vierge. La détection de marqueurs n’est pas une preuve générale d’absence de secrets dans un texte arbitraire ; la source de vérité reste la séparation producteur public/privé.
- Une série officielle avec vérification déclarée n’est pas revérifiée en ligne par le lecteur. Les graphiques ne prétendent pas certifier la véracité des valeurs. Séries homogènes séparées par méthode/unité/fréquence ; points manquants jamais inventés.
- NON TESTÉ : lecteur d’écran humain, smartphone physique, profil utilisateur réel, synchronisation cloud privée ou production avec des données personnelles. Les parcours locaux utilisent des profils jetables et des réseaux externes bloqués. Aucun collecteur ou registre durable n’est simulé.

## Correction 2.1.1

Pour annuler seulement la suppression du plafond et le bouton « Tout afficher », préparer un `git revert` du commit de correction indiqué dans le compte rendu final, tester puis publier ce revert. Cela revient au comportement 2.1.0. Pour annuler également la refonte V9, annuler ensuite le commit `2f974253f1a978ffd432d010bffa9d9675f26dfb`. Aucun de ces retours ne demande de migration ni de purge des originaux.
