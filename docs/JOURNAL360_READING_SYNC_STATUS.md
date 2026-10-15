# Nouveautés et état de synchronisation — 2.0.4

15 octobre 2026. Base : `d9e7e98` (2.0.3). Première étape des améliorations demandées : nouveautés depuis la précédente ouverture et visibilité de la synchronisation sur ordinateur et smartphone.

## Comportement

La carte du jour présente le nombre d’articles nouveaux et modifiés. Dans le lecteur, une section dépliable au-dessus du journal affiche leurs titres et extraits, avec badges « Nouveau » / « Mis à jour ». La comparaison est figée avant l’enregistrement de l’ouverture : elle ne disparaît pas lorsque cette écriture ou une annotation actualise la bibliothèque. Une réouverture de la même version ne représente pas ces articles comme nouveaux. La première ouverture est indiquée séparément. L’ouverture ne modifie pas le marqueur « lu ».

Le repère est l’édition la plus récente de cette même journée déjà ouverte, selon le classement éditorial existant. Consulter ultérieurement une ancienne version ne rétrograde pas le repère. Les marqueurs d’ouverture existants font déjà partie des ZIP et de la synchronisation : pas de nouvelle préférence à migrer ni d’information ajoutée aux HTML.

Seuls les `event_id` explicites et uniques des deux fichiers autorisent la comparaison. Les titres, positions et identifiants locaux générés ne sont pas utilisés comme identité d’événement. Un changement de titre, texte extrait, rubrique, sources, nature ou date est présenté comme mise à jour ; un changement d’UUID local ou de créneau ne l’est pas. Les articles absents sont signalés sans supprimer l’original historique. Sans articles indexés ou avec des identifiants manquants/dupliqués, l’application indique une nouvelle édition et explique que la comparaison est indisponible. Aucun fait n’est vérifié automatiquement.

Sur smartphone, les cartes passent sur une seule colonne pour que les titres et les nouveautés restent lisibles.

Le bandeau de synchronisation apparaît dans l’en-tête et dans la lecture pleine page. Il distingue mode local, hors-ligne, vérification, transfert, erreur/reprise, modifications en attente et succès daté. Un clic en ligne sur un compte connecté lance une synchronisation ; le bouton est désactivé pendant le transfert. Sinon il ouvre les réglages. Le mode automatique désactivé est affiché explicitement.

L’état « en attente » compare l’empreinte des données locales à celle réellement confirmée par le synchroniseur et tient compte des tâches d’envoi en file. Une modification pendant un transfert reste en attente après son succès tant qu’elle n’a pas été envoyée. La date indique le dernier succès, même hors ligne ou après un échec : elle ne prétend pas que des changements distants postérieurs ont déjà été récupérés. Le détail d’erreur reste dans les réglages et le titre du bouton. Les messages d’activité sont associés au compte pour éviter d’afficher l’erreur d’une autre session.

## Validation

Résultats finaux consignés avant publication ci-dessous. Les tests cloud de cette étape utilisent un serveur simulé ou un dépôt en mémoire ; aucun compte ni objet Supabase de production n’est modifié. Le test des erreurs/reprise désactive le service worker dans son contexte pour que l’interception réseau Playwright soit déterministe. Le test du lecteur conserve le service worker réel et vérifie le hors-ligne.

- Compilation et lint : **PASS**, `npm run build` et `npm run lint` sur le code final.
- Tests unitaires : **PASS 168/168**, dont neuf nouveaux cas. Commande locale : `npm test -- --maxWorkers=1 --testTimeout=60000`. Le format de sauvegarde et le repère de lecture sont vérifiés par restauration sur un autre dépôt local.
- Tests navigateur : **PASS 77/77** (13,5 minutes), `npm run test:e2e` : Chromium ordinateur/mobile simulé et WebKit ordinateur. Ajout de deux scénarios exécutés sur les trois profils. Vérifications de largeur 320/390/768/1280 px pour le bandeau, historique, notes, imports, exports, offline, Google et CSP conservés.
- Safari iOS physique / Android physique : NON TESTÉ.
- Google Mode IA réel : **PARTIAL**, pas de nouvelle validation d’une réponse IA ; limite CAPTCHA connue de 2.0.2 conservée. Les lancements simulés et confirmations sont validés dans la suite complète.
- Interface authentifiée Supabase réelle de cette étape : **NON TESTÉ** ; erreurs/reprise, empreinte confirmée et changement pendant transfert vérifiés avec serveur simulé et dépôt en mémoire. API et schéma de stockage inchangés.

La première exécution locale des unités a dépassé les 15 secondes sur le cas existant d’import de 2000 articles, sans échec d’assertion. Le code d’import est inchangé. Le résultat local avec budget explicite est distingué de la CI GitHub, qui conserve le budget standard de la suite. La première suite navigateur a également détecté un espace de lecture insuffisant sur petit écran ; le bandeau a été compacté et le détail placé en panneau. L’assertion existante imposant un cadre de plus de 600 px sur un écran de 844 px a ensuite passé sur toutes ses largeurs, sans être affaiblie.

[Résumé des preuves](evidence/improvements/verification.json), [lecteur mobile](evidence/improvements/reader-mobile.png), [bandeau mobile](evidence/improvements/sync-mobile.png), [lecteur 320 px](evidence/improvements/reader-320.png). Les captures sont synthétiques.

Après publication : `JOURNAL360_BASE_URL=https://sitegoat.vercel.app JOURNAL360_EVIDENCE_FILE=/tmp/j360-improvements-production.json node scripts/test-daily-release.mjs`. Le contrôle compare le bundle publié au build local et la CSP, puis vérifie les nouveautés à chaque import, le bandeau, l’historique/notes et le hors-ligne sur quatre profils Chromium/WebKit ordinateur/mobile simulé, sans compte ni écriture Supabase.

## Fichiers et limites

Code : `src/data/readingChanges.ts`, `src/features/ReadingUpdates.tsx`, `src/features/SyncIndicator.tsx`, intégration dans `src/App.tsx`, `src/features/DayView.tsx`, `src/features/Reader.tsx`, styles dans `src/styles.css`. Tests : `tests/reading-changes.unit.test.ts`, `tests/sync-indicator.unit.test.ts`, `tests/e2e/v6-improvements.spec.ts`. Contrôle de publication : `scripts/test-daily-release.mjs`. Version : `package.json`, `package-lock.json`, `src/config.ts`. Documentation : README et ce rapport.

Les originaux, historique, notes, favoris, sandbox, CSP, confirmation Google, format ZIP et schéma IndexedDB restent identiques. Aucun changement SQL/RLS ni déploiement Supabase nécessaire. La synchronisation utilise encore les ZIP complets ; les transferts différentiels et reprenables feront l’objet d’une étape distincte avec migration conçue et testée. La synchronisation nécessite toujours l’application ouverte et connectée. Les essais automatisés mobiles ne valent pas validation sur appareil physique.

Retour arrière : annuler le commit 2.0.4 par un nouveau commit de revert puis redéployer, ou réaffecter le précédent déploiement Vercel de 2.0.3. Pas de restauration de base, suppression de fichier ni réimport nécessaire. Les ouvertures enregistrées restent compatibles avec 2.0.3.
