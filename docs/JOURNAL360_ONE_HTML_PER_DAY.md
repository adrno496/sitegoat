# Une seule édition HTML par jour — version 2.0.3

15 octobre 2026. Base : `98b966d` (2.0.2). La bibliothèque pouvait afficher plusieurs HTML d’une même date si les métadonnées V6 étaient absentes, inconnues, anciennement mises en quarantaine, ou si le record avait été conservé comme indépendant. Le choix automatique d’une ancienne version jugée complète pouvait également empêcher d’ouvrir le dernier cumul.

## Comportement livré

Une seule carte par date dans la bibliothèque et l’accueil. L’import daté met à jour sa journée automatiquement ; l’option de créer une édition indépendante n’est plus proposée pour ces fichiers. Quatre cumuls quotidiens, et davantage, sont acceptés sans limitation du nombre de versions. Un exemple 08h→12h→16h→21h montre successivement une seule carte, puis le HTML de 21h avec les quatre articles synthétiques cumulés.

Selon le choix explicite de l’utilisateur, les anciennes versions sont retirées de l’affichage courant, conservées dans l’historique avec leurs octets, UUID, notes et favoris. Aucune purge physique n’est effectuée. Les résultats HTML et articles de recherche utilisent la version courante ; les notes privées historiques restent recherchables et les favoris peuvent ouvrir explicitement leur version d’origine. La reprise depuis l’accueil suit la dernière édition de la journée. Une restauration ou synchronisation n’ajoute pas d’anciennes cartes à l’affichage courant.

Les imports existants sont regroupés à la lecture, sans réécriture de leurs originaux, UUID ou notes. Les nouveaux imports utilisent l’identité de journée déjà disponible et l’identité déterministe de contenu existante. Archiver une journée depuis son lecteur porte sur ses versions ; la corbeille/restauration de carte traite les versions affichées dans ce mode afin qu’une ancienne carte ne réapparaisse pas à leur place.

## Règles explicites

- Date éditoriale calendaire validée, sinon date explicite d’un nom `LE_JOURNAL_360_AAAA-MM-JJ_…` ou `JOURNAL360_AAAA-MM-JJ_…`. Pour les records historiques, la clé de journée existante reste utilisable en dernier recours. Ni date actuelle ni date de téléchargement inventée.
- Dernière édition : heure `EDITION_08H` / `EDITION_08H30` du nom (heure 00–23, minutes 00–59), sinon dernier créneau déclaré valide ; ensuite révision externe, date d’import conservée, hash et UUID pour départage déterministe. Un ancien fichier reçu plus tard ne rétrograde pas une édition dont l’heure est connue.
- Si aucune heure ni révision n’est disponible, la date d’import conservée départage. Le shell ne peut deviner une chronologie éditoriale absente.
- Un fichier sans date identifiable reste distinct, avec possibilité de renseigner sa date lors de l’import. Il n’est pas fusionné arbitrairement avec la journée courante.
- La complétude éditoriale reste évaluée et affichée avec ses avertissements ; elle ne force plus l’ouverture d’une ancienne version. Les schémas inconnus ne sont pas certifiés et les métadonnées de cumul invalides restent ignorées. Le classement par date ne nécessite pas la validation d’un contrat de créneaux V6.

Le lecteur ne fusionne pas lui-même les textes : il ouvre le dernier fichier cumulatif fourni. Une omission de contenu dans ce fichier ne peut pas être réparée automatiquement.

## Vérifications

| Contrôle | Résultat |
|---|---|
| lint/build/typecheck final | PASS ; [lint](evidence/daily/final-lint.log), [build](evidence/daily/final-build.log) |
| unités | PASS 159/159 ; onze nouveaux cas couvrent les quatre cumuls, imports désordonnés, dates, schémas inconnus, anciens records, quota, ZIP et synchronisation simulée PC/téléphone |
| nouveaux scénarios navigateur sur code final | PASS 12/12, y compris date manuelle/effacement, Chromium ordinateur/mobile simulé et WebKit ordinateur ; [preuve finale](evidence/daily/final-focused.log) |
| E2E complets locaux | PASS 71/71 avant les derniers ajustements de validation de date/projection d’affichage ; [sortie complète](evidence/daily/check.log) ; les scénarios ciblés sont ensuite rejoués sur le code final |
| smoke local de publication, quatre profils | PASS : quatre imports, une seule carte, historique/notes et offline ; [preuve](evidence/daily/release-local.json) |
| compatibilité du fichier V6.1 fourni, réseau externe bloqué | PASS sur quatre profils Chromium/WebKit ordinateur/mobile simulé :13 ancres,9 liens d’index,11 lancements Google simulés par profil,8 thèmes, filtres, modes sûr/interactif, original intact ; [preuve expurgée](evidence/daily/real-html.json) |
| smartphone physique / Safari iOS manuel | NON TESTÉ |

Les preuves locales check.log, release-local.json et real-html.json précèdent les derniers ajustements de validation de date et de réutilisation des clés déjà normalisées dans l’affichage. Les scénarios ciblés sont rejoués après build final ; la CI du commit publié exécute à nouveau la suite entière. Le test ciblé vérifie notamment qu’effacer puis renseigner une date ne contourne pas la validation du mode de conservation.

Les tests utilisent exclusivement des données synthétiques, sauf le contrôle local de compatibilité du fichier précédemment fourni. Celui-ci bloque le réseau externe, simule les pages Google et la copie, ne capture aucun contenu et ne journalise que des métriques et checksums. Aucun HTML privé dans Git, Vercel, les preuves ou Supabase.

`npm run check` : lint, build, unités et E2E Chromium ordinateur/mobile simulé et WebKit ordinateur. Les tests spécifiques `tests/e2e/v6-daily.spec.ts` contrôlent quatre imports successifs, lots désordonnés, doublon renommé, lendemain, recherche, reprise, offline, notes/favoris, vieux records indépendants et corbeille/restauration. Les attentes de sélection de `tests/v6.unit.test.ts` et `tests/e2e/v6.spec.ts` sont adaptées à la nouvelle règle utilisateur ; elles vérifient toujours les avertissements et l’accès à l’ancienne version fiable.

Contrôle de publication, après build et publication autorisée : `JOURNAL360_BASE_URL=https://sitegoat.vercel.app JOURNAL360_EVIDENCE_FILE=/tmp/daily-release.json node scripts/test-daily-release.mjs`. Ce contrôle compare bundle et CSP, puis teste quatre imports, une seule carte, lecture JS, historique/notes et offline sur quatre profils, dans des bibliothèques locales neuves. Aucun compte ni objet Supabase n’est créé/modifié. Peut viser localhost pour la validation préalable.

## Fichiers, compatibilité et retour arrière

Code : `src/data/day.ts`, `src/data/editorial.ts`, `src/features/import.ts`, `src/features/ImportDialog.tsx`, `src/features/DayView.tsx`, `src/features/Reader.tsx`, `src/App.tsx`. Version : `package.json`, `package-lock.json`, `src/config.ts`. Tests : `tests/helpers/daily.ts`, `tests/daily.unit.test.ts`, `tests/e2e/v6-daily.spec.ts`, adaptations des tests V6, `scripts/test-daily-release.mjs`. Documentation : README, ARCHITECTURE, ce rapport, complément de compatibilité, preuves `docs/evidence/daily/`, exception de logs dans `.gitignore`.

Aucune migration SQL Supabase, nouvelle permission RLS, modification de compte ou suppression de sauvegarde distante. Le format ZIP et la version de base IndexedDB restent identiques ; le regroupement est calculé sur les données locales et fusionnées. Mettre à jour tous les appareils vers 2.0.3 pour obtenir le même affichage.

Sandbox et CSP inchangés ; mode interactif automatique et confirmation Google inchangés. Retour arrière : redéployer `98b966ddedb7c19beb0d9d73b46cca7aa4f7e01d` ou annuler le commit 2.0.3 par un nouveau commit de revert. Aucune restauration de base ni suppression de données nécessaire ; les règles précédentes pourraient alors réafficher plusieurs cartes historiques.
