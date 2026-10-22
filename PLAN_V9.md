# Plan local V9

Ordre : P0 audit/baseline/archive -> P1 contrats et lecteur -> P2 Aujourd’hui -> P3 Accueil -> P4 Articles/Actualité rapide -> P5 préférences/navigation -> P6 spécification producteur et validation complète.

P1 : conserver unifiedSchema strict inchangé. Valider le compagnon réellement observé quickBriefsData v1, bornes, unicité, cohérence avec date/créneau/édition et relations explicites. Champ optionnel quickBriefs sur Edition, sans modifier les magasins IndexedDB. Originaux toujours stockés avec leur SHA ; ZIP3 conserve compagnon et original, restauration réextrait le compagnon depuis les octets pour les anciennes archives/clients. Index calculé local par date+eventId, historique des variantes, omissions conservées. Promotions reliées explicitement à un article, pas de double comptage. Actions du cadre par liste blanche sources/questions/prompts ; confirmation parent et vérification source/origine/cadre courant ; aucune permission sandbox supplémentaire. Tester isolation, demandes falsifiées, original et Markdown exacts.

P2 : bouton de lecture unique en tête, aperçu par article, sections accessibles et filtres ; diagnostics déplacés vers Avancé dans Paramètres. Conserver toutes les vues anciennes via menu complémentaire et retours lecteur.

P3 : Accueil distinct, points essentiels réellement importés, heure d’import distincte des dates de faits, changements/corrections et signaux conditionnels sourcés. Historique économique : points officiels vérifiés, identités provider+series+definition+unit+frequency+zone, ordre calendaire validé, valeurs absentes non interpolées, révisions/ruptures explicites ; état vide si insuffisant. Pas de courbe IA/énergie/cyber sans contrat/séries comparables.

P4 : brèves compactes, compteur réel, thèmes exacts du fichier, recherche locale, pagination progressive, sources et Google public contrôlé. Pas de génération de titres pour atteindre 20–60. Articles : filtres combinables et tris, regroupement thèmes/date/chronologie, détail interne et Google explicite. La requête provient uniquement d’un champ déclaré public et passe les contrôles de données sensibles ; aucun enrichissement depuis notes/prompts/chemins ou titre privé. Sans question publique, recherche Google vierge.

P5 : quatre entrées principales Accueil/Aujourd’hui/Articles/Paramètres, menu complémentaire accessible, compatibilité états historiques. Préférences locales V9 distinctes, sections, densité, cartes, graphiques, détails, favoris catégories, animations et actions secondaires ; repli mémoire en cas d’échec. Contrôler 360/768/1440, clavier, focus et axe.

P6 : producteur externe non disponible -> spécification contractuelle et schéma exporté, registre durable et collecte explicitement NON IMPLÉMENTÉS. Ne pas inventer d’automatisation ou prétendre une collecte de sources. Tests locaux uniquement. Livrables finaux : rapport réel avec logs, guide, limites, liste exacte et rollback. Aucun commit, push, déploiement, migration distante ou modification de secrets.

Critères : anciens V7 valides acceptés/invalides refusés, autonomie snapshot tardif, idempotence et hors ordre, conservation des originaux ; 19 brèves réellement fournies importables ; aucun diagnostic visible normalement dans Aujourd’hui ; graphiques sans valeurs inventées ; aucun accès parent/storage ; tests exécutés et échecs expliqués sans faux PASS.

Mise à jour d’autorisation pendant la mission : l’utilisateur demande explicitement « commit push sur main production a la fin ». Après tests, créer le commit local puis pousser en avance rapide vers origin/main et vérifier la publication Vercel. Le main local est utilisé par un autre worktree : ne pas le forcer ni modifier ce worktree ; le push HEAD:main publie la version validée sans toucher à ses fichiers.
